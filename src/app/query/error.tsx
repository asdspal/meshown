"use client";

/**
 * Route-level error boundary for /query.
 *
 * Next.js App Router convention: `error.tsx` catches uncaught rendering errors
 * in this route segment and displays a fallback UI instead of crashing the app.
 */

export default function QueryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-8">
      <div className="max-w-md rounded-2xl border border-red-500/30 bg-zinc-900/90 p-8 text-center shadow-2xl backdrop-blur-md">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
          <svg
            className="h-7 w-7 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h2 className="mb-2 text-lg font-semibold text-white">
          Failed to load query results
        </h2>
        <p className="mb-1 text-sm text-zinc-400">
          The mesh query could not be completed. This may be a temporary
          network issue.
        </p>
        {error.message && (
          <p className="mb-4 max-h-20 overflow-auto rounded-lg bg-zinc-800/50 p-2 text-xs font-mono text-red-300">
            {error.message}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Try Again
          </button>
          <a
            href="/"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            ← Back to Map
          </a>
        </div>
      </div>
    </div>
  );
}
