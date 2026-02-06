import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { getItemById, addHidden, removeHidden, isHidden } from '@/lib/db';

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
    removeHidden(user.userId, itemId);
  } else {
    addHidden(user.userId, itemId);
  }

  const referer = request.headers.get('referer');
  return NextResponse.redirect(new URL(referer || '/', request.url));
}
