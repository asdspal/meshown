"use client";

import dynamic from "next/dynamic";
import MapSidebar from "@/components/MapSidebar";

/**
 * Mesh Map screen — hero route (`/`).
 *
 * Blueprint §5 — Screen 1: Mesh Map:
 *   Full-viewport map with a floating left sidebar (320 px).
 *
 * Blueprint §10 — G2 (Leaflet SSR fix):
 *   Leaflet relies on `window`; failing the SSR fix crashes the Next.js build.
 *   `next/dynamic(() => import('./MeshMap'), { ssr: false })` ensures the
 *   component is only rendered client-side, bypassing SSR entirely.
 *
 * [GAP] `ssr: false` is not allowed in Server Components (Next.js 16 docs).
 *   The page is promoted to `"use client"` since it has no server-side data fetching.
 */

// G2: Dynamic import with ssr:false — Leaflet is client-only
const DynamicMeshMap = dynamic(() => import("@/components/MeshMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-950">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
          <svg
            className="h-8 w-8 animate-pulse text-indigo-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
            />
          </svg>
        </div>
        <p className="text-sm text-zinc-500">Loading map…</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-zinc-950">
      {/* ── Sidebar ───────────────────────────────────── */}
      <MapSidebar />

      {/* ── Map area (Leaflet, dynamic import G2) ────── */}
      <div className="h-full w-full pl-88">
        <DynamicMeshMap />
      </div>
    </div>
  );
}
