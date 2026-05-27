"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import AlertCard from "@/components/AlertCard";
import type { AlertEntry } from "@/components/AlertCard";

/**
 * AlertFeedContent — Client Component for the Alert Feed screen.
 *
 * Blueprint §5 (Screen 5: Alert Feed):
 *   - Single-column feed with filter bar.
 *   - Filter bar: severity (all/low/medium/high), sensor type.
 *   - Fetches from GET /api/alerts with filter params.
 *   - Renders AlertCard components with attribution.
 *
 * Follows the query-content.tsx pattern:
 *   - useSearchParams() for URL-based filter state (G8 linkability).
 *   - AbortController for request cancellation on param change/unmount.
 *   - Dark glass-morphism styling.
 */

// ── Constants ─────────────────────────────────────────────────

const SEVERITY_OPTIONS = [
  { value: "all", label: "All Severities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;

const SENSOR_TYPE_OPTIONS = [
  { value: "all", label: "All Sensor Types" },
  { value: "air_quality", label: "Air Quality" },
  { value: "temperature", label: "Temperature" },
  { value: "energy", label: "Energy" },
  { value: "soil", label: "Soil" },
  { value: "weather", label: "Weather" },
] as const;

// ── Component ─────────────────────────────────────────────────

export default function AlertFeedContent() {
  // ── Filter state ──────────────────────────────────────────
  const [severity, setSeverity] = useState<string>("all");
  const [sensorType, setSensorType] = useState<string>("all");

  // ── Data state ────────────────────────────────────────────
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch alerts from API ─────────────────────────────────
  const fetchAlerts = useCallback(
    (signal: AbortSignal) => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (severity !== "all") params.set("severity", severity);
      params.set("limit", "200");

      const url = `/api/alerts?${params.toString()}`;

      fetch(url, { signal })
        .then(async (res) => {
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(
              body.error ?? `HTTP ${res.status}: Failed to fetch alerts`,
            );
          }
          return res.json();
        })
        .then((data: { alerts: AlertEntry[] }) => {
          setAlerts(data.alerts ?? []);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(
            err instanceof Error ? err.message : "Failed to fetch alerts",
          );
        })
        .finally(() => setLoading(false));
    },
    [severity],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchAlerts(controller.signal);
    return () => controller.abort();
  }, [fetchAlerts]);

  // ── Client-side sensor_type filter ────────────────────────
  // The /api/alerts endpoint doesn't support sensor_type filtering,
  // so we filter client-side after fetching.
  const filteredAlerts = useMemo(() => {
    if (sensorType === "all") return alerts;
    return alerts.filter((a) => {
      const st =
        typeof a.attributes?.sensor_type === "string"
          ? a.attributes.sensor_type
          : "";
      return st === sensorType;
    });
  }, [alerts, sensorType]);

  // ── Severity counts for summary ───────────────────────────
  const severityCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    for (const a of filteredAlerts) {
      const s =
        typeof a.attributes?.severity === "string"
          ? a.attributes.severity
          : "low";
      if (s in counts) counts[s as keyof typeof counts]++;
    }
    return counts;
  }, [filteredAlerts]);

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Map
            </Link>
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <h1 className="text-lg font-semibold">Alert Feed</h1>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-400 transition-colors hover:text-white"
          >
            Dashboard →
          </Link>
        </div>
      </header>

      {/* ── Filter Bar ─────────────────────────────────────── */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-4 px-6 py-4">
          {/* Severity filter */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="severity-filter"
              className="text-xs font-medium text-zinc-500"
            >
              Severity
            </label>
            <select
              id="severity-filter"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
            >
              {SEVERITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sensor type filter (client-side) */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="sensor-type-filter"
              className="text-xs font-medium text-zinc-500"
            >
              Sensor Type
            </label>
            <select
              id="sensor-type-filter"
              value={sensorType}
              onChange={(e) => setSensorType(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
            >
              {SENSOR_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Summary counts */}
          {!loading && !error && filteredAlerts.length > 0 && (
            <div className="ml-auto flex items-center gap-3 text-xs text-zinc-500">
              <span>{filteredAlerts.length} alert{filteredAlerts.length !== 1 ? "s" : ""}</span>
              {severityCounts.high > 0 && (
                <span className="flex items-center gap-1 text-red-400">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                  {severityCounts.high}
                </span>
              )}
              {severityCounts.medium > 0 && (
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                  {severityCounts.medium}
                </span>
              )}
              {severityCounts.low > 0 && (
                <span className="flex items-center gap-1 text-blue-400">
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                  {severityCounts.low}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Content ───────────────────────────────────── */}
      <main className="mx-auto max-w-4xl px-6 py-6">
        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <svg
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-300">
                Failed to load alerts
              </p>
              <p className="mt-1 text-xs text-red-400/80">{error}</p>
            </div>
            <button
              onClick={() => {
                const controller = new AbortController();
                fetchAlerts(controller.signal);
              }}
              className="text-xs text-red-400 underline hover:text-red-300"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-white/5 bg-zinc-900/60 p-5"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="h-6 w-16 rounded-full bg-zinc-800" />
                  <div className="ml-auto h-4 w-32 rounded bg-zinc-800" />
                </div>
                <div className="mb-2 h-5 w-24 rounded bg-zinc-800" />
                <div className="mb-4 h-4 w-3/4 rounded bg-zinc-800" />
                <div className="flex gap-4">
                  <div className="h-8 w-24 rounded bg-zinc-800" />
                  <div className="h-8 w-8 rounded bg-zinc-800" />
                  <div className="h-8 w-24 rounded bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredAlerts.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-zinc-900/90 p-12 text-center backdrop-blur-md">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800">
              <svg
                className="h-8 w-8 text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-zinc-300">
              No alerts found
            </h3>
            <p className="text-sm text-zinc-500">
              {severity !== "all" || sensorType !== "all"
                ? "Try adjusting your filters to see more alerts."
                : "The AI anomaly agent hasn't detected any anomalies yet. Alerts will appear here once the cron scan runs."}
            </p>
          </div>
        )}

        {/* Alert feed */}
        {!loading && !error && filteredAlerts.length > 0 && (
          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <AlertCard key={alert.entityKey} alert={alert} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
