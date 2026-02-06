import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getItemById } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { timeAgo } from '@/lib/utils';
import { handleEdit } from './actions';

export default async function EditPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const id = parseInt(params.id as string, 10);
  if (isNaN(id)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?goto=${encodeURIComponent(`/edit?id=${id}`)}`);

  const item = getItemById(id);
  if (!item || item.deleted === 1) notFound();

  if (item.by !== user.username) {
    return <div className="static-page">You can only edit your own items.</div>;
  }

  const ageMs = Date.now() - new Date(item.created_at + 'Z').getTime();
  if (ageMs > 2 * 60 * 60 * 1000) {
    return <div className="static-page">The edit window for this item has closed.</div>;
  }

  const rawText = item.text ? htmlToText(item.text) : '';

  return (
    <div className="edit-page">
      <div className="comment-head">
        <Link href={`/user?id=${item.by}`}>{item.by}</Link>
        {' '}
        <Link href={`/item?id=${item.id}`}>{timeAgo(item.created_at)}</Link>
      </div>
      <form action={handleEdit}>
        <input type="hidden" name="item_id" value={id} />
        <textarea name="text" rows={10} cols={80} defaultValue={rawText}></textarea>
        <br />
        <input type="submit" value="update" />
      </form>
    </div>
  );
}

function htmlToText(html: string): string {
  return html
    .replace(/<p>/g, '\n\n')
    .replace(/<\/p>/g, '')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<i>/g, '*')
    .replace(/<\/i>/g, '*')
    .replace(/<pre><code>/g, '\n\n  ')
    .replace(/<\/code><\/pre>/g, '')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>[^<]*<\/a>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}
