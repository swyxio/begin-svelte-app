let test = require('tape')
let tiny = require('tiny-json-http')
let sandbox = require('@architect/sandbox')

let url = 'http://localhost:6666'
let end
let authorCookie
let readerCookie
let itemId
let jobId

test('Set up env', t => {
  t.plan(1)
  t.ok(sandbox, 'sandbox loaded')
})

test('Start sandbox', async t => {
  t.plan(1)
  end = await sandbox.start()
  t.ok(end, 'Sandbox started!')
})

test('Register author and create item', async t => {
  t.plan(10)
  let register = await tiny.post({
    url: `${url}/api`,
    data: { action: 'register', username: 'cathy', password: 'password123' }
  })
  authorCookie = register.headers['set-cookie'][0].split(';')[0]
  t.ok(authorCookie, 'Author session ready')

  let create = await tiny.post({
    url: `${url}/api`,
    headers: { cookie: authorCookie },
    data: {
      action: 'create-item',
      type: 'ask',
      title: 'Ask HN: Favorite tooling?',
      text: 'What do you use daily?'
    }
  })
  itemId = create.body.item.id
  t.ok(itemId, 'Created ask item')

  let job = await tiny.post({
    url: `${url}/api`,
    headers: { cookie: authorCookie },
    data: {
      action: 'create-item',
      type: 'job',
      title: 'Hiring: Frontend Engineer',
      text: 'Email us.'
    }
  })
  jobId = job.body.item.id
  t.ok(jobId, 'Created job item')

  try {
    await tiny.post({
      url: `${url}/api`,
      headers: { cookie: authorCookie },
      data: { action: 'create-comment', itemId: job.body.item.id, text: 'Interested.' }
    })
    t.fail('Job comment should fail')
  } catch (err) {
    t.equal(err.statusCode, 400, 'Job comments rejected')
    t.equal(err.body.status, 400, 'Error payload includes status')
  }

  let comment = await tiny.post({
    url: `${url}/api`,
    headers: { cookie: authorCookie },
    data: { action: 'create-comment', itemId, text: 'Thanks for the responses!' }
  })
  t.ok(comment.body.comment.id, 'Profile comment created')

  await tiny.post({
    url: `${url}/api`,
    headers: { cookie: authorCookie },
    data: { action: 'update-profile', about: 'I love HN.' }
  })

  let profile = await tiny.get({
    url: `${url}/api?action=user&username=cathy`,
    headers: { cookie: authorCookie }
  })
  let profileComment = profile.body.comments.find(entry => entry.rootId === itemId)
  t.ok(profile.body.submissions.length >= 1, 'Profile submissions returned')
  t.equal(profileComment.rootTitle, 'Ask HN: Favorite tooling?', 'Profile comment root title populated')
  t.equal(profileComment.rootBy, 'cathy', 'Profile comment root author populated')
  t.equal(profile.body.user.about, 'I love HN.', 'Profile about updated')
})

test('Register reader and favorite/hide', async t => {
  t.plan(6)
  let register = await tiny.post({
    url: `${url}/api`,
    data: { action: 'register', username: 'dave', password: 'password123' }
  })
  readerCookie = register.headers['set-cookie'][0].split(';')[0]
  t.ok(readerCookie, 'Reader session ready')

  try {
    await tiny.post({
      url: `${url}/api`,
      headers: { cookie: readerCookie },
      data: { action: 'vote', itemId: jobId }
    })
    t.fail('Job votes should fail')
  } catch (err) {
    t.equal(err.statusCode, 400, 'Job votes rejected')
    t.equal(err.body.status, 400, 'Job vote includes status')
  }

  await tiny.post({
    url: `${url}/api`,
    headers: { cookie: readerCookie },
    data: { action: 'favorite', itemId }
  })
  t.ok(true, 'Favorited item')

  let favorites = await tiny.get({
    url: `${url}/api?action=favorites&username=dave`,
    headers: { cookie: readerCookie }
  })
  t.ok(favorites.body.items.length >= 1, 'Favorites returned')

  await tiny.post({
    url: `${url}/api`,
    headers: { cookie: readerCookie },
    data: { action: 'hide', itemId }
  })
  let hiddenForReader = await tiny.get({
    url: `${url}/api?action=items&sort=top`,
    headers: { cookie: readerCookie }
  })
  t.ok(!hiddenForReader.body.items.some(item => item.id === itemId), 'Hidden item removed from list')
})

test('Hidden list and threads', async t => {
  t.plan(3)
  let hidden = await tiny.get({
    url: `${url}/api?action=hidden&username=dave`,
    headers: { cookie: readerCookie }
  })
  t.ok(hidden.body.items.some(item => item.id === itemId), 'Hidden list contains item')

  await tiny.post({
    url: `${url}/api`,
    headers: { cookie: readerCookie },
    data: { action: 'create-comment', itemId, text: 'Thanks for the question!' }
  })

  let threads = await tiny.get({
    url: `${url}/api?action=threads&username=dave`,
    headers: { cookie: readerCookie }
  })
  t.ok(threads.body.comments.length >= 1, 'Threads returned')
  let threadComment = threads.body.comments.find(comment => comment.rootId === itemId)
  t.equal(threadComment.rootBy, 'cathy', 'Threads include root author')
})

test('Remove favorite and hidden', async t => {
  t.plan(2)
  await tiny.post({
    url: `${url}/api`,
    headers: { cookie: readerCookie },
    data: { action: 'unfavorite', itemId }
  })
  await tiny.post({
    url: `${url}/api`,
    headers: { cookie: readerCookie },
    data: { action: 'unhide', itemId }
  })

  let favorites = await tiny.get({
    url: `${url}/api?action=favorites&username=dave`,
    headers: { cookie: readerCookie }
  })
  t.ok(!favorites.body.items.some(item => item.id === itemId), 'Unfavorite removed item')

  let hidden = await tiny.get({
    url: `${url}/api?action=hidden&username=dave`,
    headers: { cookie: readerCookie }
  })
  t.ok(!hidden.body.items.some(item => item.id === itemId), 'Unhide removed item')
})

test('Shut down sandbox', t => {
  t.plan(1)
  end()
  t.ok(true, 'shutdown')
})
