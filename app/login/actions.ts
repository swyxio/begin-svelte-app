'use server';

import { redirect } from 'next/navigation';
import { login, register } from '@/lib/auth';

export async function handleLogin(formData: FormData) {
  const username = formData.get('acct') as string;
  const password = formData.get('pw') as string;
  const gotoUrl = formData.get('goto') as string || '/';

  const result = await login(username, password);
  if (result.error) {
    redirect(`/login?error=${encodeURIComponent(result.error)}&goto=${encodeURIComponent(gotoUrl)}`);
  }
  redirect(gotoUrl);
}

export async function handleRegister(formData: FormData) {
  const username = formData.get('acct') as string;
  const password = formData.get('pw') as string;
  const gotoUrl = formData.get('goto') as string || '/';

  const result = await register(username, password);
  if (result.error) {
    redirect(`/login?creating=true&error=${encodeURIComponent(result.error)}&goto=${encodeURIComponent(gotoUrl)}`);
  }
  redirect(gotoUrl);
}
