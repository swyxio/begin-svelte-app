import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { getItemById, unkillItem, getUserByUsername } from '@/lib/db';

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

  // Require 500+ karma to vouch
  const dbUser = getUserByUsername(user.username);
  if (!dbUser || dbUser.karma < 500) {
    const referer = request.headers.get('referer');
    return NextResponse.redirect(new URL(referer || '/', request.url));
  }

  const item = getItemById(itemId);
  if (!item || !item.dead) {
    const referer = request.headers.get('referer');
    return NextResponse.redirect(new URL(referer || '/', request.url));
  }

  // Vouch for the item (unkill it)
  unkillItem(itemId);

  const referer = request.headers.get('referer');
  return NextResponse.redirect(new URL(referer || `/item?id=${itemId}`, request.url));
}
