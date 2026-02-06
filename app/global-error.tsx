'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Verdana, Geneva, sans-serif', fontSize: '10pt', backgroundColor: '#f6f6ef', padding: '40px' }}>
        <h2>Something went wrong</h2>
        <p>An unexpected error occurred. Please try again.</p>
        <button
          onClick={() => reset()}
          style={{
            fontFamily: 'Verdana, Geneva, sans-serif',
            fontSize: '10pt',
            cursor: 'pointer',
            padding: '4px 12px',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
