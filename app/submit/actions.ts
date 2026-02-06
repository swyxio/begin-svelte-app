'use server';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { createItem, getItemByUrl } from '@/lib/db';

export async function submitStory(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');

  const title = (formData.get('title') as string || '').trim();
  const url = (formData.get('url') as string || '').trim();
  const text = (formData.get('text') as string || '').trim();

  if (!title) {
    redirect('/submit?error=' + encodeURIComponent('Please enter a title.'));
  }

  if (title.length > 80) {
    redirect('/submit?error=' + encodeURIComponent('Titles can be at most 80 characters long.'));
  }

  if (url) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      redirect('/submit?error=' + encodeURIComponent('URLs must begin with http:// or https://'));
    }
    try {
      new URL(url);
    } catch {
      redirect('/submit?error=' + encodeURIComponent('Please enter a valid URL.'));
    }
  }

  if (url && text) {
    redirect('/submit?error=' + encodeURIComponent("Submissions can't have both a url and text. If you want to show a url with your text, just include it in the text."));
  }

  if (url) {
    const existing = getItemByUrl(url);
    if (existing) {
      redirect(`/item?id=${existing.id}`);
    }
  }

  const itemId = createItem({
    type: 'story',
    by: currentUser.username,
    title,
    url: url || undefined,
    text: text || undefined,
  });

  redirect(`/item?id=${itemId}`);
}
