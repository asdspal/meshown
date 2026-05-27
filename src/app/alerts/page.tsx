import { Suspense } from "react";
import AlertFeedContent from "./alert-feed-content";

/**
 * Alert Feed page — Screen 5.
 *
 * Blueprint §5 (Screen 5: Alert Feed):
 *   - Public tamper-proof log of all AI-detected anomalies.
 *   - Single-column feed with filter bar.
 *   - Wraps AlertFeedContent in <Suspense> for useSearchParams() compatibility.
 *
 * This is a Server Component shell; all client logic lives in AlertFeedContent.
 */

export default function AlertFeedPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
              <p className="text-sm text-zinc-400">Loading alerts…</p>
            </div>
          </div>
        }
      >
        <AlertFeedContent />
      </Suspense>
    </div>
  );
}
