import { getActiveStories, getUserVotesForItems } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { StoryList } from '@/components/StoryList';
import { getPage, pageOffset, ITEMS_PER_PAGE } from '@/lib/utils';

export default async function ActivePage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const page = getPage(params);
  const offset = pageOffset(page);
  const user = await getCurrentUser();

  const stories = getActiveStories(ITEMS_PER_PAGE, offset);
  const visibleStories = stories.filter(s => s.dead === 0);

  const userVotes = new Map<number, string>();
  if (user) {
    const votes = getUserVotesForItems(user.userId, visibleStories.map(s => s.id));
    for (const v of votes) {
      userVotes.set(v.item_id, v.direction);
    }
  }

  return (
    <StoryList
      items={visibleStories}
      page={page}
      startRank={offset + 1}
      userVotes={userVotes}
      currentUser={user}
      basePath="/active"
    />
  );
}
