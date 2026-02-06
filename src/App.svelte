<script>
  import { onMount } from 'svelte'
  import CommentThread from './components/CommentThread.svelte'

  const PAGE_SIZE = 30
  const listPages = ['top', 'new', 'ask', 'show', 'jobs']

  let route = { page: 'top', params: new URLSearchParams() }
  let currentUser = null
  let items = []
  let commentList = []
  let listHasMore = false
  let itemDetail = null
  let userProfile = null
  let userThreads = null
  let favorites = null
  let hiddenItems = null
  let loading = false
  let error = ''
  let page = 1

  let authError = ''
  let loginUsername = ''
  let loginPassword = ''
  let registerMode = false

  let submitType = 'story'
  let submitTitle = ''
  let submitUrl = ''
  let submitText = ''
  let submitError = ''

  let commentText = ''
  let showEditForm = false
  let editTitle = ''
  let editUrl = ''
  let editText = ''

  $: if (itemDetail && itemDetail.item && !showEditForm) {
    editTitle = itemDetail.item.title || ''
    editUrl = itemDetail.item.url || ''
    editText = itemDetail.item.text || ''
  }

  function parseRoute () {
    let hash = window.location.hash.replace(/^#/, '')
    if (!hash) {
      return { page: 'top', params: new URLSearchParams() }
    }
    let [path, queryString] = hash.split('?')
    let pageName = path.replace(/^\//, '') || 'top'
    return { page: pageName, params: new URLSearchParams(queryString || '') }
  }

  function setRouteFromHash () {
    route = parseRoute()
    page = Number(route.params.get('p') || 1)
  }

  function buildHash (pageName, params = {}) {
    let search = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, value)
      }
    })
    let query = search.toString()
    return `#/${pageName}${query ? `?${query}` : ''}`
  }

  function timeAgo (iso) {
    if (!iso) return ''
    let seconds = Math.floor((Date.now() - new Date(iso)) / 1000)
    if (seconds < 60) return `${seconds} seconds ago`
    let minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} minutes ago`
    let hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hours ago`
    let days = Math.floor(hours / 24)
    return `${days} days ago`
  }

  function formatDate (iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString()
  }

  function itemLink (item) {
    if (item.url && item.type !== 'ask') {
      return item.url
    }
    return `#/item?id=${item.id}`
  }

  function itemLinkTarget (item) {
    return item.url && item.type !== 'ask' ? '_blank' : null
  }

  async function apiGet (action, params = {}) {
    let search = new URLSearchParams({ action })
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, value)
      }
    })
    let response = await fetch(`/api?${search.toString()}`, { credentials: 'same-origin' })
    let data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Request failed')
    }
    return data
  }

  async function apiPost (action, payload = {}) {
    let response = await fetch('/api', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action, ...payload })
    })
    let data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Request failed')
    }
    return data
  }

  async function loadCurrentUser () {
    try {
      let data = await apiGet('me')
      currentUser = data.user
    } catch (err) {
      currentUser = null
    }
  }

  async function loadRouteData () {
    loading = true
    error = ''
    items = []
    commentList = []
    itemDetail = null
    userProfile = null
    userThreads = null
    favorites = null
    hiddenItems = null
    listHasMore = false
    showEditForm = false
    commentText = ''
    submitError = ''

    try {
      if (listPages.includes(route.page)) {
        let sort = route.page === 'new' ? 'new' : 'top'
        let type = route.page === 'ask' ? 'ask' : route.page === 'show' ? 'show' : route.page === 'jobs' ? 'job' : null
        let data = await apiGet('items', { sort, type, page })
        items = data.items
        listHasMore = data.hasMore
      } else if (route.page === 'comments') {
        let data = await apiGet('comments', { page })
        commentList = data.comments
        listHasMore = data.hasMore
      } else if (route.page === 'item') {
        let id = route.params.get('id')
        if (!id) {
          throw new Error('Missing item id.')
        }
        let data = await apiGet('item', { id })
        itemDetail = data
      } else if (route.page === 'user') {
        let id = route.params.get('id')
        let data = await apiGet('user', { username: id })
        userProfile = data
      } else if (route.page === 'threads') {
        let id = route.params.get('id')
        let data = await apiGet('threads', { username: id })
        userThreads = data
      } else if (route.page === 'favorites') {
        let id = route.params.get('id') || (currentUser && currentUser.username)
        let data = await apiGet('favorites', { username: id })
        favorites = data.items
      } else if (route.page === 'hidden') {
        let id = route.params.get('id') || (currentUser && currentUser.username)
        let data = await apiGet('hidden', { username: id })
        hiddenItems = data.items
      }
    } catch (err) {
      error = err.message
    } finally {
      loading = false
    }
  }

  async function refresh () {
    await loadCurrentUser()
    await loadRouteData()
  }

  async function handleAuthSubmit () {
    authError = ''
    try {
      let action = registerMode ? 'register' : 'login'
      await apiPost(action, { username: loginUsername, password: loginPassword })
      loginPassword = ''
      await refresh()
      window.location.hash = '#/'
    } catch (err) {
      authError = err.message
    }
  }

  async function handleLogout () {
    await apiPost('logout')
    await refresh()
    window.location.hash = '#/'
  }

  async function handleSubmit () {
    submitError = ''
    try {
      let payload = {
        type: submitType,
        title: submitTitle,
        url: submitUrl,
        text: submitText
      }
      let data = await apiPost('create-item', payload)
      submitTitle = ''
      submitUrl = ''
      submitText = ''
      window.location.hash = `#/item?id=${data.item.id}`
      await refresh()
    } catch (err) {
      submitError = err.message
    }
  }

  async function handleCommentSubmit () {
    if (!itemDetail || !itemDetail.item) return
    try {
      await apiPost('create-comment', { itemId: itemDetail.item.id, text: commentText })
      commentText = ''
      await refresh()
    } catch (err) {
      error = err.message
    }
  }

  async function handleVote (item) {
    try {
      if (item.voted) {
        await apiPost('unvote', { itemId: item.id })
      } else {
        await apiPost('vote', { itemId: item.id })
      }
      await refresh()
    } catch (err) {
      error = err.message
    }
  }

  async function handleFavorite (item) {
    try {
      if (item.favorite) {
        await apiPost('unfavorite', { itemId: item.id })
      } else {
        await apiPost('favorite', { itemId: item.id })
      }
      await refresh()
    } catch (err) {
      error = err.message
    }
  }

  async function handleHide (item) {
    try {
      if (item.hidden) {
        await apiPost('unhide', { itemId: item.id })
      } else {
        await apiPost('hide', { itemId: item.id })
      }
      await refresh()
    } catch (err) {
      error = err.message
    }
  }

  async function handleFlag (item) {
    try {
      await apiPost('flag', { itemId: item.id })
      await refresh()
    } catch (err) {
      error = err.message
    }
  }

  async function handleEditItem () {
    if (!itemDetail || !itemDetail.item) return
    try {
      await apiPost('edit-item', {
        itemId: itemDetail.item.id,
        title: editTitle,
        url: editUrl,
        text: editText
      })
      showEditForm = false
      await refresh()
    } catch (err) {
      error = err.message
    }
  }

  async function handleDeleteItem (item) {
    try {
      await apiPost('delete-item', { itemId: item.id })
      await refresh()
    } catch (err) {
      error = err.message
    }
  }

  async function handleReply (comment, text) {
    if (!itemDetail || !itemDetail.item) return
    try {
      await apiPost('create-comment', {
        itemId: itemDetail.item.id,
        parentId: comment.id,
        text
      })
      await refresh()
    } catch (err) {
      error = err.message
    }
  }

  async function handleEditComment (comment, text) {
    try {
      await apiPost('edit-item', { itemId: comment.id, text })
      await refresh()
    } catch (err) {
      error = err.message
    }
  }

  async function handleDeleteComment (comment) {
    await handleDeleteItem(comment)
  }

  onMount(async () => {
    setRouteFromHash()
    await loadCurrentUser()
    await loadRouteData()
    window.addEventListener('hashchange', async () => {
      setRouteFromHash()
      await loadRouteData()
    })
  })
</script>

<div class="hn-app">
  <header class="topbar">
    <div class="brand">
      <a class="logo" href="#/">Y</a>
      <a class="title" href="#/">Hacker News</a>
    </div>
    <nav class="nav-links">
      <a href="#/comments">comments</a>
      <span class="sep">|</span>
      <a href="#/new">new</a>
      <span class="sep">|</span>
      <a href="#/ask">ask</a>
      <span class="sep">|</span>
      <a href="#/show">show</a>
      <span class="sep">|</span>
      <a href="#/jobs">jobs</a>
      <span class="sep">|</span>
      <a href="#/submit">submit</a>
    </nav>
    <div class="user-links">
      {#if currentUser}
        <a href={`#/user?id=${currentUser.username}`}>{currentUser.username} ({currentUser.karma})</a>
        <span class="sep">|</span>
        <a href={`#/threads?id=${currentUser.username}`}>threads</a>
        <span class="sep">|</span>
        <a href={`#/favorites?id=${currentUser.username}`}>favorites</a>
        <span class="sep">|</span>
        <a href={`#/hidden?id=${currentUser.username}`}>hidden</a>
        <span class="sep">|</span>
        <button type="button" class="link-button" on:click={handleLogout}>logout</button>
      {:else}
        <a href="#/login">login</a>
      {/if}
    </div>
  </header>

  <main class="content">
    {#if error}
      <div class="alert error">{error}</div>
    {/if}
    {#if loading}
      <div class="loading">Loading...</div>
    {/if}

    {#if listPages.includes(route.page)}
      <ol class="item-list" start={(page - 1) * PAGE_SIZE + 1}>
        {#each items as item, index}
          <li class="item-row">
            <span class="rank">{(page - 1) * PAGE_SIZE + index + 1}.</span>
            <span class="vote">
              {#if currentUser}
                <button type="button" class="link-button" on:click={() => handleVote(item)}>{item.voted ? '▲' : '△'}</button>
              {/if}
            </span>
            <div class="item-main">
              {#if item.deleted}
                <span class="title deleted">[deleted]</span>
              {:else}
                <a class="title" href={itemLink(item)} target={itemLinkTarget(item)} rel="noreferrer">
                  {item.title}
                </a>
              {/if}
              {#if item.domain}
                <span class="domain">({item.domain})</span>
              {/if}
              <div class="subtext">
                {item.score} points by
                <a href={`#/user?id=${item.by}`}>{item.by}</a>
                {timeAgo(item.createdAt)}
                <span class="sep">|</span>
                <a href={`#/item?id=${item.id}`}>{item.descendants} comments</a>
                {#if currentUser}
                  <span class="sep">|</span>
                  <button type="button" class="link-button" on:click={() => handleHide(item)}>{item.hidden ? 'unhide' : 'hide'}</button>
                  <span class="sep">|</span>
                  <button type="button" class="link-button" on:click={() => handleFavorite(item)}>{item.favorite ? 'unfavorite' : 'favorite'}</button>
                  <span class="sep">|</span>
                  <button type="button" class="link-button" on:click={() => handleFlag(item)}>{item.flagged ? 'flagged' : 'flag'}</button>
                {/if}
              </div>
            </div>
          </li>
        {/each}
      </ol>
      {#if listHasMore}
        <div class="more">
          <a href={buildHash(route.page, { p: page + 1 })}>more</a>
        </div>
      {/if}
    {/if}

    {#if route.page === 'comments'}
      <section class="comments">
        {#each commentList as comment}
          <div class="comment-snippet">
            <div class="comment-meta">
              {#if currentUser}
                <button type="button" class="link-button vote" on:click={() => handleVote(comment)}>{comment.voted ? '▲' : '△'}</button>
              {/if}
              {comment.score} points by
              <a href={`#/user?id=${comment.by}`}>{comment.by}</a>
              {timeAgo(comment.createdAt)}
              <span class="sep">|</span>
              <a href={`#/item?id=${comment.rootId}`}>{comment.rootTitle || 'link'}</a>
            </div>
            <div class="comment-text">{comment.text}</div>
          </div>
        {/each}
        {#if listHasMore}
          <div class="more">
            <a href={buildHash('comments', { p: page + 1 })}>more</a>
          </div>
        {/if}
      </section>
    {/if}

    {#if route.page === 'item' && itemDetail}
      <section class="item-detail">
        <div class="item-heading">
          <span class="vote">
            {#if currentUser}
              <button type="button" class="link-button" on:click={() => handleVote(itemDetail.item)}>{itemDetail.item.voted ? '▲' : '△'}</button>
            {/if}
          </span>
          <div class="item-main">
            {#if itemDetail.item.deleted}
              <span class="title deleted">[deleted]</span>
            {:else}
              <a class="title" href={itemLink(itemDetail.item)} target={itemLinkTarget(itemDetail.item)} rel="noreferrer">
                {itemDetail.item.title}
              </a>
            {/if}
            {#if itemDetail.item.domain}
              <span class="domain">({itemDetail.item.domain})</span>
            {/if}
            <div class="subtext">
              {itemDetail.item.score} points by
              <a href={`#/user?id=${itemDetail.item.by}`}>{itemDetail.item.by}</a>
              {timeAgo(itemDetail.item.createdAt)}
              <span class="sep">|</span>
              <button type="button" class="link-button" on:click={() => handleFavorite(itemDetail.item)}>{itemDetail.item.favorite ? 'unfavorite' : 'favorite'}</button>
              <span class="sep">|</span>
              <button type="button" class="link-button" on:click={() => handleHide(itemDetail.item)}>{itemDetail.item.hidden ? 'unhide' : 'hide'}</button>
              <span class="sep">|</span>
              <button type="button" class="link-button" on:click={() => handleFlag(itemDetail.item)}>{itemDetail.item.flagged ? 'flagged' : 'flag'}</button>
              {#if itemDetail.item.canEdit}
                <span class="sep">|</span>
                <button type="button" class="link-button" on:click={() => showEditForm = !showEditForm}>edit</button>
                <span class="sep">|</span>
                <button type="button" class="link-button" on:click={() => handleDeleteItem(itemDetail.item)}>delete</button>
              {/if}
            </div>
          </div>
        </div>
        {#if itemDetail.item.text}
          <div class="item-text">{itemDetail.item.text}</div>
        {/if}

        {#if showEditForm && itemDetail.item.canEdit}
          <div class="edit-form">
            <h3>Edit item</h3>
            <label>
              title
              <input type="text" bind:value={editTitle} />
            </label>
            <label>
              url
              <input type="text" bind:value={editUrl} />
            </label>
            <label>
              text
              <textarea rows="5" bind:value={editText}></textarea>
            </label>
            <button on:click={handleEditItem}>save</button>
          </div>
        {/if}

        {#if currentUser}
          <div class="comment-box">
            <textarea rows="6" bind:value={commentText}></textarea>
            <button on:click={handleCommentSubmit}>add comment</button>
          </div>
        {:else}
          <div class="comment-box muted">Login to comment.</div>
        {/if}

        <div class="comment-thread">
          {#if itemDetail.comments && itemDetail.comments.length}
            {#each itemDetail.comments as comment}
              <CommentThread
                comment={comment}
                currentUser={currentUser}
                timeAgo={timeAgo}
                onReply={handleReply}
                onVote={handleVote}
                onFavorite={handleFavorite}
                onFlag={handleFlag}
                onEdit={handleEditComment}
                onDelete={handleDeleteComment}
              />
            {/each}
          {:else}
            <div class="muted">No comments yet.</div>
          {/if}
        </div>
      </section>
    {/if}

    {#if route.page === 'submit'}
      <section class="submit-form">
        <h2>Submit</h2>
        {#if submitError}
          <div class="alert error">{submitError}</div>
        {/if}
        {#if currentUser}
          <label>
            type
            <select bind:value={submitType}>
              <option value="story">story</option>
              <option value="ask">ask</option>
              <option value="show">show</option>
              <option value="job">job</option>
            </select>
          </label>
          <label>
            title
            <input type="text" bind:value={submitTitle} />
          </label>
          {#if submitType !== 'ask'}
            <label>
              url
              <input type="text" bind:value={submitUrl} placeholder="https://example.com" />
            </label>
          {/if}
          <label>
            text
            <textarea rows="6" bind:value={submitText}></textarea>
          </label>
          <button on:click={handleSubmit}>submit</button>
        {:else}
          <div class="muted">Login to submit.</div>
        {/if}
      </section>
    {/if}

    {#if route.page === 'login'}
      <section class="auth-form">
        <h2>{registerMode ? 'Create account' : 'Login'}</h2>
        {#if authError}
          <div class="alert error">{authError}</div>
        {/if}
        <label>
          username
          <input type="text" bind:value={loginUsername} />
        </label>
        <label>
          password
          <input type="password" bind:value={loginPassword} />
        </label>
        <label class="checkbox">
          <input type="checkbox" bind:checked={registerMode} />
          create account
        </label>
        <button on:click={handleAuthSubmit}>{registerMode ? 'create account' : 'login'}</button>
      </section>
    {/if}

    {#if route.page === 'user' && userProfile}
      <section class="profile">
        <h2>User: {userProfile.user.username}</h2>
        <div>Created: {formatDate(userProfile.user.createdAt)}</div>
        <div>Karma: {userProfile.user.karma}</div>
        <div class="about">{userProfile.user.about}</div>
        <div class="profile-links">
          <a href={`#/threads?id=${userProfile.user.username}`}>threads</a>
          <span class="sep">|</span>
          <a href={`#/favorites?id=${userProfile.user.username}`}>favorites</a>
          <span class="sep">|</span>
          <a href={`#/hidden?id=${userProfile.user.username}`}>hidden</a>
        </div>
        <h3>Submissions</h3>
        <ol class="item-list">
          {#each userProfile.submissions as item}
            <li class="item-row compact">
              <span class="rank">•</span>
              <div class="item-main">
                <a class="title" href={itemLink(item)} target={itemLinkTarget(item)} rel="noreferrer">{item.title}</a>
                <span class="domain">{item.domain ? `(${item.domain})` : ''}</span>
                <div class="subtext">
                  {item.score} points
                  <span class="sep">|</span>
                  <a href={`#/item?id=${item.id}`}>{item.descendants} comments</a>
                </div>
              </div>
            </li>
          {/each}
        </ol>
        <h3>Comments</h3>
        <div class="comment-list">
          {#each userProfile.comments as comment}
            <div class="comment-snippet">
              <div class="comment-meta">
                {comment.score} points by <span>{comment.by}</span>
                {timeAgo(comment.createdAt)}
              </div>
              <div class="comment-text">{comment.text}</div>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    {#if route.page === 'threads' && userThreads}
      <section class="threads">
        <h2>{userThreads.user.username}'s threads</h2>
        {#each userThreads.comments as comment}
          <div class="comment-snippet">
            <div class="comment-meta">
              {comment.score} points by <span>{comment.by}</span>
              {timeAgo(comment.createdAt)}
              {#if comment.rootTitle}
                <span class="sep">|</span>
                <a href={`#/item?id=${comment.rootId}`}>{comment.rootTitle}</a>
              {/if}
            </div>
            <div class="comment-text">{comment.text}</div>
          </div>
        {/each}
      </section>
    {/if}

    {#if route.page === 'favorites' && favorites}
      <section class="favorites">
        <h2>Favorites</h2>
        <ol class="item-list">
          {#each favorites as item}
            <li class="item-row compact">
              <span class="rank">•</span>
              <div class="item-main">
                <a class="title" href={itemLink(item)} target={itemLinkTarget(item)} rel="noreferrer">{item.title}</a>
                {#if item.domain}
                  <span class="domain">({item.domain})</span>
                {/if}
              </div>
            </li>
          {/each}
        </ol>
      </section>
    {/if}

    {#if route.page === 'hidden' && hiddenItems}
      <section class="hidden">
        <h2>Hidden</h2>
        <ol class="item-list">
          {#each hiddenItems as item}
            <li class="item-row compact">
              <span class="rank">•</span>
              <div class="item-main">
                <a class="title" href={itemLink(item)} target={itemLinkTarget(item)} rel="noreferrer">{item.title}</a>
                {#if item.domain}
                  <span class="domain">({item.domain})</span>
                {/if}
              </div>
            </li>
          {/each}
        </ol>
      </section>
    {/if}
  </main>

  <footer class="footer">
    <span>Hacker News clone — no past/best/classic archives.</span>
  </footer>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: Verdana, Geneva, sans-serif;
    font-size: 10pt;
    background: #f6f6ef;
    color: #000;
  }

  :global(a) {
    color: #000;
    text-decoration: none;
  }

  :global(a:hover) {
    text-decoration: underline;
  }

  .hn-app {
    max-width: 1100px;
    margin: 0 auto;
    background: #f6f6ef;
  }

  .topbar {
    background: #ff6600;
    color: #000;
    padding: 6px 10px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: bold;
  }

  .logo {
    border: 1px solid #fff;
    padding: 2px 6px;
    font-weight: bold;
    color: #fff;
    background: #ff6600;
  }

  .title {
    font-weight: bold;
  }

  .nav-links,
  .user-links {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    font-size: 10pt;
  }

  .user-links {
    margin-left: auto;
  }

  .sep {
    color: #828282;
    padding: 0 4px;
  }

  :global(.link-button) {
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    font: inherit;
    color: inherit;
    cursor: pointer;
  }

  :global(.link-button:hover) {
    text-decoration: underline;
  }

  .content {
    padding: 12px 16px 32px;
  }

  .item-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .item-row {
    display: flex;
    gap: 8px;
    padding: 6px 0;
  }

  .item-row.compact {
    padding: 4px 0;
  }

  .rank {
    width: 24px;
    color: #828282;
    text-align: right;
  }

  :global(.vote) {
    width: 16px;
    color: #ff6600;
  }

  .item-main {
    flex: 1;
  }

  .title {
    font-size: 10pt;
  }

  .domain {
    color: #828282;
    margin-left: 4px;
  }

  .subtext {
    color: #828282;
    font-size: 8pt;
    margin-top: 2px;
  }

  .subtext a {
    color: #828282;
  }

  .item-detail {
    margin-bottom: 30px;
  }

  .item-heading {
    display: flex;
    gap: 10px;
    margin-bottom: 8px;
  }

  .item-text {
    margin: 8px 0 16px;
    white-space: pre-wrap;
  }

  .comment-box textarea,
  .submit-form textarea,
  .edit-form textarea,
  .comment-form textarea {
    width: 100%;
    border: 1px solid #ccc;
    padding: 6px;
    font-family: Verdana, Geneva, sans-serif;
    font-size: 10pt;
  }

  input,
  select {
    width: 100%;
    padding: 6px;
    border: 1px solid #ccc;
    font-size: 10pt;
  }

  label {
    display: block;
    margin-bottom: 10px;
  }

  button {
    background: #ff6600;
    border: none;
    color: #fff;
    padding: 6px 12px;
    cursor: pointer;
  }

  .alert {
    padding: 8px;
    margin-bottom: 10px;
  }

  .alert.error {
    background: #ffe1e1;
    color: #900;
  }

  .loading {
    color: #828282;
    margin-bottom: 10px;
  }

  .comment-thread {
    margin-top: 16px;
  }

  :global(.comment) {
    margin-bottom: 14px;
  }

  :global(.comment-children) {
    margin-left: 20px;
    border-left: 1px solid #e0e0e0;
    padding-left: 10px;
  }

  :global(.comment-meta) {
    color: #828282;
    font-size: 8pt;
  }

  :global(.comment-text) {
    margin-top: 4px;
    font-size: 9pt;
  }

  .profile .about {
    margin: 8px 0 12px;
  }

  .comment-snippet {
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e0e0e0;
  }

  .comment-snippet .comment-text {
    margin-top: 4px;
  }

  .muted {
    color: #828282;
  }

  .footer {
    padding: 12px 16px;
    font-size: 8pt;
    color: #828282;
  }
</style>
