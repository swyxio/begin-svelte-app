'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DbItem } from '@/lib/db';
import { timeAgo } from '@/lib/utils';
import { VoteArrows } from './VoteArrows';

interface CommentItemProps {
  comment: DbItem;
  depth: number;
  userVote?: string | null;
  currentUser?: { userId: number; username: string } | null;
  canDownvote?: boolean;
  showContext?: boolean;
  storyTitle?: string;
  showDead?: boolean;
}

export function CommentItem({
  comment,
  depth,
  userVote = null,
  currentUser = null,
  canDownvote = false,
  showContext = false,
  storyTitle,
  showDead = false,
}: CommentItemProps) {
  const [collapsed, setCollapsed] = useState(false);
  const isDead = comment.dead === 1;
  const isDeleted = comment.deleted === 1;
  const indent = depth * 40;

  // Don't render dead items unless showDead is on
  if (isDead && !showDead && !currentUser) return null;

  // Check time-based capabilities
  const commentAge = Date.now() - new Date(comment.created_at + 'Z').getTime();
  const canEdit = currentUser?.username === comment.by && commentAge < 2 * 60 * 60 * 1000;
  const canDelete = currentUser?.username === comment.by && commentAge < 15 * 60 * 1000;
  const isOwnComment = currentUser?.username === comment.by;

  return (
    <div
      className={`comment-item ${collapsed ? 'comment-collapsed' : ''} ${isDead ? 'comment-dead' : ''}`}
      style={{ marginLeft: `${indent}px` }}
    >
      <div className="comment-head">
        <table style={{ borderSpacing: 0 }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'top', paddingRight: '4px' }}>
                {!isDeleted && !isOwnComment ? (
                  <VoteArrows
                    itemId={comment.id}
                    currentVote={userVote}
                    itemType="comment"
                    canDownvote={canDownvote}
                    isLoggedIn={!!currentUser}
                  />
                ) : (
                  <span className="vote-spacer" />
                )}
              </td>
              <td>
                {!isDeleted ? (
                  <>
                    <Link href={`/user?id=${comment.by}`} className="hn-user">{comment.by}</Link>
                    {' '}
                    <Link href={`/item?id=${comment.id}`}>{timeAgo(comment.created_at)}</Link>
                    {isDead && <span className="dead-tag"> [dead]</span>}
                    {currentUser && userVote === 'up' && (
                      <> | <a href={`/api/vote?id=${comment.id}&how=un`} className="unvote-link">unvote</a></>
                    )}
                    {isDead && showDead && currentUser && (
                      <> | <a href={`/api/vouch?id=${comment.id}`} style={{ color: '#828282', fontSize: '8pt' }}>vouch</a></>
                    )}
                    {currentUser && !isOwnComment && !isDead && (
                      <> | <a href={`/api/flag?id=${comment.id}`} style={{ color: '#828282', fontSize: '8pt' }}>flag</a></>
                    )}
                  </>
                ) : (
                  <span style={{ color: '#828282' }}>[deleted]</span>
                )}
                {' '}
                <button
                  className="toggle-btn"
                  onClick={() => setCollapsed(!collapsed)}
                >
                  [{collapsed ? '+' : '\u2013'}]
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {!collapsed && (
        <>
          {showContext && storyTitle && (
            <div className="comment-on-link">
              on: <Link href={`/item?id=${comment.story_id}`}>{storyTitle}</Link>
            </div>
          )}
          {!isDeleted && (
            <div
              className={`comment-body ${comment.score < 1 ? 'comment-score-negative' : ''}`}
              dangerouslySetInnerHTML={{ __html: comment.text || '' }}
            />
          )}
          {!isDeleted && (
            <div className="comment-reply">
              <Link href={`/reply?id=${comment.id}`}>reply</Link>
              {canEdit && (
                <> | <Link href={`/edit?id=${comment.id}`}>edit</Link></>
              )}
              {canDelete && (
                <> | <a href={`/api/delete?id=${comment.id}&confirm=true`}>delete</a></>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
