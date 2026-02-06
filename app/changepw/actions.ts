'use server';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { changePassword } from '@/lib/auth';

export async function handleChangePw(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');

  const currentPassword = formData.get('current') as string;
  const newPassword = formData.get('new') as string;
  const confirm = formData.get('confirm') as string;

  if (newPassword !== confirm) {
    redirect('/changepw?error=' + encodeURIComponent("Passwords don't match."));
  }

  const result = await changePassword(currentUser.userId, currentPassword, newPassword);
  if (result.error) {
    redirect('/changepw?error=' + encodeURIComponent(result.error));
  }

  redirect('/changepw?success=true');
}
