const crypto = require('crypto')
const {
  KEY_PREFIXES,
  createId,
  getByKey,
  setRecord,
  deleteRecord
} = require('./db')

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 14

function hashPassword (password, salt = crypto.randomBytes(16).toString('hex')) {
  let hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword (password, stored) {
  let [salt, hash] = stored.split(':')
  let candidate = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'))
}

function parseCookies (cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map(entry => entry.trim())
    .filter(Boolean)
    .reduce((cookies, entry) => {
      let index = entry.indexOf('=')
      if (index === -1) return cookies
      let key = entry.slice(0, index)
      let value = entry.slice(index + 1)
      cookies[key] = decodeURIComponent(value)
      return cookies
    }, {})
}

async function getSessionFromRequest (req) {
  let cookieHeader = ''
  if (req && req.headers) {
    cookieHeader = req.headers.cookie || req.headers.Cookie || ''
  }
  let cookies = parseCookies(cookieHeader)
  let sessionId = cookies.hn_session
  if (!sessionId) return null

  let session = await getByKey(`${KEY_PREFIXES.session}${sessionId}`)
  if (!session) return null

  if (session.expiresAt && session.expiresAt < Date.now()) {
    await deleteRecord(session.key)
    return null
  }

  return session
}

async function createSession (username) {
  let sessionId = createId('s_')
  let now = Date.now()
  let record = {
    key: `${KEY_PREFIXES.session}${sessionId}`,
    sessionId,
    username,
    createdAt: now,
    expiresAt: now + SESSION_DURATION_MS
  }
  await setRecord(record)
  return record
}

async function destroySession (sessionId) {
  if (!sessionId) return
  await deleteRecord(`${KEY_PREFIXES.session}${sessionId}`)
}

function buildSessionCookie (sessionId) {
  let maxAge = Math.floor(SESSION_DURATION_MS / 1000)
  return `hn_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`
}

function clearSessionCookie () {
  return 'hn_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
}

module.exports = {
  hashPassword,
  verifyPassword,
  parseCookies,
  getSessionFromRequest,
  createSession,
  destroySession,
  buildSessionCookie,
  clearSessionCookie
}
