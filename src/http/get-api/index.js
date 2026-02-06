const hn = require('../../shared/hn')
const { getSessionFromRequest } = require('../../shared/auth')
const { getByKey, KEY_PREFIXES } = require('../../shared/db')

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

exports.handler = async function http (req) {
  try {
    let query = req.queryStringParameters || {}
    let action = query.action
    let session = await getSessionFromRequest(req)
    let username = session ? session.username : null
    if (!action) {
      let payload = { error: 'Missing action.', status: 400 }
      return jsonResponse(400, payload)
    }

    if (action === 'me') {
      if (!username) {
        return jsonResponse(200, { user: null })
      }
      let user = await getByKey(`${KEY_PREFIXES.user}${username}`)
      if (!user) {
        return jsonResponse(200, { user: null })
      }
      return jsonResponse(200, { user: { username: user.username, karma: user.karma || 0, createdAt: user.createdAt, about: user.about || '' } })
    }

    if (action === 'items') {
      let sort = query.sort || 'top'
      let type = query.type || null
      let page = Number(query.page || 1)
      let data = await hn.listItems({ sort, type, page, username })
      return jsonResponse(200, data)
    }

    if (action === 'comments') {
      let page = Number(query.page || 1)
      let data = await hn.listComments({ page, username })
      return jsonResponse(200, data)
    }

    if (action === 'item') {
      let id = query.id
      let data = await hn.getItemDetail({ id, username })
      return jsonResponse(200, data)
    }

    if (action === 'user') {
      let data = await hn.getUserProfile(query.username, username)
      return jsonResponse(200, data)
    }

    if (action === 'threads') {
      let data = await hn.getUserThreads(query.username, username)
      return jsonResponse(200, data)
    }

    if (action === 'favorites') {
      let target = query.username || username
      if (!target) {
        return jsonResponse(400, { error: 'Missing username.', status: 400 })
      }
      let data = await hn.getUserFavorites(target, username)
      return jsonResponse(200, data)
    }

    if (action === 'hidden') {
      let target = query.username || username
      if (!target) {
        return jsonResponse(400, { error: 'Missing username.', status: 400 })
      }
      let data = await hn.getUserHidden(target, username)
      return jsonResponse(200, data)
    }

    return jsonResponse(404, { error: 'Unknown action.', status: 404 })
  } catch (error) {
    console.error(error)
    let status = error.status || 500
    return jsonResponse(status, { error: error.message || 'Server error.', status })
  }
}
