import { redirect } from 'next/navigation';
import { getUserHidden, getUserVotesForItems } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { StoryList } from '@/components/StoryList';
import { getPage, pageOffset, ITEMS_PER_PAGE } from '@/lib/utils';

export default async function HiddenPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/login?goto=/hidden');

  const page = getPage(params);
  const offset = pageOffset(page);

  const hiddenItems = getUserHidden(user.userId, ITEMS_PER_PAGE, offset);

  const userVotes = new Map<number, string>();
  if (user) {
    const votes = getUserVotesForItems(user.userId, hiddenItems.map(s => s.id));
    for (const v of votes) {
      userVotes.set(v.item_id, v.direction);
    }
  }

  return (
    <div>
      <div style={{ padding: '5px 0', fontSize: '10pt' }}>
        Hidden submissions
      </div>
      <StoryList
        items={hiddenItems}
        page={page}
        startRank={offset + 1}
        userVotes={userVotes}
        currentUser={user}
        basePath="/hidden"
      />
    </div>
  );
}
