import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getItemById, getCommentsByStory, getUserVotesForItems, getUserByUsername, DbItem } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { extractDomain, timeAgo } from '@/lib/utils';
import { formatHnText } from '@/lib/format';
import { CommentTree, buildCommentTree } from '@/components/CommentTree';
import { VoteArrows } from '@/components/VoteArrows';

export default async function ItemPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const id = parseInt(params.id as string, 10);
  if (isNaN(id)) notFound();

  const item = getItemById(id);
  if (!item || item.deleted === 1) notFound();

  const user = await getCurrentUser();
  const isComment = item.type === 'comment';

  if (isComment) {
    return <CommentItemPage item={item} user={user} />;
  }

  // It's a story or job
  const comments = getCommentsByStory(item.id);
  const commentTree = buildCommentTree(comments);
  const topLevelComments = commentTree.get(item.id) || [];

  // Get vote states
  const allItemIds = [item.id, ...comments.map(c => c.id)];
  const userVotes = new Map<number, string>();
  let canDownvote = false;
  if (user) {
    const votes = getUserVotesForItems(user.userId, allItemIds);
    for (const v of votes) {
      userVotes.set(v.item_id, v.direction);
    }
    const dbUser = getUserByUsername(user.username);
    canDownvote = (dbUser?.karma || 0) >= 500;
  }

  const domain = item.url ? extractDomain(item.url) : null;
  const formattedText = item.text ? formatHnText(item.text) : null;

  async function handleComment(formData: FormData) {
    'use server';
    const currentUser = await (await import('@/lib/session')).getCurrentUser();
    if (!currentUser) redirect('/login');

    const text = (formData.get('text') as string || '').trim();
    if (!text) redirect(`/item?id=${id}`);

    const { createItem, incrementDescendants } = await import('@/lib/db');
    const { formatHnText } = await import('@/lib/format');

    createItem({
      type: 'comment',
      by: currentUser.username,
      text: formatHnText(text),
      parent_id: id,
      story_id: id,
    });

    incrementDescendants(id);
    redirect(`/item?id=${id}`);
  }

  return (
    <div>
      <div className="item-header">
        <table style={{ borderSpacing: 0 }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'top', paddingRight: '4px' }}>
                {item.type !== 'job' && user && user.username !== item.by ? (
                  <VoteArrows
                    itemId={item.id}
                    currentVote={userVotes.get(item.id) || null}
                    itemType="story"
                  />
                ) : (
                  <span className="vote-spacer" />
                )}
              </td>
              <td>
                <span className="story-title">
                  {item.url ? (
                    <a href={item.url} className="story-link">{item.title}</a>
                  ) : (
                    <span className="story-link">{item.title}</span>
                  )}
                </span>
                {domain && (
                  <span className="story-domain">
                    (<Link href={`/from?site=${domain}`}>{domain}</Link>)
                  </span>
                )}
                <br />
                <span className="story-subtext">
                  {item.type !== 'job' && (
                    <>
                      {item.score} point{item.score !== 1 ? 's' : ''} by{' '}
                      <Link href={`/user?id=${item.by}`}>{item.by}</Link>{' '}
                      {timeAgo(item.created_at)}
                      {user && userVotes.get(item.id) === 'up' && (
                        <> | <a href={`/api/vote?id=${item.id}&how=un`} className="unvote-link">unvote</a></>
                      )}
                      {user && (
                        <> | <a href={`/api/hide?id=${item.id}`}>hide</a></>
                      )}
                      {user && (
                        <> | <a href={`/api/fave?id=${item.id}`}>favorite</a></>
                      )}
                    </>
                  )}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {formattedText && (
        <div className="item-text" dangerouslySetInnerHTML={{ __html: formattedText }} />
      )}
      {user && item.type !== 'job' && (
        <div className="comment-form">
          <form action={handleComment}>
            <textarea name="text" rows={8} cols={80}></textarea>
            <br />
            <input type="submit" value="add comment" />
          </form>
        </div>
      )}
      <CommentTree
        comments={topLevelComments}
        allComments={commentTree}
        userVotes={userVotes}
        currentUser={user}
        canDownvote={canDownvote}
      />
    </div>
  );
}

async function CommentItemPage({ item, user }: { item: DbItem; user: { userId: number; username: string } | null }) {
  // Show a comment with parent context
  const parentItem = item.parent_id ? getItemById(item.parent_id) : null;
  const storyItem = item.story_id ? getItemById(item.story_id) : null;

  const formattedText = item.text || '';

  const userVotes = new Map<number, string>();
  let canDownvote = false;
  if (user) {
    const votes = getUserVotesForItems(user.userId, [item.id]);
    for (const v of votes) {
      userVotes.set(v.item_id, v.direction);
    }
    const dbUser = getUserByUsername(user.username);
    canDownvote = (dbUser?.karma || 0) >= 500;
  }

  // Check edit window
  const commentAge = Date.now() - new Date(item.created_at + 'Z').getTime();
  const canEdit = user?.username === item.by && commentAge < 2 * 60 * 60 * 1000;

  async function handleReply(formData: FormData) {
    'use server';
    const currentUser = await (await import('@/lib/session')).getCurrentUser();
    if (!currentUser) redirect('/login');

    const text = (formData.get('text') as string || '').trim();
    if (!text) redirect(`/item?id=${item.id}`);

    const { createItem, incrementDescendants } = await import('@/lib/db');
    const { formatHnText } = await import('@/lib/format');

    createItem({
      type: 'comment',
      by: currentUser.username,
      text: formatHnText(text),
      parent_id: item.id,
      story_id: item.story_id || item.id,
    });

    if (item.story_id) incrementDescendants(item.story_id);
    redirect(`/item?id=${item.id}`);
  }

  return (
    <div>
      <div className="comment-item">
        <div className="comment-head">
          <table style={{ borderSpacing: 0 }}>
            <tbody>
              <tr>
                <td style={{ verticalAlign: 'top', paddingRight: '4px' }}>
                  {user && user.username !== item.by ? (
                    <VoteArrows
                      itemId={item.id}
                      currentVote={userVotes.get(item.id) || null}
                      itemType="comment"
                      canDownvote={canDownvote}
                    />
                  ) : (
                    <span className="vote-spacer" />
                  )}
                </td>
                <td>
                  <Link href={`/user?id=${item.by}`}>{item.by}</Link>
                  {' '}
                  {timeAgo(item.created_at)}
                  {userVotes.get(item.id) === 'up' && user && (
                    <> | <a href={`/api/vote?id=${item.id}&how=un`} className="unvote-link">unvote</a></>
                  )}
                  {user && (
                    <> | <a href={`/api/fave?id=${item.id}`}>favorite</a></>
                  )}
                  {canEdit && (
                    <> | <Link href={`/edit?id=${item.id}`}>edit</Link></>
                  )}
                  {user && (
                    <> | <a href={`/api/flag?id=${item.id}`}>flag</a></>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="comment-body" dangerouslySetInnerHTML={{ __html: formattedText }} />
      </div>
      {storyItem && (
        <div style={{ padding: '5px 0', fontSize: '8pt', color: '#828282' }}>
          on: <Link href={`/item?id=${storyItem.id}`}>{storyItem.title}</Link>
        </div>
      )}
      {parentItem && parentItem.id !== (storyItem?.id || 0) && (
        <div style={{ padding: '2px 0', fontSize: '8pt', color: '#828282' }}>
          <Link href={`/item?id=${parentItem.id}`}>parent</Link>
        </div>
      )}
      {user && (
        <div className="comment-form">
          <form action={handleReply}>
            <textarea name="text" rows={8} cols={80}></textarea>
            <br />
            <input type="submit" value="reply" />
          </form>
        </div>
      )}
    </div>
  );
}
