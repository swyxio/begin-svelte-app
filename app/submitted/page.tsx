import { notFound } from 'next/navigation';
import { getStories, getUserByUsername, getUserVotesForItems } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { StoryList } from '@/components/StoryList';
import { getPage, pageOffset, ITEMS_PER_PAGE } from '@/lib/utils';

export default async function SubmittedPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const username = typeof params.id === 'string' ? params.id : '';
  if (!username) notFound();

  const profileUser = getUserByUsername(username);
  if (!profileUser) notFound();

  const page = getPage(params);
  const offset = pageOffset(page);
  const user = await getCurrentUser();

  const stories = getStories({
    byUser: username,
    limit: ITEMS_PER_PAGE,
    offset,
    orderBy: 'i.created_at DESC',
  });

  const visibleStories = stories.filter(s => s.dead === 0);

  const userVotes = new Map<number, string>();
  if (user) {
    const votes = getUserVotesForItems(user.userId, visibleStories.map(s => s.id));
    for (const v of votes) {
      userVotes.set(v.item_id, v.direction);
    }
  }

  return (
    <div>
      <div style={{ padding: '5px 0', fontSize: '10pt' }}>
        {username}&apos;s submissions
      </div>
      <StoryList
        items={visibleStories}
        page={page}
        startRank={offset + 1}
        userVotes={userVotes}
        currentUser={user}
        basePath={`/submitted?id=${encodeURIComponent(username)}`}
      />
    </div>
  );
}
