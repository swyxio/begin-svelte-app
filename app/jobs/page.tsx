import { getStories } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { StoryList } from '@/components/StoryList';
import { getPage, pageOffset, ITEMS_PER_PAGE } from '@/lib/utils';

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const page = getPage(params);
  const offset = pageOffset(page);
  const user = await getCurrentUser();

  const jobs = getStories({
    type: 'job',
    limit: ITEMS_PER_PAGE,
    offset,
    orderBy: 'i.created_at DESC',
  });

  return (
    <StoryList
      items={jobs}
      page={page}
      startRank={offset + 1}
      currentUser={user}
      basePath="/jobs"
    />
  );
}
