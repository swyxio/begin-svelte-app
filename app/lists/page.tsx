import Link from 'next/link';

export default function ListsPage() {
  return (
    <div className="lists-page">
      <h2>Lists</h2>
      <br />
      <Link href="/best">Best Submissions</Link>
      <Link href="/bestcomments">Best Comments</Link>
      <Link href="/newest">New Submissions</Link>
      <Link href="/newcomments">New Comments</Link>
      <Link href="/active">Active Discussions</Link>
      <Link href="/ask">Ask HN</Link>
      <Link href="/show">Show HN</Link>
      <Link href="/jobs">Jobs</Link>
      <Link href="/noobstories">Noob Submissions</Link>
      <Link href="/noobcomments">Noob Comments</Link>
      <Link href="/leaders">Leaders</Link>
    </div>
  );
}
