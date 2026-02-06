import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getComments, getUserByUsername, getItemById, getUserVotesForItems } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { getPage, pageOffset, ITEMS_PER_PAGE, timeAgo } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';
import { VoteArrows } from '@/components/VoteArrows';

export default async function ThreadsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const username = typeof params.id === 'string' ? params.id : '';
  if (!username) notFound();

  const profileUser = getUserByUsername(username);
  if (!profileUser) notFound();

  const page = getPage(params);
  const offset = pageOffset(page);
  const user = await getCurrentUser();

  const comments = getComments({
    byUser: username,
    limit: ITEMS_PER_PAGE,
    offset,
    orderBy: 'created_at DESC',
  });

  const visibleComments = comments.filter(c => c.dead === 0);

  const userVotes = new Map<number, string>();
  let canDownvote = false;
  if (user) {
    const votes = getUserVotesForItems(user.userId, visibleComments.map(c => c.id));
    for (const v of votes) {
      userVotes.set(v.item_id, v.direction);
    }
    const dbUser = getUserByUsername(user.username);
    canDownvote = (dbUser?.karma || 0) >= 500;
  }

  const storyTitles = new Map<number, string>();
  for (const comment of visibleComments) {
    if (comment.story_id && !storyTitles.has(comment.story_id)) {
      const story = getItemById(comment.story_id);
      if (story) storyTitles.set(comment.story_id, story.title || '');
    }
  }

  return (
    <div>
      <div style={{ padding: '5px 0', fontSize: '10pt' }}>
        {username}&apos;s comments
      </div>
      {visibleComments.map((comment) => (
        <div key={comment.id} className="comment-list-item">
          <div className="comment-head">
            <table style={{ borderSpacing: 0 }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: 'top', paddingRight: '4px' }}>
                    {user && user.username !== comment.by ? (
                      <VoteArrows
                        itemId={comment.id}
                        currentVote={userVotes.get(comment.id) || null}
                        itemType="comment"
                        canDownvote={canDownvote}
                      />
                    ) : (
                      <span className="vote-spacer" />
                    )}
                  </td>
                  <td>
                    <Link href={`/user?id=${comment.by}`}>{comment.by}</Link>
                    {' '}
                    <Link href={`/item?id=${comment.id}`}>{timeAgo(comment.created_at)}</Link>
                    {' | '}
                    <Link href={`/item?id=${comment.parent_id}`}>parent</Link>
                    {userVotes.get(comment.id) === 'up' && user && (
                      <> | <a href={`/api/vote?id=${comment.id}&how=un`} className="unvote-link">unvote</a></>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {comment.story_id && storyTitles.has(comment.story_id) && (
            <div className="comment-on-link">
              on: <Link href={`/item?id=${comment.story_id}`}>{storyTitles.get(comment.story_id)}</Link>
            </div>
          )}
          <div className="comment-body" style={{ fontSize: '9pt' }} dangerouslySetInnerHTML={{ __html: comment.text || '' }} />
          <div className="comment-reply">
            <Link href={`/reply?id=${comment.id}`}>reply</Link>
          </div>
        </div>
      ))}
      {visibleComments.length >= ITEMS_PER_PAGE && (
        <Pagination page={page} basePath={`/threads?id=${encodeURIComponent(username)}`} />
      )}
    </div>
  );
}
