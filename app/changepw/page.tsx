import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { handleChangePw } from './actions';

export default async function ChangePwPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/login?goto=/changepw');

  const error = typeof params.error === 'string' ? params.error : null;
  const success = params.success === 'true';

  return (
    <div className="changepw-page">
      <b>Change Password</b>
      {error && <div className="login-error"><br />{error}</div>}
      {success && <div style={{ color: 'green', padding: '5px 0' }}><br />Password changed.</div>}
      <form action={handleChangePw}>
        <table>
          <tbody>
            <tr>
              <td>Current Password:</td>
              <td><input type="password" name="current" /></td>
            </tr>
            <tr>
              <td>New Password:</td>
              <td><input type="password" name="new" /></td>
            </tr>
            <tr>
              <td>Confirm:</td>
              <td><input type="password" name="confirm" /></td>
            </tr>
            <tr>
              <td></td>
              <td><input type="submit" value="change" /></td>
            </tr>
          </tbody>
        </table>
      </form>
    </div>
  );
}
