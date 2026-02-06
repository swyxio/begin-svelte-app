import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getUserByUsername } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { formatDate } from '@/lib/utils';
import { formatHnText } from '@/lib/format';
import { handleUpdateProfile } from './actions';

export default async function UserPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const username = typeof params.id === 'string' ? params.id : '';
  if (!username) notFound();

  const profileUser = getUserByUsername(username);
  if (!profileUser) notFound();

  const currentUser = await getCurrentUser();
  const isOwnProfile = currentUser?.username?.toLowerCase() === profileUser.username.toLowerCase();

  if (isOwnProfile) {
    return (
      <div className="user-page">
        <form action={handleUpdateProfile}>
          <input type="hidden" name="username" value={profileUser.username} />
          <table>
            <tbody>
              <tr>
                <td>user:</td>
                <td>{profileUser.username}</td>
              </tr>
              <tr>
                <td>created:</td>
                <td>{formatDate(profileUser.created_at)}</td>
              </tr>
              <tr>
                <td>karma:</td>
                <td>{profileUser.karma}</td>
              </tr>
              <tr>
                <td>about:</td>
                <td>
                  <textarea name="about" rows={6} cols={60} defaultValue={profileUser.about}></textarea>
                  <div style={{ fontSize: '8pt', color: '#828282' }}>
                    <Link href="/formatdoc">formatting options</Link>
                  </div>
                </td>
              </tr>
              <tr>
                <td>email:</td>
                <td><input type="email" name="email" defaultValue={profileUser.email} size={60} /></td>
              </tr>
              <tr>
                <td>showdead:</td>
                <td>
                  <select name="showdead" defaultValue={profileUser.showdead ? 'yes' : 'no'}>
                    <option value="no">no</option>
                    <option value="yes">yes</option>
                  </select>
                </td>
              </tr>
              <tr>
                <td>noprocrast:</td>
                <td>
                  <select name="noprocrast" defaultValue={profileUser.noprocrast ? 'yes' : 'no'}>
                    <option value="no">no</option>
                    <option value="yes">yes</option>
                  </select>
                </td>
              </tr>
              <tr>
                <td>maxvisit:</td>
                <td><input type="text" name="maxvisit" defaultValue={profileUser.maxvisit} size={16} /></td>
              </tr>
              <tr>
                <td>minaway:</td>
                <td><input type="text" name="minaway" defaultValue={profileUser.minaway} size={16} /></td>
              </tr>
              <tr>
                <td>delay:</td>
                <td><input type="text" name="delay" defaultValue={profileUser.delay} size={16} /></td>
              </tr>
              <tr>
                <td></td>
                <td><input type="submit" value="update" /></td>
              </tr>
            </tbody>
          </table>
        </form>
        <div className="user-links">
          <Link href={`/submitted?id=${profileUser.username}`}>submissions</Link>
          {' | '}
          <Link href={`/threads?id=${profileUser.username}`}>comments</Link>
          {' | '}
          <Link href={`/favorites?id=${profileUser.username}`}>favorites</Link>
          {' | '}
          <Link href={`/upvoted?id=${profileUser.username}`}>upvoted submissions</Link>
          {' | '}
          <Link href="/hidden">hidden</Link>
          <br /><br />
          <Link href="/changepw">change password</Link>
        </div>
      </div>
    );
  }

  const aboutHtml = profileUser.about ? formatHnText(profileUser.about) : '';

  return (
    <div className="user-page">
      <table>
        <tbody>
          <tr>
            <td>user:</td>
            <td>{profileUser.username}</td>
          </tr>
          <tr>
            <td>created:</td>
            <td>{formatDate(profileUser.created_at)}</td>
          </tr>
          <tr>
            <td>karma:</td>
            <td>{profileUser.karma}</td>
          </tr>
          {aboutHtml && (
            <tr>
              <td>about:</td>
              <td dangerouslySetInnerHTML={{ __html: aboutHtml }} />
            </tr>
          )}
        </tbody>
      </table>
      <div className="user-links">
        <Link href={`/submitted?id=${profileUser.username}`}>submissions</Link>
        {' | '}
        <Link href={`/threads?id=${profileUser.username}`}>comments</Link>
        {' | '}
        <Link href={`/favorites?id=${profileUser.username}`}>favorites</Link>
      </div>
    </div>
  );
}
