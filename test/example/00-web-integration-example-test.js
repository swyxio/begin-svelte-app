let test = require('tape')
let tiny = require('tiny-json-http')
let sandbox = require('@architect/sandbox')

let url = 'http://localhost:6666'
let end
let submitterCookie
let voterCookie
let flaggerCookie
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

test('Missing action returns status', async t => {
  t.plan(2)
  try {
    await tiny.get({ url: `${url}/api`, buffer: true })
    t.fail('Missing action should fail')
  } catch (err) {
    let body = JSON.parse(err.body)
    t.equal(err.statusCode, 400, 'Missing action returns 400')
    t.equal(body.status, 400, 'Missing action includes status')
  }
})

test('Unknown action returns status', async t => {
  t.plan(2)
  try {
    await tiny.get({ url: `${url}/api?action=unknown`, buffer: true })
    t.fail('Unknown action should fail')
  } catch (err) {
    let body = JSON.parse(err.body)
    t.equal(err.statusCode, 404, 'Unknown action returns 404')
    t.equal(body.status, 404, 'Unknown action includes status')
  }
})

test('Missing favorites username returns status', async t => {
  t.plan(2)
  try {
    await tiny.get({ url: `${url}/api?action=favorites`, buffer: true })
    t.fail('Missing username should fail')
  } catch (err) {
    let body = JSON.parse(err.body)
    t.equal(err.statusCode, 400, 'Missing username returns 400')
    t.equal(body.status, 400, 'Missing username includes status')
  }
})

test('Unknown favorites user returns status', async t => {
  t.plan(2)
  try {
    await tiny.get({ url: `${url}/api?action=favorites&username=missing`, buffer: true })
    t.fail('Missing user should fail')
  } catch (err) {
    let body = JSON.parse(err.body)
    t.equal(err.statusCode, 404, 'Missing user returns 404')
    t.equal(body.status, 404, 'Missing user includes status')
  }
})

test('Missing hidden username returns status', async t => {
  t.plan(2)
  try {
    await tiny.get({ url: `${url}/api?action=hidden`, buffer: true })
    t.fail('Missing username should fail')
  } catch (err) {
    let body = JSON.parse(err.body)
    t.equal(err.statusCode, 400, 'Missing username returns 400')
    t.equal(body.status, 400, 'Missing username includes status')
  }
})

test('Unknown hidden user returns status', async t => {
  t.plan(2)
  try {
    await tiny.get({ url: `${url}/api?action=hidden&username=missing`, buffer: true })
    t.fail('Missing user should fail')
  } catch (err) {
    let body = JSON.parse(err.body)
    t.equal(err.statusCode, 404, 'Missing user returns 404')
    t.equal(body.status, 404, 'Missing user includes status')
  }
})

test('Missing item id returns status', async t => {
  t.plan(2)
  try {
    await tiny.get({ url: `${url}/api?action=item`, buffer: true })
    t.fail('Missing item id should fail')
  } catch (err) {
    let body = JSON.parse(err.body)
    t.equal(err.statusCode, 400, 'Missing item id returns 400')
    t.equal(body.status, 400, 'Missing item id includes status')
  }
})

test('Missing user username returns status', async t => {
  t.plan(2)
  try {
    await tiny.get({ url: `${url}/api?action=user`, buffer: true })
    t.fail('Missing username should fail')
  } catch (err) {
    let body = JSON.parse(err.body)
    t.equal(err.statusCode, 400, 'Missing username returns 400')
    t.equal(body.status, 400, 'Missing username includes status')
  }
})

test('Missing threads username returns status', async t => {
  t.plan(2)
  try {
    await tiny.get({ url: `${url}/api?action=threads`, buffer: true })
    t.fail('Missing username should fail')
  } catch (err) {
    let body = JSON.parse(err.body)
    t.equal(err.statusCode, 400, 'Missing username returns 400')
    t.equal(body.status, 400, 'Missing username includes status')
  }
})

test('Unknown item returns status', async t => {
  t.plan(2)
  try {
    await tiny.get({ url: `${url}/api?action=item&id=missing`, buffer: true })
    t.fail('Missing item should fail')
  } catch (err) {
    let body = JSON.parse(err.body)
    t.equal(err.statusCode, 404, 'Missing item returns 404')
    t.equal(body.status, 404, 'Missing item includes status')
  }
})

test('Unknown user returns status', async t => {
  t.plan(2)
  try {
    await tiny.get({ url: `${url}/api?action=user&username=missing`, buffer: true })
    t.fail('Missing user should fail')
  } catch (err) {
    let body = JSON.parse(err.body)
    t.equal(err.statusCode, 404, 'Missing user returns 404')
    t.equal(body.status, 404, 'Missing user includes status')
  }
})

test('Unknown threads user returns status', async t => {
  t.plan(2)
  try {
    await tiny.get({ url: `${url}/api?action=threads&username=missing`, buffer: true })
    t.fail('Missing user should fail')
  } catch (err) {
    let body = JSON.parse(err.body)
    t.equal(err.statusCode, 404, 'Missing user returns 404')
    t.equal(body.status, 404, 'Missing user includes status')
  }
})

test('Missing POST action returns status', async t => {
  t.plan(2)
  try {
    await tiny.post({ url: `${url}/api`, data: {} })
    t.fail('Missing action should fail')
  } catch (err) {
    t.equal(err.statusCode, 400, 'Missing POST action returns 400')
    t.equal(err.body.status, 400, 'Missing POST action includes status')
  }
})

test('Unknown POST action returns status', async t => {
  t.plan(2)
  try {
    await tiny.post({ url: `${url}/api`, data: { action: 'unknown' } })
    t.fail('Unknown action should fail')
  } catch (err) {
    t.equal(err.statusCode, 404, 'Unknown POST action returns 404')
    t.equal(err.body.status, 404, 'Unknown POST action includes status')
  }
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

test('Register flagger', async t => {
  t.plan(2)
  let result = await tiny.post({
    url: `${url}/api`,
    data: { action: 'register', username: 'claire', password: 'password123' }
  })
  t.equal(result.body.user.username, 'claire', 'Flagger registered')
  flaggerCookie = result.headers['set-cookie'][0].split(';')[0]
  t.ok(flaggerCookie, 'Got flagger session cookie')
})

test('Vote on story', async t => {
  t.plan(1)
  let result = await tiny.post({
    url: `${url}/api`,
    headers: { cookie: voterCookie },
    data: { action: 'vote', itemId }
  })
  t.ok(result.body.item.score >= 1, 'Story score incremented')
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

test('Flag item to hide', async t => {
  t.plan(1)
  await tiny.post({
    url: `${url}/api`,
    headers: { cookie: flaggerCookie },
    data: { action: 'flag', itemId }
  })
  await tiny.post({
    url: `${url}/api`,
    headers: { cookie: voterCookie },
    data: { action: 'flag', itemId }
  })
  await tiny.post({
    url: `${url}/api`,
    headers: { cookie: submitterCookie },
    data: { action: 'flag', itemId }
  })
  let result = await tiny.get({
    url: `${url}/api?action=item&id=${itemId}`,
    headers: { cookie: voterCookie }
  })
  t.ok(result.body.item.deleted, 'Item flagged and hidden')
})

test('Get comments listing', async t => {
  t.plan(2)
  let result = await tiny.get({
    url: `${url}/api?action=comments`,
    headers: { cookie: voterCookie }
  })
  let thread = result.body.comments.find(comment => comment.rootId === itemId)
  t.ok(thread, 'Comments listing includes thread')
  t.equal(thread.rootBy, 'alice', 'Comments listing includes root author')
})

test('Edit and delete item', async t => {
  t.plan(4)
  let created = await tiny.post({
    url: `${url}/api`,
    headers: { cookie: submitterCookie },
    data: { action: 'create-item', type: 'story', title: 'Temp story', url: 'https://example.com/temp' }
  })
  let tempId = created.body.item.id
  let edit = await tiny.post({
    url: `${url}/api`,
    headers: { cookie: submitterCookie },
    data: { action: 'edit-item', itemId: tempId, title: 'Updated title' }
  })
  t.equal(edit.body.item.title, 'Updated title', 'Item title updated')
  let detail = await tiny.get({
    url: `${url}/api?action=item&id=${tempId}`,
    headers: { cookie: submitterCookie }
  })
  t.equal(detail.body.item.title, 'Updated title', 'Item detail shows updated title')
  let deleted = await tiny.post({
    url: `${url}/api`,
    headers: { cookie: submitterCookie },
    data: { action: 'delete-item', itemId: tempId }
  })
  t.ok(deleted.body.item.deleted, 'Item deleted')
  let detailAfter = await tiny.get({
    url: `${url}/api?action=item&id=${tempId}`,
    headers: { cookie: submitterCookie }
  })
  t.equal(detailAfter.body.item.title, '[deleted]', 'Deleted item title masked')
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
