import MapSidebar from "@/components/MapSidebar";

/**
 * Mesh Map screen — hero route (`/`).
 *
 * Blueprint §5 — Screen 1: Mesh Map:
 *   Full-viewport map with a floating left sidebar (320 px).
 *   The Leaflet map component will be added in M2.2 via dynamic import (G2).
 *   For now, the map area shows a placeholder.
 */
export default function Home() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-zinc-950">
      {/* ── Sidebar ───────────────────────────────────── */}
      <MapSidebar />

      {/* ── Map area (placeholder — Leaflet added in M2.2) ── */}
      <div className="flex h-full w-full items-center justify-center pl-88">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
            <svg
              className="h-8 w-8 text-zinc-600"
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
          <p className="text-sm text-zinc-500">
            Map loading… (M2.2)
          </p>
          <p className="mt-1 text-xs text-zinc-700">
            Leaflet + react-leaflet integration coming next
          </p>
        </div>
      </div>
    </div>
  );
}
