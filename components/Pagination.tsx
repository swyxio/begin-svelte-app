import Link from 'next/link';

interface PaginationProps {
  page: number;
  basePath: string;
  moreParams?: string;
}

export function Pagination({ page, basePath, moreParams = '' }: PaginationProps) {
  const separator = basePath.includes('?') ? '&' : '?';
  const extra = moreParams ? `&${moreParams}` : '';
  const nextUrl = `${basePath}${separator}p=${page + 1}${extra}`;

  return (
    <div className="more-link">
      <Link href={nextUrl}>More</Link>
    </div>
  );
}
