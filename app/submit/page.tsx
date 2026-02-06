import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { submitStory } from './actions';

export default async function SubmitPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/login?goto=/submit');

  const error = typeof params.error === 'string' ? params.error : null;

  return (
    <div className="submit-page">
      {error && <div className="login-error">{error}</div>}
      <form action={submitStory}>
        <table>
          <tbody>
            <tr>
              <td>title</td>
              <td><input type="text" name="title" size={50} maxLength={80} /></td>
            </tr>
            <tr>
              <td>url</td>
              <td><input type="text" name="url" size={50} /></td>
            </tr>
            <tr>
              <td>text</td>
              <td><textarea name="text" rows={4} cols={49}></textarea></td>
            </tr>
            <tr>
              <td></td>
              <td><input type="submit" value="submit" /></td>
            </tr>
          </tbody>
        </table>
        <div className="help-text">
          <br />
          Leave url blank to submit a question for discussion. If there is no url,
          text will appear at the top of the thread. If there is a url, text is optional.
        </div>
      </form>
    </div>
  );
}
