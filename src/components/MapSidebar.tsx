"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useMeshStore } from "@/lib/store";
import { useRouter } from "next/navigation";

/**
 * Floating left sidebar for the Mesh Map screen (Screen 1).
 *
 * Blueprint §5 — Screen 1: Mesh Map (`/`):
 *   - Logo + tagline ("Own your sensor data")
 *   - RainbowKit <ConnectButton />
 *   - Mode toggle: "Browse" / "Query"
 *   - Query mode controls: sensor_type dropdown, quality slider, time range
 *   - "Draw bounding box" instruction
 *   - "Run Mesh Query" button (disabled until bbox is drawn)
 *   - Query results summary
 *
 * [GAP] mode toggle state location not specified in blueprint — local state used.
 */

const SENSOR_TYPES = [
  { value: "all", label: "All Types" },
  { value: "air_quality", label: "Air Quality" },
  { value: "temperature", label: "Temperature" },
  { value: "energy", label: "Energy" },
  { value: "soil", label: "Soil" },
  { value: "weather", label: "Weather" },
] as const;

const TIME_RANGES = [
  { value: 1, label: "Last 1h" },
  { value: 6, label: "Last 6h" },
  { value: 24, label: "Last 24h" },
] as const;

export default function MapSidebar() {
  const router = useRouter();

  const {
    mapMode,
    setMapMode,
    minQualityScore,
    setMinQualityScore,
    selectedSensorType,
    setSelectedSensorType,
    timeRangeHours,
    setTimeRangeHours,
    boundingBox,
    meshQueryResults,
    isQuerying,
  } = useMeshStore();

  const hasBbox = boundingBox !== null;

  /** Construct /query URL from Zustand state and navigate [G8] */
  function handleRunQuery() {
    if (!boundingBox) return;

    const params = new URLSearchParams({
      sw_lat: String(boundingBox.sw.lat),
      sw_lng: String(boundingBox.sw.lng),
      ne_lat: String(boundingBox.ne.lat),
      ne_lng: String(boundingBox.ne.lng),
      sensor_type: selectedSensorType,
      min_quality: String(minQualityScore),
      hours: String(timeRangeHours),
    });

    router.push(`/query?${params.toString()}`);
  }

  return (
    <aside
      className="fixed left-4 top-4 bottom-4 z-[1000] w-80 flex flex-col gap-4 overflow-y-auto rounded-2xl border border-white/10 bg-zinc-900/90 p-5 shadow-2xl backdrop-blur-md"
      aria-label="Mesh Map controls"
    >
      {/* ── Logo + tagline ─────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Mesh<span className="text-indigo-400">Own</span>
        </h1>
        <p className="mt-0.5 text-xs text-zinc-400">
          Own your sensor data
        </p>
      </div>

      {/* ── Wallet connection [G5] ────────────────────── */}
      <div className="flex justify-center">
        <ConnectButton
          chainStatus="icon"
          showBalance={false}
          accountStatus="address"
        />
      </div>

      {/* ── Dashboard link ─────────────────────────────── */}
      <button
        type="button"
        onClick={() => router.push("/dashboard")}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300 transition-colors hover:border-indigo-500/30 hover:bg-zinc-800 hover:text-white"
      >
        <svg
          className="h-4 w-4 text-indigo-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
          />
        </svg>
        Owner Dashboard
      </button>

      {/* ── Mode toggle ───────────────────────────────── */}
      <div className="flex rounded-lg bg-zinc-800 p-1">
        <button
          type="button"
          onClick={() => setMapMode("browse")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mapMode === "browse"
              ? "bg-indigo-600 text-white shadow"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Browse
        </button>
        <button
          type="button"
          onClick={() => setMapMode("query")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mapMode === "query"
              ? "bg-indigo-600 text-white shadow"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Query
        </button>
      </div>

      {/* ── Query mode controls [G9] ──────────────────── */}
      {mapMode === "query" && (
        <div className="flex flex-col gap-4">
          {/* Sensor type dropdown */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Sensor Type
            </span>
            <select
              value={selectedSensorType}
              onChange={(e) => setSelectedSensorType(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              {SENSOR_TYPES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </label>

          {/* Quality score slider */}
          <label className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-zinc-400">
              <span>Min Quality Score</span>
              <span className="font-mono text-indigo-400">{minQualityScore}</span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={minQualityScore}
              onChange={(e) => setMinQualityScore(Number(e.target.value))}
              className="accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </label>

          {/* Time range select */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Time Range
            </span>
            <select
              value={timeRangeHours}
              onChange={(e) => setTimeRangeHours(Number(e.target.value))}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              {TIME_RANGES.map((tr) => (
                <option key={tr.value} value={tr.value}>
                  {tr.label}
                </option>
              ))}
            </select>
          </label>

          {/* Bounding box instruction */}
          <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-800/50 p-3 text-center text-xs text-zinc-400">
            {hasBbox ? (
              <span className="text-emerald-400">✓ Bounding box drawn</span>
            ) : (
              <>Draw a bounding box on the map to define your query area</>
            )}
          </div>

          {/* Run Mesh Query button */}
          <button
            type="button"
            onClick={handleRunQuery}
            disabled={!hasBbox || isQuerying}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isQuerying ? "Querying…" : "Run Mesh Query"}
          </button>
        </div>
      )}

      {/* ── Query results summary ─────────────────────── */}
      {meshQueryResults.length > 0 && (
        <div className="mt-auto rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-3">
          <p className="text-sm font-medium text-indigo-300">
            Found{" "}
            <span className="font-mono text-white">
              {meshQueryResults.length}
            </span>{" "}
            readings from{" "}
            <span className="font-mono text-white">
              {new Set(meshQueryResults.map((r) => r.deviceKey)).size}
            </span>{" "}
            sensors
          </p>
        </div>
      )}

      {/* ── Footer ────────────────────────────────────── */}
      <div className="mt-auto pt-2 text-center text-[10px] text-zinc-600">
        Powered by Arkiv · Braga Testnet
      </div>
    </aside>
  );
}
