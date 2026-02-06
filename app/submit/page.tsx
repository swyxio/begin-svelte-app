import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';

export default async function SubmitPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/login?goto=/submit');

  const error = typeof params.error === 'string' ? params.error : null;

  async function handleSubmit(formData: FormData) {
    'use server';
    const currentUser = await (await import('@/lib/session')).getCurrentUser();
    if (!currentUser) redirect('/login');

    const title = (formData.get('title') as string || '').trim();
    const url = (formData.get('url') as string || '').trim();
    const text = (formData.get('text') as string || '').trim();

    if (!title) {
      redirect('/submit?error=' + encodeURIComponent('Please enter a title.'));
    }

    // Can't have both url and text
    if (url && text) {
      redirect('/submit?error=' + encodeURIComponent('Submissions can have a url or text, not both. If you want to show a url with your text, just put it in the text field.'));
    }

    // Check for duplicate URL
    if (url) {
      const { getItemByUrl } = await import('@/lib/db');
      const existing = getItemByUrl(url);
      if (existing) {
        redirect(`/item?id=${existing.id}`);
      }
    }

    // Determine type
    const type = 'story';

    const { createItem } = await import('@/lib/db');
    const itemId = createItem({
      type,
      by: currentUser.username,
      title,
      url: url || undefined,
      text: text || undefined,  // Store raw text, format at render time
    });

    redirect(`/item?id=${itemId}`);
  }

  return (
    <div className="submit-page">
      {error && <div className="login-error">{error}</div>}
      <form action={handleSubmit}>
        <table>
          <tbody>
            <tr>
              <td>title</td>
              <td><input type="text" name="title" size={50} /></td>
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
