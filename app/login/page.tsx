import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { handleLogin, handleRegister } from './actions';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const goto = (typeof params.goto === 'string' ? params.goto : '/') || '/';
  const creating = params.creating === 'true';
  const user = await getCurrentUser();
  if (user) redirect(goto);

  const error = typeof params.error === 'string' ? params.error : null;

  return (
    <div className="login-page">
      {creating ? (
        <>
          <b>Create Account</b>
          {error && <div className="login-error">{error}</div>}
          <form action={handleRegister}>
            <input type="hidden" name="goto" value={goto} />
            <table>
              <tbody>
                <tr>
                  <td>username:</td>
                  <td><input type="text" name="acct" autoFocus autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} /></td>
                </tr>
                <tr>
                  <td>password:</td>
                  <td><input type="password" name="pw" /></td>
                </tr>
              </tbody>
            </table>
            <br />
            <input type="submit" value="create account" />
          </form>
        </>
      ) : (
        <>
          <b>Login</b>
          {error && <div className="login-error">{error}</div>}
          <form action={handleLogin}>
            <input type="hidden" name="goto" value={goto} />
            <table>
              <tbody>
                <tr>
                  <td>username:</td>
                  <td><input type="text" name="acct" autoFocus autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} /></td>
                </tr>
                <tr>
                  <td>password:</td>
                  <td><input type="password" name="pw" /></td>
                </tr>
              </tbody>
            </table>
            <br />
            <input type="submit" value="login" />
          </form>
          <br />
          <a href={`/login?creating=true&goto=${encodeURIComponent(goto)}`}>Create Account</a>
        </>
      )}
    </div>
  );
}
