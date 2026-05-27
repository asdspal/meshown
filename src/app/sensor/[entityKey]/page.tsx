import { Suspense } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import SensorDetailContent from "./sensor-detail-content";

/**
 * Sensor Detail page — Screen 2.
 *
 * Blueprint §5 (Screen 2):
 *   - Two-column layout: sidebar left 280px, main content right.
 *   - Sidebar shows device info, calibration status, owner controls.
 *   - Main content shows reading history (charts + table), anomaly alerts.
 *
 * This is a Server Component shell; all client logic (wallet, fetching, state)
 * lives in SensorDetailContent.
 *
 * [GAP] Blueprint does not strictly define server vs client fetching strategy.
 * Using client component that fetches via API routes to support wallet state
 * for owner-only controls.
 */

export default async function SensorDetailPage({
  params,
}: {
  params: Promise<{ entityKey: string }>;
}) {
  const { entityKey } = await params;

  return (
    <div className="h-screen w-screen overflow-hidden bg-zinc-950">
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
              <p className="text-sm text-zinc-500">Loading sensor details…</p>
            </div>
          </div>
        }
      >
        <ErrorBoundary>
          <SensorDetailContent entityKey={entityKey} />
        </ErrorBoundary>
      </Suspense>
    </div>
  );
}
