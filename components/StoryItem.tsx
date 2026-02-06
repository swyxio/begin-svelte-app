import Link from 'next/link';
import { DbItem } from '@/lib/db';
import { extractDomain, timeAgo } from '@/lib/utils';
import { VoteArrows } from './VoteArrows';

interface StoryItemProps {
  item: DbItem;
  rank?: number;
  userVote?: string | null; // 'up', 'down', or null
  currentUser?: { userId: number; username: string } | null;
  showText?: boolean;
}

export function StoryItem({ item, rank, userVote, currentUser, showText }: StoryItemProps) {
  const domain = item.url ? extractDomain(item.url) : null;
  const isJob = item.type === 'job';
  const titleUrl = item.url || `/item?id=${item.id}`;
  const isDead = item.dead === 1;

  return (
    <div className={isDead ? 'dead-item' : ''}>
      <table style={{ borderSpacing: 0, padding: 0 }}>
        <tbody>
          <tr className="story-row">
            {rank !== undefined && (
              <td className="story-rank">{rank}.</td>
            )}
            <td className="story-vote-cell">
              {!isJob && (!currentUser || currentUser.username !== item.by) ? (
                <VoteArrows
                  itemId={item.id}
                  currentVote={userVote || null}
                  itemType="story"
                  isLoggedIn={!!currentUser}
                />
              ) : (
                <span className="vote-spacer" />
              )}
            </td>
            <td className="story-title-cell">
              <span className="story-title">
                <a href={titleUrl} className="story-link">
                  {isDead && <span className="dead-tag">[dead] </span>}
                  {item.title}
                </a>
              </span>
              {domain && (
                <span className="story-domain">
                  (<Link href={`/from?site=${domain}`}>{domain}</Link>)
                </span>
              )}
            </td>
          </tr>
        </tbody>
      </table>
      <table style={{ borderSpacing: 0, padding: 0 }}>
        <tbody>
          <tr>
            {rank !== undefined && <td style={{ minWidth: '28px' }}></td>}
            <td style={{ width: '14px' }}></td>
            <td className="story-subtext">
              {!isJob ? (
                <>
                  {`${item.score} point${item.score !== 1 ? 's' : ''} by `}
                  <Link href={`/user?id=${item.by}`}>{item.by}</Link>{' '}
                  <Link href={`/item?id=${item.id}`}>{timeAgo(item.created_at)}</Link>
                  {' | '}
                  {currentUser && (
                    <>
                      {userVote === 'up' && (
                        <>
                          <a href={`/api/vote?id=${item.id}&how=un`} className="unvote-link">unvote</a>
                          {' | '}
                        </>
                      )}
                      <a href={`/api/hide?id=${item.id}`}>hide</a>
                      {' | '}
                      <a href={`/api/fave?id=${item.id}`}>favorite</a>
                      {' | '}
                    </>
                  )}
                  <Link href={`/item?id=${item.id}`}>
                    {item.descendants === 0 ? 'discuss' : `${item.descendants} comment${item.descendants !== 1 ? 's' : ''}`}
                  </Link>
                </>
              ) : (
                <Link href={`/item?id=${item.id}`}>{timeAgo(item.created_at)}</Link>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
