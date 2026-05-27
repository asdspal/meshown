import { Suspense } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import QueryContent from "./query-content";

/**
 * Mesh Query Results page — Screen 4.
 *
 * Blueprint §5 (Screen 4), §10 (G8, G10):
 *   - G8: Reads searchParams to make results linkable/bookmarkable.
 *   - Wraps QueryContent in <Suspense> for useSearchParams() compatibility.
 *
 * This is a Server Component shell; all client logic lives in QueryContent.
 */

export default function QueryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
            <p className="text-sm text-zinc-500">Loading query…</p>
          </div>
        </div>
      }
    >
      <ErrorBoundary>
        <QueryContent />
      </ErrorBoundary>
    </Suspense>
  );
}
