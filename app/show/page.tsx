import { getStories, getUserVotesForItems } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { rankStories } from '@/lib/ranking';
import { StoryList } from '@/components/StoryList';
import { getPage, pageOffset, ITEMS_PER_PAGE } from '@/lib/utils';

export default async function ShowPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const page = getPage(params);
  const user = await getCurrentUser();

  const stories = getStories({
    type: 'story',
    titlePrefix: 'Show HN',
    limit: ITEMS_PER_PAGE * 3,
    offset: 0,
    excludeHiddenFor: user?.userId,
  });

  const visibleStories = stories.filter(s => s.dead === 0);
  const ranked = rankStories(visibleStories);

  const start = pageOffset(page);
  const pageItems = ranked.slice(start, start + ITEMS_PER_PAGE);

  const userVotes = new Map<number, string>();
  if (user) {
    const votes = getUserVotesForItems(user.userId, pageItems.map(s => s.id));
    for (const v of votes) {
      userVotes.set(v.item_id, v.direction);
    }
  }

  return (
    <StoryList
      items={pageItems}
      page={page}
      startRank={start + 1}
      userVotes={userVotes}
      currentUser={user}
      basePath="/show"
    />
  );
}
