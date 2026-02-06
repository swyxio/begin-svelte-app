import { redirect, notFound } from 'next/navigation';
import { getUserByUsername, getUserUpvotedItems, getUserVotesForItems } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { StoryList } from '@/components/StoryList';
import { getPage, pageOffset, ITEMS_PER_PAGE } from '@/lib/utils';

export default async function UpvotedPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const username = typeof params.id === 'string' ? params.id : '';
  if (!username) notFound();

  const user = await getCurrentUser();

  // Only visible to the user themselves
  if (!user || user.username.toLowerCase() !== username.toLowerCase()) {
    return (
      <div className="static-page">
        <p>Can&apos;t display that.</p>
      </div>
    );
  }

  const profileUser = getUserByUsername(username);
  if (!profileUser) notFound();

  const page = getPage(params);
  const offset = pageOffset(page);

  const upvotedItems = getUserUpvotedItems(profileUser.id, ITEMS_PER_PAGE, offset);
  const stories = upvotedItems.filter(i => i.type !== 'comment');

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
        {username}&apos;s upvoted submissions
      </div>
      <StoryList
        items={stories}
        page={page}
        startRank={offset + 1}
        userVotes={userVotes}
        currentUser={user}
        basePath={`/upvoted?id=${encodeURIComponent(username)}`}
      />
    </div>
  );
}
