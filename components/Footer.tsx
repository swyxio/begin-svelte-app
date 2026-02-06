import Link from 'next/link';

export function Footer() {
  return (
    <div>
      <div className="footer-links">
        <Link href="/newsguidelines">Guidelines</Link>
        <span> | </span>
        <Link href="/newsfaq">FAQ</Link>
        <span> | </span>
        <Link href="/lists">Lists</Link>
        <span> | </span>
        <Link href="/formatdoc">Formatting</Link>
      </div>
      <div className="footer-search">
        <form action="/search" method="get">
          Search: <input type="text" name="q" size={17} autoComplete="off" />
        </form>
      </div>
    </div>
  );
}
