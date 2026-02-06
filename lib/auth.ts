import bcrypt from 'bcryptjs';
import { getSession } from './session';
import { createUser, getUserByUsername } from './db';
import { redirect } from 'next/navigation';

export async function login(username: string, password: string): Promise<{ error?: string }> {
  const user = getUserByUsername(username);
  if (!user) {
    return { error: 'Bad login.' };
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return { error: 'Bad login.' };
  }

  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  await session.save();

  // Set noprocrast cookies if enabled
  await setNoprocrastCookies(user);

  return {};
}

async function setNoprocrastCookies(user: { noprocrast: number; maxvisit: number; minaway: number }) {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  
  if (user.noprocrast) {
    cookieStore.set('np_enabled', '1', { path: '/', maxAge: 86400 });
    cookieStore.set('np_start', String(Date.now()), { path: '/', maxAge: 86400 });
    cookieStore.set('np_maxvisit', String(user.maxvisit), { path: '/', maxAge: 86400 });
    cookieStore.set('np_minaway', String(user.minaway), { path: '/', maxAge: 86400 });
  } else {
    cookieStore.delete('np_enabled');
    cookieStore.delete('np_start');
    cookieStore.delete('np_maxvisit');
    cookieStore.delete('np_minaway');
    cookieStore.delete('np_locked');
  }
}

export async function register(username: string, password: string): Promise<{ error?: string }> {
  // Validate username
  if (!username || username.length < 2 || username.length > 15) {
    return { error: 'Usernames can only contain letters, digits, dashes and underscores, and should be between 2 and 15 characters long.' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { error: 'Usernames can only contain letters, digits, dashes and underscores, and should be between 2 and 15 characters long.' };
  }

  // Validate password
  if (!password || password.length < 8) {
    return { error: 'Passwords should be at least 8 characters.' };
  }

  // Check if username exists
  const existing = getUserByUsername(username);
  if (existing) {
    return { error: 'That username is taken. Please choose another.' };
  }

  const hash = await bcrypt.hash(password, 10);
  const userId = createUser(username, hash);

  const session = await getSession();
  session.userId = userId;
  session.username = username;
  await session.save();

  return {};
}

export async function logout() {
  const session = await getSession();
  session.destroy();
}

export async function requireAuth(): Promise<{ userId: number; username: string }> {
  const session = await getSession();
  if (!session.userId || !session.username) {
    redirect('/login');
  }
  return { userId: session.userId, username: session.username };
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string): Promise<{ error?: string }> {
  const { getUserById, updateUserPassword } = await import('./db');
  
  const user = getUserById(userId);
  if (!user) return { error: 'User not found.' };

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) return { error: 'Invalid current password.' };

  if (newPassword.length < 8) {
    return { error: 'Passwords should be at least 8 characters.' };
  }

  const hash = await bcrypt.hash(newPassword, 10);
  updateUserPassword(userId, hash);

  return {};
}
