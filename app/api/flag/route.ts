import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { getItemById, addFlag, isFlagged, getFlagCount, killItem } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { searchParams } = new URL(request.url);
  const itemId = parseInt(searchParams.get('id') || '', 10);

  if (isNaN(itemId)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const item = getItemById(itemId);
  if (!item) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Can't flag own items
  if (item.by === user.username) {
    const referer = request.headers.get('referer');
    return NextResponse.redirect(new URL(referer || '/', request.url));
  }

  if (!isFlagged(user.userId, itemId)) {
    addFlag(user.userId, itemId);

    // Check if item should be killed (5+ flags)
    const flagCount = getFlagCount(itemId);
    if (flagCount >= 5) {
      killItem(itemId);
    }
  }

  const referer = request.headers.get('referer');
  return NextResponse.redirect(new URL(referer || `/item?id=${itemId}`, request.url));
}
