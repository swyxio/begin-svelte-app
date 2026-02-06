'use server';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { getUserByUsername, updateUserProfile } from '@/lib/db';

export async function handleUpdateProfile(formData: FormData) {
  const session = await getCurrentUser();
  if (!session) redirect('/login');

  const username = formData.get('username') as string;
  const user = getUserByUsername(username);
  if (!user || session.userId !== user.id) redirect('/');

  const about = formData.get('about') as string || '';
  const email = formData.get('email') as string || '';
  const showdead = formData.get('showdead') === 'yes' ? 1 : 0;
  const noprocrast = formData.get('noprocrast') === 'yes' ? 1 : 0;
  const maxvisit = parseInt(formData.get('maxvisit') as string) || 20;
  const minaway = parseInt(formData.get('minaway') as string) || 180;
  const delay = parseInt(formData.get('delay') as string) || 0;

  updateUserProfile(user.id, {
    about,
    email,
    showdead,
    noprocrast,
    maxvisit,
    minaway,
    delay,
  });

  redirect(`/user?id=${username}`);
}
