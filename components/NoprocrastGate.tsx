import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/session';
import { getUserByUsername } from '@/lib/db';

export async function NoprocrastGate({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) return <>{children}</>;

  const dbUser = getUserByUsername(user.username);
  if (!dbUser || !dbUser.noprocrast) return <>{children}</>;

  const cookieStore = await cookies();
  const npStart = cookieStore.get('np_start')?.value;
  const now = Date.now();

  if (!npStart) {
    // First visit — set the start cookie via a server action approach
    // Since we can't set cookies in server components directly during render,
    // we'll use a client component to handle this
    return (
      <>
        <NoprocrastCookieSetter maxvisit={dbUser.maxvisit} minaway={dbUser.minaway} />
        {children}
      </>
    );
  }

  const startTime = parseInt(npStart, 10);
  const maxVisitMs = dbUser.maxvisit * 60 * 1000;
  const minAwayMs = dbUser.minaway * 60 * 1000;
  const elapsed = now - startTime;

  if (elapsed <= maxVisitMs) {
    // Within allowed visit time
    return <>{children}</>;
  }

  // Exceeded max visit time — check if locked out
  const npLocked = cookieStore.get('np_locked')?.value;

  if (npLocked) {
    const lockedTime = parseInt(npLocked, 10);
    if (now - lockedTime < minAwayMs) {
      const remaining = Math.ceil((minAwayMs - (now - lockedTime)) / 60000);
      return (
        <div className="static-page">
          <p>You have exceeded your maxvisit time of {dbUser.maxvisit} minutes.</p>
          <p>Please come back in {remaining} minute{remaining !== 1 ? 's' : ''}.</p>
          <p style={{ fontSize: '8pt', color: '#828282', marginTop: '15px' }}>
            (noprocrast is enabled in your <a href={`/user?id=${user.username}`}>profile settings</a>)
          </p>
        </div>
      );
    }
    // Lock expired — reset visit
    return (
      <>
        <NoprocrastCookieSetter maxvisit={dbUser.maxvisit} minaway={dbUser.minaway} />
        {children}
      </>
    );
  }

  // Need to lock — exceeded time, first time hitting the limit
  return (
    <>
      <NoprocrastLockSetter minaway={dbUser.minaway} maxvisit={dbUser.maxvisit} />
      <div className="static-page">
        <p>You have exceeded your maxvisit time of {dbUser.maxvisit} minutes.</p>
        <p>Please come back in {dbUser.minaway} minute{dbUser.minaway !== 1 ? 's' : ''}.</p>
        <p style={{ fontSize: '8pt', color: '#828282', marginTop: '15px' }}>
          (noprocrast is enabled in your <a href={`/user?id=${user.username}`}>profile settings</a>)
        </p>
      </div>
    </>
  );
}

// Client component that sets the noprocrast start cookie
function NoprocrastCookieSetter({ maxvisit, minaway }: { maxvisit: number; minaway: number }) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if (!document.cookie.includes('np_start=')) {
            document.cookie = 'np_start=' + Date.now() + ';path=/;max-age=86400';
            document.cookie = 'np_maxvisit=${maxvisit};path=/;max-age=86400';
            document.cookie = 'np_minaway=${minaway};path=/;max-age=86400';
          }
          // Remove lock cookie if present
          document.cookie = 'np_locked=;path=/;max-age=0';
        `,
      }}
    />
  );
}

function NoprocrastLockSetter({ minaway, maxvisit }: { minaway: number; maxvisit: number }) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if (!document.cookie.includes('np_locked=')) {
            document.cookie = 'np_locked=' + Date.now() + ';path=/;max-age=86400';
          }
        `,
      }}
    />
  );
}
