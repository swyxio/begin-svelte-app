const crypto = require('crypto')
const data = require('@begin/data')

const TABLE = 'data'

const KEY_PREFIXES = {
  user: 'user#',
  session: 'session#',
  item: 'item#',
  vote: 'vote#',
  favorite: 'fav#',
  hide: 'hide#',
  flag: 'flag#'
}

function nowISO () {
  return new Date().toISOString()
}

function createId (prefix = '') {
  return `${prefix}${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`
}

async function listAll () {
  let result = await data.get({ table: TABLE })
  return result || []
}

async function getByKey (key) {
  return data.get({ table: TABLE, key })
}

async function setRecord (record) {
  return data.set({ table: TABLE, ...record })
}

async function deleteRecord (key) {
  return data.destroy({ table: TABLE, key })
}

function filterByPrefix (records, prefix) {
  return records.filter(record => record && record.key && record.key.startsWith(prefix))
}

module.exports = {
  TABLE,
  KEY_PREFIXES,
  nowISO,
  createId,
  listAll,
  getByKey,
  setRecord,
  deleteRecord,
  filterByPrefix
}
