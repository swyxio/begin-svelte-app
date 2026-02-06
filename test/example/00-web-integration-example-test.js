let test = require('tape')
let tiny = require('tiny-json-http')
let sandbox = require('@architect/sandbox')

let url = 'http://localhost:6666'
let end
let submitterCookie
let voterCookie
let itemId
let commentId

test('Set up env', t => {
  t.plan(1)
  t.ok(sandbox, 'sandbox loaded')
})

test('Start sandbox', async t => {
  t.plan(1)
  end = await sandbox.start()
  t.ok(end, 'Sandbox started!')
})

test('Register submitter', async t => {
  t.plan(2)
  let result = await tiny.post({
    url: `${url}/api`,
    data: { action: 'register', username: 'alice', password: 'password123' }
  })
  t.equal(result.body.user.username, 'alice', 'User registered')
  submitterCookie = result.headers['set-cookie'][0].split(';')[0]
  t.ok(submitterCookie, 'Got submitter session cookie')
})

test('Create story', async t => {
  t.plan(2)
  let result = await tiny.post({
    url: `${url}/api`,
    headers: { cookie: submitterCookie },
    data: {
      action: 'create-item',
      type: 'story',
      title: 'Hello HN',
      url: 'https://example.com',
      text: ''
    }
  })
  itemId = result.body.item.id
  t.ok(itemId, 'Created story')
  t.equal(result.body.item.title, 'Hello HN', 'Story title saved')
})

test('Create comment', async t => {
  t.plan(2)
  let result = await tiny.post({
    url: `${url}/api`,
    headers: { cookie: submitterCookie },
    data: {
      action: 'create-comment',
      itemId,
      text: 'First comment!'
    }
  })
  commentId = result.body.comment.id
  t.ok(commentId, 'Created comment')
  t.equal(result.body.comment.rootId, itemId, 'Comment root saved')
})

test('Register voter', async t => {
  t.plan(2)
  let result = await tiny.post({
    url: `${url}/api`,
    data: { action: 'register', username: 'bob', password: 'password123' }
  })
  t.equal(result.body.user.username, 'bob', 'Voter registered')
  voterCookie = result.headers['set-cookie'][0].split(';')[0]
  t.ok(voterCookie, 'Got voter session cookie')
})

test('Vote on story', async t => {
  t.plan(1)
  let result = await tiny.post({
    url: `${url}/api`,
    headers: { cookie: voterCookie },
    data: { action: 'vote', itemId }
  })
  t.ok(result.body.item.score >= 2, 'Story score incremented')
})

test('Get item detail', async t => {
  t.plan(2)
  let result = await tiny.get({
    url: `${url}/api?action=item&id=${itemId}`,
    headers: { cookie: voterCookie }
  })
  t.equal(result.body.item.id, itemId, 'Loaded item detail')
  t.ok(result.body.comments.length >= 1, 'Loaded comment tree')
})

test('Get comments listing', async t => {
  t.plan(1)
  let result = await tiny.get({
    url: `${url}/api?action=comments`,
    headers: { cookie: voterCookie }
  })
  t.ok(result.body.comments.some(comment => comment.rootId === itemId), 'Comments listing includes thread')
})

test('Shut down sandbox', t => {
  t.plan(1)
  end()
  tiny.get({ url },
  function win (err, result) {
    if (err) {
      t.ok(['ECONNREFUSED', 'ECONNRESET'].includes(err.code), 'Sandbox successfully shut down')
    } else {
      t.fail('Sandbox did not shut down')
    }
  })
})
