const {
  KEY_PREFIXES,
  nowISO,
  createId,
  listAll,
  getByKey,
  setRecord,
  deleteRecord,
  filterByPrefix
} = require('./db')
const { hashPassword, verifyPassword } = require('./auth')

const PAGE_SIZE = 30
const ITEM_TYPES = ['story', 'ask', 'show', 'job', 'comment']

function createError (message, status = 400) {
  let error = new Error(message)
  error.status = status
  return error
}

function domainFromUrl (url) {
  if (!url) return ''
  try {
    let parsed = new URL(url)
    return parsed.hostname.replace('www.', '')
  } catch (error) {
    return ''
  }
}

function rankScore (item) {
  let points = item.score || 0
  let createdAt = new Date(item.createdAt).getTime()
  let ageHours = Math.max(0, (Date.now() - createdAt) / 3600000)
  return (points - 1) / Math.pow(ageHours + 2, 1.8)
}

function sanitizeUser (user) {
  if (!user) return null
  return {
    username: user.username,
    createdAt: user.createdAt,
    karma: user.karma || 0,
    about: user.about || ''
  }
}

function parseItemId (record) {
  if (!record) return null
  if (record.itemId) return record.itemId
  if (record.id) return record.id
  if (!record.key) return null
  if (record.key.startsWith(KEY_PREFIXES.item)) {
    return record.key.slice(KEY_PREFIXES.item.length)
  }
  let parts = record.key.split('#')
  if (parts.length > 1) return parts[parts.length - 1]
  parts = record.key.split(':')
  if (parts.length > 1) return parts[parts.length - 1]
  return record.key
}

function ensureItemId (record) {
  if (!record) return null
  return record.id || parseItemId(record)
}

function getUserState (records, username) {
  let state = {
    votes: new Set(),
    favorites: new Set(),
    hidden: new Set(),
    flags: new Set()
  }
  if (!username) return state

  filterByPrefix(records, `${KEY_PREFIXES.vote}${username}:`)
    .forEach(record => state.votes.add(parseItemId(record)))
  filterByPrefix(records, `${KEY_PREFIXES.favorite}${username}:`)
    .forEach(record => state.favorites.add(parseItemId(record)))
  filterByPrefix(records, `${KEY_PREFIXES.hide}${username}:`)
    .forEach(record => state.hidden.add(parseItemId(record)))
  filterByPrefix(records, `${KEY_PREFIXES.flag}${username}:`)
    .forEach(record => state.flags.add(parseItemId(record)))

  return state
}

function serializeItem (item, state, viewer) {
  if (!item) return null
  let id = ensureItemId(item)
  let isOwner = viewer && viewer === item.by
  return {
    id,
    type: item.type,
    title: item.title,
    url: item.url || '',
    text: item.text || '',
    by: item.by,
    createdAt: item.createdAt,
    score: item.score || 0,
    descendants: item.descendants || 0,
    parentId: item.parentId || null,
    rootId: item.rootId || null,
    deleted: Boolean(item.deleted),
    editedAt: item.editedAt || null,
    domain: domainFromUrl(item.url),
    voted: state.votes.has(id),
    favorite: state.favorites.has(id),
    hidden: state.hidden.has(id),
    flagged: state.flags.has(id),
    canEdit: Boolean(isOwner)
  }
}

function buildCommentTree (comments, state, viewer) {
  let map = new Map()
  comments.forEach(comment => {
    let serialized = serializeItem(comment, state, viewer)
    serialized.children = []
    map.set(serialized.id, serialized)
  })

  let roots = []
  map.forEach(comment => {
    if (comment.parentId && map.has(comment.parentId)) {
      map.get(comment.parentId).children.push(comment)
    } else {
      roots.push(comment)
    }
  })

  let sortByDate = (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  let sortTree = nodes => {
    nodes.sort(sortByDate)
    nodes.forEach(node => sortTree(node.children))
  }
  sortTree(roots)

  return roots
}

async function registerUser ({ username, password, about }) {
  if (!username || username.length < 2 || username.length > 15) {
    throw createError('Username must be 2-15 characters.')
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    throw createError('Username may only contain letters, numbers, _ and -.')
  }
  if (!password || password.length < 6) {
    throw createError('Password must be at least 6 characters.')
  }

  let existing = await getByKey(`${KEY_PREFIXES.user}${username}`)
  if (existing) {
    throw createError('Username already exists.')
  }

  let user = {
    key: `${KEY_PREFIXES.user}${username}`,
    username,
    passwordHash: hashPassword(password),
    createdAt: nowISO(),
    karma: 1,
    about: about || ''
  }
  await setRecord(user)
  return sanitizeUser(user)
}

async function authenticateUser ({ username, password }) {
  let user = await getByKey(`${KEY_PREFIXES.user}${username}`)
  if (!user) {
    throw createError('Invalid username or password.', 401)
  }
  if (!verifyPassword(password, user.passwordHash)) {
    throw createError('Invalid username or password.', 401)
  }
  return sanitizeUser(user)
}

async function getUserProfile (username, viewer) {
  let records = await listAll()
  let user = records.find(record => record.key === `${KEY_PREFIXES.user}${username}`)
  if (!user) {
    throw createError('User not found.', 404)
  }
  let state = getUserState(records, viewer)
  let submissions = records
    .filter(record => ITEM_TYPES.includes(record.type))
    .filter(record => record.by === username && record.type !== 'comment')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(record => serializeItem(record, state, viewer))

  let comments = records
    .filter(record => ITEM_TYPES.includes(record.type))
    .filter(record => record.by === username && record.type === 'comment')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(record => serializeItem(record, state, viewer))

  return {
    user: sanitizeUser(user),
    submissions,
    comments
  }
}

async function getUserThreads (username, viewer) {
  let records = await listAll()
  let user = records.find(record => record.key === `${KEY_PREFIXES.user}${username}`)
  if (!user) {
    throw createError('User not found.', 404)
  }

  let state = getUserState(records, viewer)
  let items = records.filter(record => ITEM_TYPES.includes(record.type))
  let comments = items
    .filter(record => record.by === username && record.type === 'comment')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(record => {
      let serialized = serializeItem(record, state, viewer)
      if (serialized.rootId) {
        let root = items.find(item => ensureItemId(item) === serialized.rootId)
        if (root) {
          serialized.rootTitle = root.title
        }
      }
      return serialized
    })

  return {
    user: sanitizeUser(user),
    comments
  }
}

async function getUserFavorites (username, viewer) {
  let records = await listAll()
  let state = getUserState(records, viewer)
  let favorites = filterByPrefix(records, `${KEY_PREFIXES.favorite}${username}:`)
  let items = records.filter(record => ITEM_TYPES.includes(record.type))
  let favoritesList = favorites.map(record => {
    let itemId = parseItemId(record)
    let item = items.find(entry => ensureItemId(entry) === itemId)
    return serializeItem(item, state, viewer)
  }).filter(Boolean)

  return {
    items: favoritesList
  }
}

async function getUserHidden (username, viewer) {
  let records = await listAll()
  let state = getUserState(records, viewer)
  let hidden = filterByPrefix(records, `${KEY_PREFIXES.hide}${username}:`)
  let items = records.filter(record => record.key && record.key.startsWith(KEY_PREFIXES.item))
  let hiddenList = hidden.map(record => {
    let itemId = parseItemId(record)
    let item = items.find(entry => ensureItemId(entry) === itemId)
    return serializeItem(item, state, viewer)
  }).filter(Boolean)

  return {
    items: hiddenList
  }
}

async function listItems ({ sort = 'top', type, page = 1, username }) {
  let records = await listAll()
  let state = getUserState(records, username)
  let items = records
    .filter(record => ITEM_TYPES.includes(record.type))
    .filter(record => record.type !== 'comment')

  if (type) {
    items = items.filter(record => record.type === type)
  }

  if (username && state.hidden.size) {
    items = items.filter(record => !state.hidden.has(ensureItemId(record)))
  }

  if (sort === 'new') {
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  } else {
    items.sort((a, b) => rankScore(b) - rankScore(a))
  }

  let start = (page - 1) * PAGE_SIZE
  let paged = items.slice(start, start + PAGE_SIZE)
  let hasMore = items.length > start + PAGE_SIZE

  return {
    items: paged.map(record => serializeItem(record, state, username)),
    page,
    hasMore
  }
}

async function listComments ({ page = 1, username }) {
  let records = await listAll()
  let state = getUserState(records, username)
  let items = records.filter(record => ITEM_TYPES.includes(record.type) && record.type !== 'comment')
  let comments = records
    .filter(record => record.type === 'comment')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  let start = (page - 1) * PAGE_SIZE
  let paged = comments.slice(start, start + PAGE_SIZE)
  let hasMore = comments.length > start + PAGE_SIZE

  let serialized = paged.map(record => {
    let comment = serializeItem(record, state, username)
    let root = items.find(item => ensureItemId(item) === comment.rootId)
    if (root) {
      comment.rootTitle = root.title
      comment.rootBy = root.by
    }
    return comment
  })

  return {
    comments: serialized,
    page,
    hasMore
  }
}

async function getItemDetail ({ id, username }) {
  let records = await listAll()
  let state = getUserState(records, username)
  let item = await getByKey(`${KEY_PREFIXES.item}${id}`)
  if (!item) {
    throw createError('Item not found.', 404)
  }

  let comments = records
    .filter(record => record.type === 'comment' && record.rootId === id)

  return {
    item: serializeItem(item, state, username),
    comments: buildCommentTree(comments, state, username)
  }
}

async function createItem ({ type, title, url, text, username }) {
  if (!username) {
    throw createError('You must be logged in to submit.')
  }
  if (!ITEM_TYPES.includes(type) || type === 'comment') {
    throw createError('Invalid item type.')
  }
  if (!title || title.trim().length < 3) {
    throw createError('Title is required.')
  }
  if (type === 'story' || type === 'show' || type === 'job') {
    if (!url && !text) {
      throw createError('Provide a URL or text.')
    }
  }
  if (type === 'ask' && !text) {
    throw createError('Ask posts require text.')
  }

  let id = createId('i_')
  let item = {
    key: `${KEY_PREFIXES.item}${id}`,
    id,
    type,
    title: title.trim(),
    url: url || '',
    text: text || '',
    by: username,
    createdAt: nowISO(),
    score: 1,
    descendants: 0,
    parentId: null,
    rootId: null,
    deleted: false,
    flags: 0
  }
  await setRecord(item)
  return item
}

async function createComment ({ itemId, parentId, text, username }) {
  if (!username) {
    throw createError('You must be logged in to comment.')
  }
  if (!text || text.trim().length < 1) {
    throw createError('Comment text is required.')
  }
  let root = await getByKey(`${KEY_PREFIXES.item}${itemId}`)
  if (!root) {
    throw createError('Parent item not found.', 404)
  }

  let actualParentId = parentId || itemId
  if (parentId) {
    let parent = await getByKey(`${KEY_PREFIXES.item}${parentId}`)
    if (!parent) {
      throw createError('Parent comment not found.', 404)
    }
  }

  let id = createId('c_')
  let comment = {
    key: `${KEY_PREFIXES.item}${id}`,
    id,
    type: 'comment',
    text: text.trim(),
    by: username,
    createdAt: nowISO(),
    score: 1,
    descendants: 0,
    parentId: actualParentId,
    rootId: itemId,
    deleted: false,
    flags: 0
  }
  await setRecord(comment)

  root.descendants = (root.descendants || 0) + 1
  await setRecord(root)

  return comment
}

async function voteItem ({ itemId, username }) {
  if (!username) {
    throw createError('You must be logged in to vote.')
  }
  let item = await getByKey(`${KEY_PREFIXES.item}${itemId}`)
  if (!item) {
    throw createError('Item not found.', 404)
  }
  if (item.by === username) {
    throw createError('You cannot vote for your own item.')
  }

  let voteKey = `${KEY_PREFIXES.vote}${username}:${itemId}`
  let existing = await getByKey(voteKey)
  if (existing) {
    throw createError('Already voted.')
  }

  await setRecord({
    key: voteKey,
    username,
    itemId,
    createdAt: nowISO()
  })

  item.score = (item.score || 0) + 1
  await setRecord(item)

  if (item.by) {
    await adjustUserKarma(item.by, 1)
  }

  return item
}

async function unvoteItem ({ itemId, username }) {
  if (!username) {
    throw createError('You must be logged in to vote.')
  }
  let voteKey = `${KEY_PREFIXES.vote}${username}:${itemId}`
  let existing = await getByKey(voteKey)
  if (!existing) {
    throw createError('Vote not found.', 404)
  }
  await deleteRecord(voteKey)

  let item = await getByKey(`${KEY_PREFIXES.item}${itemId}`)
  if (item) {
    item.score = Math.max(0, (item.score || 0) - 1)
    await setRecord(item)
    if (item.by) {
      await adjustUserKarma(item.by, -1)
    }
  }

  return item
}

async function setFavorite ({ itemId, username, enabled }) {
  if (!username) {
    throw createError('You must be logged in to favorite.')
  }
  let favoriteKey = `${KEY_PREFIXES.favorite}${username}:${itemId}`
  if (enabled) {
    await setRecord({
      key: favoriteKey,
      username,
      itemId,
      createdAt: nowISO()
    })
  } else {
    await deleteRecord(favoriteKey)
  }
}

async function setHidden ({ itemId, username, enabled }) {
  if (!username) {
    throw createError('You must be logged in to hide.')
  }
  let hideKey = `${KEY_PREFIXES.hide}${username}:${itemId}`
  if (enabled) {
    await setRecord({
      key: hideKey,
      username,
      itemId,
      createdAt: nowISO()
    })
  } else {
    await deleteRecord(hideKey)
  }
}

async function flagItem ({ itemId, username, reason }) {
  if (!username) {
    throw createError('You must be logged in to flag.')
  }
  let flagKey = `${KEY_PREFIXES.flag}${username}:${itemId}`
  let existing = await getByKey(flagKey)
  if (existing) {
    throw createError('Already flagged.')
  }

  await setRecord({
    key: flagKey,
    username,
    itemId,
    reason: reason || '',
    createdAt: nowISO()
  })

  let item = await getByKey(`${KEY_PREFIXES.item}${itemId}`)
  if (item) {
    item.flags = (item.flags || 0) + 1
    await setRecord(item)
  }
}

async function editItem ({ itemId, username, title, url, text }) {
  if (!username) {
    throw createError('You must be logged in to edit.')
  }
  let item = await getByKey(`${KEY_PREFIXES.item}${itemId}`)
  if (!item) {
    throw createError('Item not found.', 404)
  }
  if (item.by !== username) {
    throw createError('You can only edit your own items.', 403)
  }

  if (item.type === 'comment') {
    if (!text || text.trim().length < 1) {
      throw createError('Comment text is required.')
    }
    item.text = text.trim()
  } else {
    if (title && title.trim().length < 3) {
      throw createError('Title is too short.')
    }
    if (title) item.title = title.trim()
    if (typeof url === 'string') item.url = url
    if (typeof text === 'string') item.text = text
  }

  item.editedAt = nowISO()
  await setRecord(item)
  return item
}

async function deleteItem ({ itemId, username }) {
  if (!username) {
    throw createError('You must be logged in to delete.')
  }
  let item = await getByKey(`${KEY_PREFIXES.item}${itemId}`)
  if (!item) {
    throw createError('Item not found.', 404)
  }
  if (item.by !== username) {
    throw createError('You can only delete your own items.', 403)
  }

  item.deleted = true
  item.editedAt = nowISO()
  if (item.type === 'comment') {
    item.text = '[deleted]'
  } else {
    item.title = '[deleted]'
    item.text = item.text ? '[deleted]' : ''
    item.url = ''
  }
  await setRecord(item)
  return item
}

async function adjustUserKarma (username, delta) {
  let user = await getByKey(`${KEY_PREFIXES.user}${username}`)
  if (!user) return
  user.karma = (user.karma || 0) + delta
  await setRecord(user)
}

module.exports = {
  PAGE_SIZE,
  registerUser,
  authenticateUser,
  getUserProfile,
  getUserThreads,
  getUserFavorites,
  getUserHidden,
  listItems,
  listComments,
  getItemDetail,
  createItem,
  createComment,
  voteItem,
  unvoteItem,
  setFavorite,
  setHidden,
  flagItem,
  editItem,
  deleteItem
}
