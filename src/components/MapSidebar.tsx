"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useMeshStore } from "@/lib/store";
import { useState } from "react";

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
  const [mode, setMode] = useState<"browse" | "query">("browse");

  const {
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

      {/* ── Mode toggle ───────────────────────────────── */}
      <div className="flex rounded-lg bg-zinc-800 p-1">
        <button
          type="button"
          onClick={() => setMode("browse")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "browse"
              ? "bg-indigo-600 text-white shadow"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Browse
        </button>
        <button
          type="button"
          onClick={() => setMode("query")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "query"
              ? "bg-indigo-600 text-white shadow"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Query
        </button>
      </div>

      {/* ── Query mode controls [G9] ──────────────────── */}
      {mode === "query" && (
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
