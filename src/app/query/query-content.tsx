"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Mesh Query Results — inner client component (Screen 4).
 *
 * Blueprint §5 (Screen 4), §10 (G8, G10):
 *   - G8: Reads searchParams to make results linkable/bookmarkable.
 *   - Fetches GET /api/readings/mesh with bbox + filter params.
 *   - Renders aggregate stats (count, unique_owners, avg_quality).
 *   - G10: Truncation banner when results capped at 200.
 *   - CSV export with exact columns: timestamp, device_key, owner, lat, lng,
 *     value, unit, quality_score, calibration_valid.
 *
 * [GAP] calibration_valid: Blueprint table says "calibration_valid".
 *   Cross-referencing calibrations requires additional fetch per reading.
 *   For MVP, displayed as 'N/A' (no embedded calibration data in mesh response).
 */

// ── Types ───────────────────────────────────────────────────────

interface MeshReadingEntity {
  entityKey: string;
  owner: string | null;
  creator: string | null;
  attributes: Record<string, string | number>;
  payload: unknown;
  contentType: string | null;
  createdAtBlock: string | null;
}

interface MeshSummary {
  count: number;
  unique_owners: number;
  avg_quality: number;
  truncated: boolean;
}

interface MeshResponse {
  readings: MeshReadingEntity[];
  summary: MeshSummary;
}

type SortColumn =
  | "timestamp"
  | "device_key"
  | "owner"
  | "lat"
  | "lng"
  | "value"
  | "unit"
  | "quality_score";

type SortDirection = "asc" | "desc";

// ── Helpers ─────────────────────────────────────────────────────

/** Coordinate scale factor from arkiv.ts — micro-degrees to float degrees */
const COORD_SCALE = 1_000_000;

/** Un-scale micro-degree integer to float degrees for display */
function unscaleCoord(raw: string | number): number {
  const n = typeof raw === "string" ? parseFloat(raw) : raw;
  return n / COORD_SCALE;
}

/** Format a Unix-ms timestamp to ISO-like local display */
function formatTimestamp(ms: number): string {
  if (!ms || isNaN(ms)) return "—";
  const d = new Date(ms);
  return d.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** Truncate an address for display: 0xabcd…ef01 */
function shortAddr(addr: string | null): string {
  if (!addr || addr.length < 12) return addr ?? "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Sensor type label mapping */
const SENSOR_TYPE_LABELS: Record<string, string> = {
  air_quality: "Air Quality",
  temperature: "Temperature",
  energy: "Energy",
  soil: "Soil",
  weather: "Weather",
};

// ── Component ───────────────────────────────────────────────────

export default function QueryContent() {
  const searchParams = useSearchParams();

  // ── State ──────────────────────────────────────────────────
  const [readings, setReadings] = useState<MeshReadingEntity[]>([]);
  const [summary, setSummary] = useState<MeshSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Abort controller ref — cancels in-flight fetch on re-query or unmount
  const abortRef = useRef<AbortController | null>(null);

  // ── Parse searchParams [G8] ────────────────────────────────
  const sw_lat = searchParams.get("sw_lat");
  const sw_lng = searchParams.get("sw_lng");
  const ne_lat = searchParams.get("ne_lat");
  const ne_lng = searchParams.get("ne_lng");
  const sensor_type = searchParams.get("sensor_type") ?? "all";
  const min_quality = searchParams.get("min_quality") ?? "0";
  const hours = searchParams.get("hours") ?? "24";

  // Serialize params for stable useEffect dependency (avoid fetch loops)
  const paramsKey = useMemo(
    () =>
      JSON.stringify({
        sw_lat,
        sw_lng,
        ne_lat,
        ne_lng,
        sensor_type,
        min_quality,
        hours,
      }),
    [sw_lat, sw_lng, ne_lat, ne_lng, sensor_type, min_quality, hours],
  );

  // ── Fetch mesh data on mount / param change ────────────────
  useEffect(() => {
    // Validate required params
    if (!sw_lat || !sw_lng || !ne_lat || !ne_lng) {
      setError(
        "Missing required bounding box parameters (sw_lat, sw_lng, ne_lat, ne_lng).",
      );
      setLoading(false);
      return;
    }

    // Abort previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const url = new URL("/api/readings/mesh", window.location.origin);
    url.searchParams.set("sw_lat", sw_lat);
    url.searchParams.set("sw_lng", sw_lng);
    url.searchParams.set("ne_lat", ne_lat);
    url.searchParams.set("ne_lng", ne_lng);
    if (sensor_type && sensor_type !== "all") {
      url.searchParams.set("sensor_type", sensor_type);
    }
    url.searchParams.set("min_quality", min_quality);
    url.searchParams.set("hours", hours);

    fetch(url.toString(), { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body.error ?? `HTTP ${res.status}: Failed to fetch mesh data`,
          );
        }
        return res.json() as Promise<MeshResponse>;
      })
      .then((data) => {
        setReadings(data.readings);
        setSummary(data.summary);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred",
        );
        setLoading(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  // ── Sorting ────────────────────────────────────────────────
  const handleSort = useCallback(
    (col: SortColumn) => {
      if (sortColumn === col) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortColumn(col);
        setSortDirection("asc");
      }
    },
    [sortColumn],
  );

  const sortedReadings = useMemo(() => {
    const copy = [...readings];
    copy.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortColumn) {
        case "lat":
          aVal = unscaleCoord(a.attributes.lat ?? 0);
          bVal = unscaleCoord(b.attributes.lat ?? 0);
          break;
        case "lng":
          aVal = unscaleCoord(a.attributes.lng ?? 0);
          bVal = unscaleCoord(b.attributes.lng ?? 0);
          break;
        default:
          aVal = a.attributes[sortColumn] ?? "";
          bVal = b.attributes[sortColumn] ?? "";
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [readings, sortColumn, sortDirection]);

  // ── CSV Export ──────────────────────────────────────────────
  /**
   * Blueprint §5 (Screen 4), §10 (G8):
   * CSV columns: timestamp, device_key, owner, lat, lng, value, unit,
   * quality_score, calibration_valid
   *
   * [GAP] calibration_valid — not embedded in mesh response; exported as 'N/A'.
   */
  const handleExportCsv = useCallback(() => {
    const header =
      "timestamp,device_key,owner,lat,lng,value,unit,quality_score,calibration_valid";
    const rows = readings.map((r) => {
      const ts = r.attributes.timestamp ?? "";
      const dk = r.attributes.device_key ?? "";
      const owner = r.owner ?? "";
      const lat = unscaleCoord(r.attributes.lat ?? 0).toFixed(6);
      const lng = unscaleCoord(r.attributes.lng ?? 0).toFixed(6);
      const value = r.attributes.value ?? "";
      const unit = r.attributes.unit ?? "";
      const qs = r.attributes.quality_score ?? "";
      // [GAP] calibration_valid: not available in mesh response
      const calibValid = "N/A";
      return [ts, dk, owner, lat, lng, value, unit, qs, calibValid].join(",");
    });

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `meshown-query-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [readings]);

  // ── Sort indicator arrow ───────────────────────────────────
  function SortArrow({ col }: { col: SortColumn }) {
    if (sortColumn !== col) return null;
    return (
      <span className="ml-1 inline-block text-indigo-400">
        {sortDirection === "asc" ? "▲" : "▼"}
      </span>
    );
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* ── Header bar ─────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
              Back to Map
            </Link>
            <h1 className="text-lg font-bold tracking-tight">
              Mesh<span className="text-indigo-400">Own</span>
              <span className="ml-2 text-sm font-normal text-zinc-500">
                / Query Results
              </span>
            </h1>
          </div>

          {/* CSV Export button */}
          {!loading && !error && readings.length > 0 && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-indigo-500 hover:text-white"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
              Export CSV
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        {/* ── Query parameters summary banner ───────────────── */}
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Query Parameters
          </h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="rounded-md bg-zinc-800 px-3 py-1.5 font-mono text-zinc-300">
              bbox: [{sw_lat ?? "?"}, {sw_lng ?? "?"}] → [{ne_lat ?? "?"},{" "}
              {ne_lng ?? "?"}]
            </span>
            {sensor_type && sensor_type !== "all" && (
              <span className="rounded-md bg-indigo-500/10 px-3 py-1.5 font-mono text-indigo-300">
                sensor: {SENSOR_TYPE_LABELS[sensor_type] ?? sensor_type}
              </span>
            )}
            <span className="rounded-md bg-zinc-800 px-3 py-1.5 font-mono text-zinc-300">
              min quality: {min_quality}
            </span>
            <span className="rounded-md bg-zinc-800 px-3 py-1.5 font-mono text-zinc-300">
              last {hours}h
            </span>
          </div>
        </div>

        {/* ── Loading state ─────────────────────────────────── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
            <p className="text-sm text-zinc-500">Querying mesh network…</p>
          </div>
        )}

        {/* ── Error state ───────────────────────────────────── */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* ── Results ───────────────────────────────────────── */}
        {!loading && !error && summary && (
          <>
            {/* ── Aggregate stats ─────────────────────────── */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Total Readings
                </p>
                <p className="mt-1 font-mono text-3xl font-bold text-white">
                  {summary.count}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Unique Owners
                </p>
                <p className="mt-1 font-mono text-3xl font-bold text-indigo-400">
                  {summary.unique_owners}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Avg Quality Score
                </p>
                <p className="mt-1 font-mono text-3xl font-bold text-emerald-400">
                  {summary.avg_quality}
                </p>
              </div>
            </div>

            {/* ── Truncation banner [G10] ─────────────────── */}
            {summary.truncated && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <svg
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-amber-300">
                    Results capped at 200
                  </p>
                  <p className="mt-0.5 text-xs text-amber-200/70">
                    Results capped at 200 — refine your bounding box or increase
                    the quality filter.
                  </p>
                </div>
              </div>
            )}

            {/* ── Results table ───────────────────────────── */}
            {readings.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
                <p className="text-sm text-zinc-500">
                  No readings found matching your query parameters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-800 bg-zinc-900/80">
                    <tr>
                      <Th
                        onClick={() => handleSort("timestamp")}
                        className="w-44"
                      >
                        Timestamp
                        <SortArrow col="timestamp" />
                      </Th>
                      <Th
                        onClick={() => handleSort("device_key")}
                        className="w-48"
                      >
                        Device
                        <SortArrow col="device_key" />
                      </Th>
                      <Th
                        onClick={() => handleSort("owner")}
                        className="w-40"
                      >
                        Owner
                        <SortArrow col="owner" />
                      </Th>
                      <Th
                        onClick={() => handleSort("lat")}
                        className="w-28"
                      >
                        Lat
                        <SortArrow col="lat" />
                      </Th>
                      <Th
                        onClick={() => handleSort("lng")}
                        className="w-28"
                      >
                        Lng
                        <SortArrow col="lng" />
                      </Th>
                      <Th
                        onClick={() => handleSort("value")}
                        className="w-24"
                      >
                        Value
                        <SortArrow col="value" />
                      </Th>
                      <Th
                        onClick={() => handleSort("unit")}
                        className="w-20"
                      >
                        Unit
                        <SortArrow col="unit" />
                      </Th>
                      <Th
                        onClick={() => handleSort("quality_score")}
                        className="w-24"
                      >
                        Quality
                        <SortArrow col="quality_score" />
                      </Th>
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Calibration
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {sortedReadings.map((r) => {
                      const lat = unscaleCoord(r.attributes.lat ?? 0);
                      const lng = unscaleCoord(r.attributes.lng ?? 0);
                      const ts = r.attributes.timestamp;
                      const qs = r.attributes.quality_score;

                      return (
                        <tr
                          key={r.entityKey}
                          className="transition-colors hover:bg-zinc-800/30"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                            {formatTimestamp(
                              typeof ts === "number"
                                ? ts
                                : parseInt(String(ts), 10),
                            )}
                          </td>
                          <td
                            className="max-w-48 truncate px-4 py-3 font-mono text-xs text-zinc-400"
                            title={String(r.attributes.device_key ?? "")}
                          >
                            {shortAddr(String(r.attributes.device_key ?? ""))}
                          </td>
                          <td
                            className="px-4 py-3 font-mono text-xs text-zinc-400"
                            title={r.owner ?? undefined}
                          >
                            {shortAddr(r.owner)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                            {lat.toFixed(4)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                            {lng.toFixed(4)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-white">
                            {r.attributes.value ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-400">
                            {r.attributes.unit ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <QualityBadge
                              score={
                                typeof qs === "number"
                                  ? qs
                                  : parseInt(String(qs), 10)
                              }
                            />
                          </td>
                          {/* [GAP] calibration_valid: not in mesh response */}
                          <td className="px-4 py-3 text-xs text-zinc-500">
                            N/A
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function Th({
  onClick,
  className = "",
  children,
}: {
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <th
      className={`cursor-pointer select-none px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500 transition-colors hover:text-zinc-300 ${className}`}
      onClick={onClick}
    >
      {children}
    </th>
  );
}

/** Color-coded quality score badge */
function QualityBadge({ score }: { score: number }) {
  if (isNaN(score)) {
    return <span className="text-xs text-zinc-500">—</span>;
  }

  let colorClass: string;
  if (score >= 80) {
    colorClass = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  } else if (score >= 50) {
    colorClass = "bg-amber-500/15 text-amber-400 border-amber-500/30";
  } else {
    colorClass = "bg-red-500/15 text-red-400 border-red-500/30";
  }

  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 font-mono text-xs font-medium ${colorClass}`}
    >
      {score}
    </span>
  );
}
