'use server';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { getItemById, updateItemText } from '@/lib/db';
import { formatHnText } from '@/lib/format';

export async function handleEdit(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');

  const itemId = parseInt(formData.get('item_id') as string, 10);
  const text = (formData.get('text') as string || '').trim();
  if (!text || isNaN(itemId)) redirect(`/edit?id=${itemId}`);

  const item = getItemById(itemId);
  if (!item || item.by !== currentUser.username) redirect('/');

  const ageMs = Date.now() - new Date(item.created_at + 'Z').getTime();
  if (ageMs > 2 * 60 * 60 * 1000) redirect(`/item?id=${itemId}`);

  const formatted = formatHnText(text);
  updateItemText(itemId, formatted);

  redirect(`/item?id=${itemId}`);
}
