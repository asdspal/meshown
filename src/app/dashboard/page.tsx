"use client";

import { Suspense } from "react";
import DashboardContent from "./dashboard-content";

/**
 * Dashboard page — Server Component shell with Suspense boundary.
 *
 * Blueprint §5 — Screen 3: Owner Dashboard.
 * Blueprint §7 — Phase 3: "All queries filtered with .ownedBy(walletAddress)".
 *
 * The actual client-side logic lives in DashboardContent to support
 * useSearchParams() and useAccount() hooks (Next.js 16 requires Suspense).
 */

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
              <p className="text-sm text-zinc-400">Loading dashboard…</p>
            </div>
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </div>
  );
}
