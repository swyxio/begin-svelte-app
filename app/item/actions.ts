'use server';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { createItem, incrementDescendants, getItemById } from '@/lib/db';
import { formatHnText } from '@/lib/format';

export async function addComment(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');

  const itemId = parseInt(formData.get('item_id') as string, 10);
  const text = (formData.get('text') as string || '').trim();
  if (!text || isNaN(itemId)) redirect(`/item?id=${itemId}`);

  const item = getItemById(itemId);
  if (!item) redirect('/');

  // Determine story_id: if this is a story, use its id; if it's a comment, use its story_id
  const storyId = item.type === 'comment' ? (item.story_id || item.id) : item.id;

  createItem({
    type: 'comment',
    by: currentUser.username,
    text: formatHnText(text),
    parent_id: itemId,
    story_id: storyId,
  });

  incrementDescendants(storyId);
  redirect(`/item?id=${itemId}`);
}
