import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getItemById } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { timeAgo } from '@/lib/utils';
import { formatHnText } from '@/lib/format';
import { submitReply } from './actions';

export default async function ReplyPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const id = parseInt(params.id as string, 10);
  if (isNaN(id)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?goto=${encodeURIComponent(`/reply?id=${id}`)}`);

  const item = getItemById(id);
  if (!item || item.deleted === 1) notFound();

  return (
    <div className="reply-page">
      <div className="parent-comment">
        <div className="comment-head">
          <Link href={`/user?id=${item.by}`}>{item.by}</Link>
          {' '}
          <Link href={`/item?id=${item.id}`}>{timeAgo(item.created_at)}</Link>
          {item.parent_id && (
            <>
              {' | '}
              <Link href={`/item?id=${item.parent_id}`}>parent</Link>
            </>
          )}
        </div>
        <div className="comment-body" dangerouslySetInnerHTML={{ __html: item.type === 'comment' ? (item.text || '') : (item.text ? formatHnText(item.text) : (item.title || '')) }} />
      </div>
      <form action={submitReply}>
        <input type="hidden" name="parent_id" value={id} />
        <textarea name="text" rows={8} cols={80}></textarea>
        <br />
        <input type="submit" value="reply" />
      </form>
    </div>
  );
}
