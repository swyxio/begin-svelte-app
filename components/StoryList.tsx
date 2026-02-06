import { DbItem } from '@/lib/db';
import { StoryItem } from './StoryItem';
import { Pagination } from './Pagination';

interface StoryListProps {
  items: DbItem[];
  page: number;
  startRank?: number;
  userVotes?: Map<number, string>;
  currentUser?: { userId: number; username: string } | null;
  basePath?: string;
  moreParams?: string;
}

export function StoryList({
  items,
  page,
  startRank = 1,
  userVotes = new Map(),
  currentUser = null,
  basePath = '/',
  moreParams = '',
}: StoryListProps) {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        No items to display.
      </div>
    );
  }

  return (
    <div className="story-list">
      {items.map((item, index) => (
        <StoryItem
          key={item.id}
          item={item}
          rank={startRank + index}
          userVote={userVotes.get(item.id) || null}
          currentUser={currentUser}
        />
      ))}
      {items.length >= 30 && (
        <Pagination page={page} basePath={basePath} moreParams={moreParams} />
      )}
    </div>
  );
}
