import { getCurrentUser } from '@/lib/session';
import Link from 'next/link';

export async function Header() {
  const user = await getCurrentUser();

  return (
    <table className="header-table">
      <tbody>
        <tr>
          <td style={{ width: '18px', paddingRight: '4px' }}>
            <Link href="/">
              <span className="header-logo">
                <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '11pt' }}>Y</span>
              </span>
            </Link>
          </td>
          <td style={{ lineHeight: '12pt', height: '10px' }}>
            <span className="header-nav">
              <span className="header-site-name">
                <Link href="/">Hacker News</Link>
              </span>
              <span className="header-nav-links">
                <Link href="/newest">new</Link>
                {user && (
                  <>
                    <span className="header-nav-sep">|</span>
                    <Link href={`/threads?id=${user.username}`}>threads</Link>
                  </>
                )}
                <span className="header-nav-sep">|</span>
                <Link href="/newcomments">comments</Link>
                <span className="header-nav-sep">|</span>
                <Link href="/ask">ask</Link>
                <span className="header-nav-sep">|</span>
                <Link href="/show">show</Link>
                <span className="header-nav-sep">|</span>
                <Link href="/jobs">jobs</Link>
                <span className="header-nav-sep">|</span>
                <Link href="/submit">submit</Link>
              </span>
            </span>
          </td>
          <td className="header-right">
            {user ? (
              <span style={{ fontSize: '10pt' }}>
                <Link href={`/user?id=${user.username}`}>{user.username}</Link>
                {' '}
                <span className="header-nav-sep">({' '}
                  <Link href={`/user?id=${user.username}`} style={{ color: '#000' }}>
                    <UserKarma username={user.username} />
                  </Link>
                {' '})</span>
                {' '}
                <span className="header-nav-sep">|</span>
                {' '}
                <Link href="/logout">logout</Link>
              </span>
            ) : (
              <Link href="/login">login</Link>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

async function UserKarma({ username }: { username: string }) {
  // Import db dynamically to avoid issues
  const { getUserByUsername } = await import('@/lib/db');
  const user = getUserByUsername(username);
  return <>{user?.karma || 1}</>;
}
