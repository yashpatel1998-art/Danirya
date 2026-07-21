'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2rem',
        background: 'var(--color-black)',
        color: 'var(--text-primary)',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 400,
          fontSize: '1.5rem',
        }}
      >
        Something went wrong
      </h2>
      <p style={{ color: 'var(--text-muted)', maxWidth: '32ch' }}>
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button
        type="button"
        onClick={reset}
        style={{
          padding: '0.875rem 2rem',
          background: 'transparent',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--form-radius)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontSize: '0.6875rem',
        }}
      >
        Try again
      </button>
    </div>
  );
}
