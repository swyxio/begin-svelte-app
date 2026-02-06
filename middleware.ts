import { NextRequest, NextResponse } from 'next/server';

// Noprocrast middleware
// When enabled in user settings, limits visit duration to maxvisit minutes
// with minaway minutes between visits
export function middleware(request: NextRequest) {
  // Only apply to page routes, not API or static
  const path = request.nextUrl.pathname;
  if (path.startsWith('/api/') || path.startsWith('/_next/') || path.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // Check for noprocrast cookie
  const npStart = request.cookies.get('np_start')?.value;
  const npMaxvisit = request.cookies.get('np_maxvisit')?.value;
  const npMinaway = request.cookies.get('np_minaway')?.value;
  const npEnabled = request.cookies.get('np_enabled')?.value;

  if (npEnabled !== '1' || !npStart || !npMaxvisit || !npMinaway) {
    return NextResponse.next();
  }

  const startTime = parseInt(npStart, 10);
  const maxVisitMs = parseInt(npMaxvisit, 10) * 60 * 1000;
  const minAwayMs = parseInt(npMinaway, 10) * 60 * 1000;
  const now = Date.now();
  const elapsed = now - startTime;

  if (elapsed > maxVisitMs) {
    // Check if enough time has passed for minaway
    const npLocked = request.cookies.get('np_locked')?.value;
    if (npLocked) {
      const lockedTime = parseInt(npLocked, 10);
      if (now - lockedTime < minAwayMs) {
        // Still locked out
        const remaining = Math.ceil((minAwayMs - (now - lockedTime)) / 60000);
        return new NextResponse(
          `<html><body style="font-family:Verdana;font-size:10pt;padding:40px;">
            <p>You have exceeded your maxvisit time. Please come back in ${remaining} minutes.</p>
            <p>(noprocrast is enabled in your profile settings)</p>
          </body></html>`,
          { 
            headers: { 'Content-Type': 'text/html' },
            status: 200 
          }
        );
      }
    }

    // Lock the user out and set lock time
    const response = NextResponse.next();
    if (!npLocked) {
      response.cookies.set('np_locked', String(now), { path: '/', maxAge: 86400 });
    }
    return new NextResponse(
      `<html><body style="font-family:Verdana;font-size:10pt;padding:40px;">
        <p>You have exceeded your maxvisit time. Please come back in ${Math.ceil(minAwayMs / 60000)} minutes.</p>
        <p>(noprocrast is enabled in your profile settings)</p>
      </body></html>`,
      { 
        headers: { 'Content-Type': 'text/html' },
        status: 200 
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
