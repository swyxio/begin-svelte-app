import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getItemById, createItem, incrementDescendants } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { timeAgo } from '@/lib/utils';
import { formatHnText } from '@/lib/format';

export default async function ReplyPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const id = parseInt(params.id as string, 10);
  if (isNaN(id)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?goto=${encodeURIComponent(`/reply?id=${id}`)}`);

  const item = getItemById(id);
  if (!item || item.deleted === 1) notFound();

  async function handleReply(formData: FormData) {
    'use server';
    const currentUser = await (await import('@/lib/session')).getCurrentUser();
    if (!currentUser) redirect('/login');

    const text = (formData.get('text') as string || '').trim();
    if (!text) redirect(`/reply?id=${id}`);

    const parentItem = (await import('@/lib/db')).getItemById(id);
    if (!parentItem) redirect('/');

    const storyId = parentItem.type === 'comment' ? (parentItem.story_id || parentItem.id) : parentItem.id;

    (await import('@/lib/db')).createItem({
      type: 'comment',
      by: currentUser.username,
      text: (await import('@/lib/format')).formatHnText(text),
      parent_id: id,
      story_id: storyId,
    });

    (await import('@/lib/db')).incrementDescendants(storyId);
    redirect(`/item?id=${id}`);
  }

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
        <div className="comment-body" dangerouslySetInnerHTML={{ __html: item.text || item.title || '' }} />
      </div>
      <form action={handleReply}>
        <textarea name="text" rows={8} cols={80}></textarea>
        <br />
        <input type="submit" value="reply" />
      </form>
    </div>
  );
}
