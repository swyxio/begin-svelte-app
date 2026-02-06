'use server';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { createItem, incrementDescendants, getItemById } from '@/lib/db';
import { formatHnText } from '@/lib/format';

export async function submitReply(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');

  const parentId = parseInt(formData.get('parent_id') as string, 10);
  const text = (formData.get('text') as string || '').trim();
  if (!text || isNaN(parentId)) redirect(`/reply?id=${parentId}`);

  const parentItem = getItemById(parentId);
  if (!parentItem) redirect('/');

  const storyId = parentItem.type === 'comment' ? (parentItem.story_id || parentItem.id) : parentItem.id;

  createItem({
    type: 'comment',
    by: currentUser.username,
    text: formatHnText(text),
    parent_id: parentId,
    story_id: storyId,
  });

  incrementDescendants(storyId);
  redirect(`/item?id=${parentId}`);
}
