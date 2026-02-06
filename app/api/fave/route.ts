import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { getItemById, addFavorite, removeFavorite, isFavorite } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { searchParams } = new URL(request.url);
  const itemId = parseInt(searchParams.get('id') || '', 10);
  const un = searchParams.get('un') === 'true';

  if (isNaN(itemId)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const item = getItemById(itemId);
  if (!item) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (un) {
    removeFavorite(user.userId, itemId);
  } else {
    if (isFavorite(user.userId, itemId)) {
      removeFavorite(user.userId, itemId); // Toggle: unfavorite
    } else {
      addFavorite(user.userId, itemId);
    }
  }

  const referer = request.headers.get('referer');
  return NextResponse.redirect(new URL(referer || `/item?id=${itemId}`, request.url));
}
