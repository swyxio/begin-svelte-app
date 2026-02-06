const hn = require('../../shared/hn')
const {
  getSessionFromRequest,
  createSession,
  destroySession,
  buildSessionCookie,
  clearSessionCookie
} = require('../../shared/auth')

function jsonResponse (statusCode, payload, headers = {}) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf8',
      ...headers
    },
    body: JSON.stringify(payload)
  }
}

function parseBody (req) {
  let body = req.body || req.rawBody
  if (!body) return {}
  if (Buffer.isBuffer(body)) {
    body = body.toString()
  }
  if (typeof body === 'string') {
    try {
      return JSON.parse(body)
    } catch (error) {
      return {}
    }
  }
  return body
}

exports.handler = async function http (req) {
  try {
    let body = parseBody(req)
    let action = body.action
    let session = await getSessionFromRequest(req)
    let username = session ? session.username : null

    console.log('hn-api-post', JSON.stringify({ action, username }))

    if (!action) {
      return jsonResponse(400, { error: 'Missing action.' })
    }

    if (action === 'register') {
      let user = await hn.registerUser({
        username: body.username,
        password: body.password,
        about: body.about || ''
      })
      let newSession = await createSession(user.username)
      return jsonResponse(200, { user }, {
        'set-cookie': buildSessionCookie(newSession.sessionId)
      })
    }

    if (action === 'login') {
      let user = await hn.authenticateUser({
        username: body.username,
        password: body.password
      })
      let newSession = await createSession(user.username)
      return jsonResponse(200, { user }, {
        'set-cookie': buildSessionCookie(newSession.sessionId)
      })
    }

    if (action === 'logout') {
      if (session) {
        await destroySession(session.sessionId)
      }
      return jsonResponse(200, { ok: true }, {
        'set-cookie': clearSessionCookie()
      })
    }

    if (action === 'create-item') {
      let item = await hn.createItem({
        type: body.type,
        title: body.title,
        url: body.url,
        text: body.text,
        username
      })
      return jsonResponse(200, { item })
    }

    if (action === 'create-comment') {
      let comment = await hn.createComment({
        itemId: body.itemId,
        parentId: body.parentId,
        text: body.text,
        username
      })
      return jsonResponse(200, { comment })
    }

    if (action === 'vote') {
      let item = await hn.voteItem({ itemId: body.itemId, username })
      return jsonResponse(200, { item })
    }

    if (action === 'unvote') {
      let item = await hn.unvoteItem({ itemId: body.itemId, username })
      return jsonResponse(200, { item })
    }

    if (action === 'favorite') {
      await hn.setFavorite({ itemId: body.itemId, username, enabled: true })
      return jsonResponse(200, { ok: true })
    }

    if (action === 'unfavorite') {
      await hn.setFavorite({ itemId: body.itemId, username, enabled: false })
      return jsonResponse(200, { ok: true })
    }

    if (action === 'hide') {
      await hn.setHidden({ itemId: body.itemId, username, enabled: true })
      return jsonResponse(200, { ok: true })
    }

    if (action === 'unhide') {
      await hn.setHidden({ itemId: body.itemId, username, enabled: false })
      return jsonResponse(200, { ok: true })
    }

    if (action === 'flag') {
      await hn.flagItem({
        itemId: body.itemId,
        username,
        reason: body.reason || ''
      })
      return jsonResponse(200, { ok: true })
    }

    if (action === 'edit-item') {
      let item = await hn.editItem({
        itemId: body.itemId,
        username,
        title: body.title,
        url: body.url,
        text: body.text
      })
      return jsonResponse(200, { item })
    }

    if (action === 'delete-item') {
      let item = await hn.deleteItem({ itemId: body.itemId, username })
      return jsonResponse(200, { item })
    }

    return jsonResponse(404, { error: 'Unknown action.' })
  } catch (error) {
    console.error(error)
    return jsonResponse(error.status || 500, { error: error.message || 'Server error.' })
  }
}
