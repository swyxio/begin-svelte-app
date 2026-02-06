import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { getItemById, deleteItem, getChildComments, incrementDescendants } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { searchParams } = new URL(request.url);
  const itemId = parseInt(searchParams.get('id') || '', 10);
  const confirm = searchParams.get('confirm') === 'true';

  if (isNaN(itemId)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const item = getItemById(itemId);
  if (!item) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Can only delete own items
  if (item.by !== user.username) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Can only delete comments (not stories)
  if (item.type !== 'comment') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Can only delete within a short window (15 minutes) and if no replies
  const ageMs = Date.now() - new Date(item.created_at + 'Z').getTime();
  if (ageMs > 15 * 60 * 1000) {
    const referer = request.headers.get('referer');
    return NextResponse.redirect(new URL(referer || '/', request.url));
  }

  // Check for child comments
  const children = getChildComments(item.id);
  if (children.length > 0) {
    const referer = request.headers.get('referer');
    return NextResponse.redirect(new URL(referer || '/', request.url));
  }

  if (confirm) {
    deleteItem(itemId);
    // Decrement parent story's descendant count
    if (item.story_id) {
      incrementDescendants(item.story_id, -1);
    }
    return NextResponse.redirect(new URL(item.story_id ? `/item?id=${item.story_id}` : '/', request.url));
  }

  // Show confirmation (redirect to item page with delete option)
  return NextResponse.redirect(new URL(`/item?id=${itemId}`, request.url));
}
