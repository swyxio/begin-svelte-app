import Link from 'next/link';
import { getDb, DbItem } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { StoryList } from '@/components/StoryList';
import { getUserVotesForItems } from '@/lib/db';
import { getPage, pageOffset, ITEMS_PER_PAGE, timeAgo } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const query = (typeof params.q === 'string' ? params.q : '').trim();
  const page = getPage(params);
  const offset = pageOffset(page);
  const user = await getCurrentUser();

  if (!query) {
    return (
      <div className="static-page">
        <p>Enter a search term.</p>
      </div>
    );
  }

  const db = getDb();
  const items = db.prepare(`
    SELECT * FROM items 
    WHERE deleted = 0 AND dead = 0 
    AND (title LIKE ? OR text LIKE ? OR by LIKE ?)
    ORDER BY score DESC, created_at DESC 
    LIMIT ? OFFSET ?
  `).all(`%${query}%`, `%${query}%`, `%${query}%`, ITEMS_PER_PAGE, offset) as DbItem[];

  const stories = items.filter(i => i.type !== 'comment');
  const comments = items.filter(i => i.type === 'comment');

  const userVotes = new Map<number, string>();
  if (user) {
    const votes = getUserVotesForItems(user.userId, stories.map(s => s.id));
    for (const v of votes) {
      userVotes.set(v.item_id, v.direction);
    }
  }

  return (
    <div>
      <div style={{ padding: '5px 0', fontSize: '10pt' }}>
        Search results for &quot;{query}&quot;
      </div>
      {items.length === 0 ? (
        <div className="static-page">
          <p>No results found.</p>
        </div>
      ) : (
        <>
          {stories.length > 0 && (
            <StoryList
              items={stories}
              page={page}
              startRank={offset + 1}
              userVotes={userVotes}
              currentUser={user}
              basePath={`/search?q=${encodeURIComponent(query)}`}
            />
          )}
          {comments.map((comment) => (
            <div key={comment.id} className="comment-list-item">
              <div className="comment-head">
                <Link href={`/user?id=${comment.by}`}>{comment.by}</Link>
                {' '}
                <Link href={`/item?id=${comment.id}`}>{timeAgo(comment.created_at)}</Link>
              </div>
              <div className="comment-body" style={{ fontSize: '9pt' }} dangerouslySetInnerHTML={{ __html: comment.text || '' }} />
            </div>
          ))}
          {items.length >= ITEMS_PER_PAGE && (
            <Pagination page={page} basePath={`/search?q=${encodeURIComponent(query)}`} />
          )}
        </>
      )}
    </div>
  );
}
