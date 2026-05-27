"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { VALUE_SCALE } from "@/lib/arkiv";

/**
 * SensorDetailMain — Main content area for the Sensor Detail page.
 *
 * Blueprint §5 (Screen 2): Reading history charts + data table.
 * Blueprint §2: Uses Recharts 3.8.1 LineChart.
 *
 * Fetches readings from GET /api/readings?deviceKey=[key]&limit=200,
 * renders two line charts (value over time, quality score over time),
 * and a readings data table.
 */

// ── Types ───────────────────────────────────────────────────────

interface ReadingEntry {
  entityKey: string;
  attributes: Record<string, string | number>;
  payload: unknown;
}

interface ChartPoint {
  timestamp: number;
  timeLabel: string;
  value: number;
  quality: number;
}

// ── Helpers ─────────────────────────────────────────────────────

/** Format Unix ms timestamp to short time label for chart axis */
function formatTimeAxis(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Format Unix ms timestamp to full datetime for table display */
function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** Quality score badge color */
function qualityBadgeColor(score: number): string {
  if (score >= 80) return "bg-emerald-500/20 text-emerald-400";
  if (score >= 50) return "bg-amber-500/20 text-amber-400";
  return "bg-red-500/20 text-red-400";
}

// ── Custom Tooltip ──────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
  unit?: string;
}

function ValueTooltip({ active, payload, label, unit }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="mb-1 text-xs text-zinc-500">{label}</p>
      <p className="text-sm font-medium text-white">
        {payload[0].value.toFixed(2)}
        {unit ? ` ${unit}` : ""}
      </p>
    </div>
  );
}

function QualityTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="mb-1 text-xs text-zinc-500">{label}</p>
      <p className="text-sm font-medium text-white">
        {payload[0].value}
      </p>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────

export default function SensorDetailMain({
  entityKey,
  unit: deviceUnit,
}: {
  entityKey: string;
  unit?: string;
}) {
  const [readings, setReadings] = useState<ReadingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch readings on mount ─────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();

    async function fetchReadings() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/readings?deviceKey=${entityKey}&limit=200`,
          { signal: controller.signal },
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error || `Failed to load readings (${res.status})`);
          return;
        }

        const data = await res.json();
        setReadings(data.readings ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchReadings();
    return () => controller.abort();
  }, [entityKey]);

  // ── Transform readings into chart data ──────────────────────
  // API returns newest-first (desc). Charts need oldest-first (asc).
  const chartData: ChartPoint[] = [...readings]
    .reverse()
    .map((r) => {
      const ts = Number(r.attributes.timestamp ?? 0);
      const rawValue = Number(r.attributes.value ?? 0);
      const quality = Number(r.attributes.quality_score ?? 0);
      return {
        timestamp: ts,
        timeLabel: formatTimeAxis(ts),
        // VALUE_SCALE = 100: stored as centi-units
        value: rawValue / VALUE_SCALE,
        quality,
      };
    })
    .filter((p) => p.timestamp > 0);

  // Detect unit from first reading if not provided via prop
  const detectedUnit =
    deviceUnit ??
    (readings.length > 0 ? String(readings[0].attributes.unit ?? "") : "");

  // ── Loading state ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Chart skeleton */}
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-xl border border-white/10 bg-zinc-900/60"
          />
        ))}
        {/* Table skeleton */}
        <div className="h-48 animate-pulse rounded-xl border border-white/10 bg-zinc-900/60" />
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────
  if (chartData.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-8 text-center">
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
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
            />
          </svg>
        </div>
        <p className="text-sm text-zinc-400">No readings yet</p>
        <p className="mt-1 text-xs text-zinc-600">
          Submit readings to see charts and history
        </p>
      </div>
    );
  }

  // ── Summary stats ───────────────────────────────────────────
  const values = chartData.map((p) => p.value);
  const qualities = chartData.map((p) => p.quality);
  const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
  const avgQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Summary stats row ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Readings" value={String(chartData.length)} />
        <StatCard
          label="Avg Value"
          value={`${avgValue.toFixed(2)}${detectedUnit ? ` ${detectedUnit}` : ""}`}
        />
        <StatCard
          label="Range"
          value={`${minValue.toFixed(2)} – ${maxValue.toFixed(2)}`}
        />
        <StatCard label="Avg Quality" value={`${avgQuality.toFixed(0)}/100`} />
      </div>

      {/* ── Value Line Chart ──────────────────────────────── */}
      <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
        <h3 className="mb-4 text-sm font-medium text-zinc-300">
          Reading Values Over Time
          {detectedUnit && (
            <span className="ml-2 text-xs text-zinc-500">
              ({detectedUnit})
            </span>
          )}
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart
            data={chartData}
            margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
            />
            <XAxis
              dataKey="timeLabel"
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
              width={50}
            />
            <Tooltip
              content={<ValueTooltip unit={detectedUnit} />}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#818cf8"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                fill: "#818cf8",
                stroke: "#1e1b4b",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Quality Score Line Chart ──────────────────────── */}
      <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
        <h3 className="mb-4 text-sm font-medium text-zinc-300">
          Quality Score Trend
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={chartData}
            margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
            />
            <XAxis
              dataKey="timeLabel"
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
              width={50}
            />
            <Tooltip content={<QualityTooltip />} />
            <Line
              type="monotone"
              dataKey="quality"
              stroke="#34d399"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                fill: "#34d399",
                stroke: "#064e3b",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Readings Data Table ───────────────────────────── */}
      <div className="rounded-xl border border-white/10 bg-zinc-900/60">
        <div className="border-b border-white/5 px-4 py-3">
          <h3 className="text-sm font-medium text-zinc-300">
            Reading History
            <span className="ml-2 text-xs text-zinc-500">
              ({readings.length} entries, newest first)
            </span>
          </h3>
        </div>
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur">
              <tr className="border-b border-white/5">
                <th className="px-4 py-2.5 font-medium text-zinc-500">
                  Timestamp
                </th>
                <th className="px-4 py-2.5 font-medium text-zinc-500">
                  Value
                </th>
                <th className="px-4 py-2.5 font-medium text-zinc-500">
                  Unit
                </th>
                <th className="px-4 py-2.5 font-medium text-zinc-500">
                  Quality Score
                </th>
              </tr>
            </thead>
            <tbody>
              {readings.map((r, i) => {
                const ts = Number(r.attributes.timestamp ?? 0);
                const rawValue = Number(r.attributes.value ?? 0);
                const value = rawValue / VALUE_SCALE;
                const unit = String(r.attributes.unit ?? "");
                const quality = Number(r.attributes.quality_score ?? 0);

                return (
                  <tr
                    key={r.entityKey}
                    className={`border-b border-white/[0.03] transition hover:bg-white/[0.03] ${
                      i % 2 === 0 ? "" : "bg-white/[0.01]"
                    }`}
                  >
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-400">
                      {formatTimestamp(ts)}
                    </td>
                    <td className="px-4 py-2 font-mono text-zinc-200">
                      {value.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-zinc-500">{unit}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${qualityBadgeColor(quality)}`}
                      >
                        {quality}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Stat Card ───────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/60 px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
