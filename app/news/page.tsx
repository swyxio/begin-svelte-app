import { redirect } from 'next/navigation';

// /news is an alias for the front page
export default function NewsPage() {
  redirect('/');
}
