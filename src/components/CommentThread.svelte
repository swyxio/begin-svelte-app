<script>
  export let comment
  export let currentUser
  export let timeAgo
  export let onReply
  export let onVote
  export let onFavorite
  export let onFlag
  export let onEdit
  export let onDelete

  let showReply = false
  let replyText = ''
  let showEdit = false
  let editText = ''

  $: if (comment && !showEdit) {
    editText = comment.text || ''
  }

  $: renderedText = comment && comment.text
    ? escapeHtml(comment.text).replace(/\n/g, '<br>')
    : ''

  function escapeHtml (value) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function submitReply () {
    if (!replyText.trim()) return
    onReply(comment, replyText)
    replyText = ''
    showReply = false
  }

  function submitEdit () {
    if (!editText.trim()) return
    onEdit(comment, editText)
    showEdit = false
  }
</script>

<div class="comment">
  <div class="comment-header">
    {#if currentUser}
      <a class="vote" href="#" on:click|preventDefault={() => onVote(comment)}>{comment.voted ? '▲' : '△'}</a>
    {/if}
    <span class="comment-meta">
      {comment.score} points by
      {#if comment.by}
        <a href={`#/user?id=${comment.by}`}>{comment.by}</a>
      {:else}
        <span>unknown</span>
      {/if}
      {timeAgo(comment.createdAt)}
      {#if comment.editedAt}
        <span class="edited"> | edited</span>
      {/if}
    </span>
    {#if currentUser}
      <span class="comment-actions">
        {#if !comment.deleted}
          <a href="#" on:click|preventDefault={() => showReply = !showReply}>reply</a>
        {/if}
        {#if comment.canEdit}
          <span> | </span><a href="#" on:click|preventDefault={() => showEdit = !showEdit}>edit</a>
          <span> | </span><a href="#" on:click|preventDefault={() => onDelete(comment)}>delete</a>
        {:else}
          <span> | </span><a href="#" on:click|preventDefault={() => onFlag(comment)}>{comment.flagged ? 'flagged' : 'flag'}</a>
        {/if}
        <span> | </span><a href="#" on:click|preventDefault={() => onFavorite(comment)}>{comment.favorite ? 'unfavorite' : 'favorite'}</a>
      </span>
    {/if}
  </div>

  <div class="comment-text">
    {#if comment.deleted}
      <span class="deleted">[deleted]</span>
    {:else}
      {@html renderedText}
    {/if}
  </div>

  {#if showReply}
    <div class="comment-form">
      <textarea rows="4" bind:value={replyText}></textarea>
      <button on:click={submitReply}>reply</button>
    </div>
  {/if}

  {#if showEdit}
    <div class="comment-form">
      <textarea rows="4" bind:value={editText}></textarea>
      <button on:click={submitEdit}>save</button>
    </div>
  {/if}

  {#if comment.children && comment.children.length}
    <div class="comment-children">
      {#each comment.children as child}
        <svelte:self
          comment={child}
          currentUser={currentUser}
          timeAgo={timeAgo}
          onReply={onReply}
          onVote={onVote}
          onFavorite={onFavorite}
          onFlag={onFlag}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      {/each}
    </div>
  {/if}
</div>
