'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="static-page">
      <h2>Something went wrong</h2>
      <p>An unexpected error occurred.</p>
      <p>
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
      </p>
    </div>
  );
}
