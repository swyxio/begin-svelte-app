import { NextRequest, NextResponse } from 'next/server';
import { logout } from '@/lib/auth';

export async function GET(request: NextRequest) {
  await logout();
  return NextResponse.redirect(new URL('/', request.url));
}
