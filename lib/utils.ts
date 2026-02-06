/**
 * Extract domain from a URL for display.
 * e.g., "https://www.example.com/path" → "example.com"
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    let hostname = parsed.hostname;
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }
    return hostname;
  } catch {
    return '';
  }
}

/**
 * Format a date string as "X time ago" like HN does.
 * e.g., "2 hours ago", "3 days ago", "1 minute ago"
 */
export function timeAgo(dateString: string): string {
  const date = new Date(dateString + (dateString.endsWith('Z') ? '' : 'Z'));
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) {
    return seconds <= 1 ? '1 second ago' : `${seconds} seconds ago`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  
  const days = Math.floor(hours / 24);
  if (days < 365) {
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }
  
  const years = Math.floor(days / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

/**
 * Format date for user profile: "Month Day, Year"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString + (dateString.endsWith('Z') ? '' : 'Z'));
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Pluralize a word.
 * e.g., pluralize(1, "comment") → "1 comment"
 *       pluralize(5, "comment") → "5 comments"
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  const p = plural || singular + 's';
  return `${count} ${count === 1 ? singular : p}`;
}

/**
 * Get page number from search params, defaulting to 1.
 */
export function getPage(searchParams: { [key: string]: string | string[] | undefined }): number {
  const p = searchParams?.p;
  const page = typeof p === 'string' ? parseInt(p, 10) : 1;
  return isNaN(page) || page < 1 ? 1 : page;
}

/**
 * Items per page constant.
 */
export const ITEMS_PER_PAGE = 30;

/**
 * Calculate the offset for a page.
 */
export function pageOffset(page: number): number {
  return (page - 1) * ITEMS_PER_PAGE;
}
