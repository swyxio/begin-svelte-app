import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getUserByUsername, getUserFavorites, getUserVotesForItems, getItemById } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { StoryList } from '@/components/StoryList';
import { getPage, pageOffset, ITEMS_PER_PAGE, timeAgo } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';
import { VoteArrows } from '@/components/VoteArrows';

export default async function FavoritesPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const username = typeof params.id === 'string' ? params.id : '';
  if (!username) notFound();

  const profileUser = getUserByUsername(username);
  if (!profileUser) notFound();

  const page = getPage(params);
  const offset = pageOffset(page);
  const user = await getCurrentUser();

  const favorites = getUserFavorites(profileUser.id, ITEMS_PER_PAGE, offset);

  // Separate stories and comments
  const stories = favorites.filter(f => f.type !== 'comment');
  const comments = favorites.filter(f => f.type === 'comment');

  const userVotes = new Map<number, string>();
  if (user) {
    const votes = getUserVotesForItems(user.userId, favorites.map(f => f.id));
    for (const v of votes) {
      userVotes.set(v.item_id, v.direction);
    }
  }

  // Get story titles for comment favorites
  const storyTitles = new Map<number, string>();
  for (const comment of comments) {
    if (comment.story_id && !storyTitles.has(comment.story_id)) {
      const story = getItemById(comment.story_id);
      if (story) storyTitles.set(comment.story_id, story.title || '');
    }
  }

  return (
    <div>
      <div style={{ padding: '5px 0', fontSize: '10pt' }}>
        {username}&apos;s favorites
      </div>
      {stories.length > 0 && (
        <StoryList
          items={stories}
          page={page}
          startRank={offset + 1}
          userVotes={userVotes}
          currentUser={user}
          basePath={`/favorites?id=${encodeURIComponent(username)}`}
        />
      )}
      {comments.map((comment) => (
        <div key={comment.id} className="comment-list-item">
          <div className="comment-head">
            <Link href={`/user?id=${comment.by}`}>{comment.by}</Link>
            {' '}
            <Link href={`/item?id=${comment.id}`}>{timeAgo(comment.created_at)}</Link>
          </div>
          {comment.story_id && storyTitles.has(comment.story_id) && (
            <div className="comment-on-link">
              on: <Link href={`/item?id=${comment.story_id}`}>{storyTitles.get(comment.story_id)}</Link>
            </div>
          )}
          <div className="comment-body" style={{ fontSize: '9pt' }} dangerouslySetInnerHTML={{ __html: comment.text || '' }} />
        </div>
      ))}
      {favorites.length >= ITEMS_PER_PAGE && (
        <Pagination page={page} basePath={`/favorites?id=${encodeURIComponent(username)}`} />
      )}
    </div>
  );
}
