'use client';

import { useState } from 'react';

interface VoteArrowsProps {
  itemId: number;
  currentVote: string | null;
  itemType: 'story' | 'comment';
  canDownvote?: boolean;
}

export function VoteArrows({ itemId, currentVote, itemType, canDownvote = false }: VoteArrowsProps) {
  const [vote, setVote] = useState(currentVote);
  const [loading, setLoading] = useState(false);

  async function handleVote(direction: 'up' | 'down' | 'un') {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, how: direction }),
      });
      if (res.ok) {
        if (direction === 'un') {
          setVote(null);
        } else {
          setVote(direction);
        }
      }
    } catch (e) {
      console.error('Vote failed:', e);
    }
    setLoading(false);
  }

  return (
    <div style={{ textAlign: 'center' }}>
      {vote !== 'up' ? (
        <div
          className="vote-arrow-up"
          onClick={() => handleVote('up')}
          title="upvote"
        />
      ) : (
        <div
          className="vote-arrow-up voted"
          onClick={() => handleVote('un')}
          title="unvote"
        />
      )}
      {itemType === 'comment' && canDownvote && vote !== 'down' && (
        <div
          className="vote-arrow-down"
          onClick={() => handleVote('down')}
          title="downvote"
        />
      )}
      {itemType === 'comment' && canDownvote && vote === 'down' && (
        <div
          className="vote-arrow-down voted"
          onClick={() => handleVote('un')}
          title="unvote"
        />
      )}
    </div>
  );
}
