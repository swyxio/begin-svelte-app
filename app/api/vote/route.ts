import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { getItemById, getVote, addVote, removeVote, updateItemScore, updateUserKarma, getUserByUsername } from '@/lib/db';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { id, how } = body;
  const itemId = parseInt(id, 10);

  if (isNaN(itemId)) {
    return NextResponse.json({ error: 'Invalid item id' }, { status: 400 });
  }

  const item = getItemById(itemId);
  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  // Can't vote on own items
  if (item.by === user.username) {
    return NextResponse.json({ error: "Can't vote on your own items" }, { status: 403 });
  }

  const existingVote = getVote(user.userId, itemId);

  if (how === 'un') {
    // Unvote
    if (existingVote) {
      const delta = existingVote.direction === 'up' ? -1 : 1;
      updateItemScore(itemId, delta);
      updateUserKarma(item.by, delta);
      removeVote(user.userId, itemId);
    }
    return NextResponse.json({ ok: true });
  }

  if (how === 'up') {
    // Upvote
    if (existingVote?.direction === 'up') {
      return NextResponse.json({ ok: true }); // Already upvoted
    }

    if (existingVote?.direction === 'down') {
      // Changing from down to up: +2 to score
      updateItemScore(itemId, 2);
      updateUserKarma(item.by, 2);
    } else {
      // New upvote: +1
      updateItemScore(itemId, 1);
      updateUserKarma(item.by, 1);
    }
    addVote(user.userId, itemId, 'up');
    return NextResponse.json({ ok: true });
  }

  if (how === 'down') {
    // Downvote - only on comments, requires 500+ karma
    if (item.type !== 'comment') {
      return NextResponse.json({ error: "Can't downvote stories" }, { status: 403 });
    }

    const dbUser = getUserByUsername(user.username);
    if (!dbUser || dbUser.karma < 500) {
      return NextResponse.json({ error: 'Need 500+ karma to downvote' }, { status: 403 });
    }

    // Can't downvote comments on own stories
    // Can't downvote comments older than 24 hours
    const commentAge = Date.now() - new Date(item.created_at + 'Z').getTime();
    if (commentAge > 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: "Can't downvote comments older than 24 hours" }, { status: 403 });
    }

    if (existingVote?.direction === 'down') {
      return NextResponse.json({ ok: true }); // Already downvoted
    }

    if (existingVote?.direction === 'up') {
      updateItemScore(itemId, -2);
      updateUserKarma(item.by, -2);
    } else {
      updateItemScore(itemId, -1);
      updateUserKarma(item.by, -1);
    }
    addVote(user.userId, itemId, 'down');
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid vote direction' }, { status: 400 });
}

// Also handle GET for link-based unvoting
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { searchParams } = new URL(request.url);
  const itemId = parseInt(searchParams.get('id') || '', 10);
  const how = searchParams.get('how');

  if (isNaN(itemId)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const item = getItemById(itemId);
  if (!item) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (how === 'un') {
    const existingVote = getVote(user.userId, itemId);
    if (existingVote) {
      const delta = existingVote.direction === 'up' ? -1 : 1;
      updateItemScore(itemId, delta);
      updateUserKarma(item.by, delta);
      removeVote(user.userId, itemId);
    }
  }

  // Redirect back to the referrer or item page
  const referer = request.headers.get('referer');
  return NextResponse.redirect(new URL(referer || `/item?id=${itemId}`, request.url));
}
