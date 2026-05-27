"use client";

import Link from "next/link";

/**
 * AlertCard — displays a single AnomalyAlert entity.
 *
 * Blueprint §5 (Screen 5: Alert Feed):
 *   - Severity badge (colour-coded)
 *   - Device name + sensor type
 *   - Description (from payload)
 *   - Values: baseline → observed, confidence score
 *   - Timestamps: detected at
 *   - Attribution: "Detected by AI Agent 0xagent..." ($creator)
 *                  "Owned by 0xowner..." ($owner)
 *   - Link to sensor detail page
 *
 * Entity 4 (AnomalyAlert) payload:
 *   anomaly_type, description, baseline_value, observed_value, confidence, affected_reading_key
 * Attributes:
 *   device_key, sensor_type, severity, lat, lng, timestamp, confidence
 */

// ── Types ─────────────────────────────────────────────────────

interface AlertPayload {
  anomaly_type?: string;
  description?: string;
  baseline_value?: number;
  observed_value?: number;
  confidence?: number;
  affected_reading_key?: string;
}

export interface AlertEntry {
  entityKey: string;
  owner: string | null;
  creator: string | null;
  attributes: Record<string, string | number>;
  payload: unknown;
  contentType: string | null;
  createdAtBlock: string | null;
}

// ── Helpers ───────────────────────────────────────────────────

/** Truncate a hex wallet address to 0x1234...abcd pattern */
function truncateAddress(addr: string | null): string {
  if (!addr || addr.length < 12) return addr ?? "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Format Unix-ms timestamp to locale string */
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
  });
}

/** Human-readable sensor type label */
function sensorTypeLabel(type: string): string {
  const map: Record<string, string> = {
    air_quality: "Air Quality",
    temperature: "Temperature",
    energy: "Energy",
    soil: "Soil",
    weather: "Weather",
  };
  return map[type] ?? type;
}

/** Severity badge config (Blueprint §5 colour spec) */
const SEVERITY_CONFIG: Record<
  string,
  { bg: string; text: string; ring: string; icon: string }
> = {
  high: {
    bg: "bg-red-500/15",
    text: "text-red-400",
    ring: "ring-red-500/30",
    icon: "⚠",
  },
  medium: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    ring: "ring-amber-500/30",
    icon: "⚡",
  },
  low: {
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    ring: "ring-blue-500/30",
    icon: "ℹ",
  },
};

// ── Component ─────────────────────────────────────────────────

export default function AlertCard({ alert }: { alert: AlertEntry }) {
  const attrs = alert.attributes;
  const payload = (alert.payload ?? {}) as AlertPayload;

  const severity =
    typeof attrs.severity === "string" ? attrs.severity : "low";
  const sensorType =
    typeof attrs.sensor_type === "string" ? attrs.sensor_type : "unknown";
  const deviceKey =
    typeof attrs.device_key === "string" ? attrs.device_key : null;
  const timestamp =
    typeof attrs.timestamp === "number" ? attrs.timestamp : 0;
  const confidenceAttr =
    typeof attrs.confidence === "number" ? attrs.confidence : null;

  const description =
    payload.description ?? "Anomaly detected by AI agent";
  const baselineValue = payload.baseline_value;
  const observedValue = payload.observed_value;
  const confidencePayload = payload.confidence;

  // Display confidence from payload (float 0-1) or attribute (int 0-100)
  const confidenceDisplay =
    confidencePayload != null
      ? `${(confidencePayload * 100).toFixed(0)}%`
      : confidenceAttr != null
        ? `${confidenceAttr}%`
        : "—";

  const sevCfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.low;

  return (
    <div className="group rounded-xl border border-white/10 bg-zinc-900/90 p-5 backdrop-blur-md transition-all hover:border-white/20 hover:bg-zinc-900">
      {/* ── Header: severity + timestamp ─────────────────── */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${sevCfg.bg} ${sevCfg.text} ${sevCfg.ring}`}
        >
          {sevCfg.icon} {severity.toUpperCase()}
        </span>

        <span className="text-xs text-zinc-500">
          {formatTimestamp(timestamp)}
        </span>
      </div>

      {/* ── Sensor type badge ────────────────────────────── */}
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex items-center rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
          {sensorTypeLabel(sensorType)}
        </span>
        {deviceKey && (
          <Link
            href={`/sensor/${deviceKey}`}
            className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
          >
            View sensor →
          </Link>
        )}
      </div>

      {/* ── Description ──────────────────────────────────── */}
      <p className="mb-4 text-sm leading-relaxed text-zinc-300">
        {description}
      </p>

      {/* ── Values: baseline → observed ──────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        {baselineValue != null && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">Baseline</span>
            <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-sm text-zinc-300">
              {typeof baselineValue === "number"
                ? baselineValue.toFixed(2)
                : baselineValue}
            </span>
          </div>
        )}

        {baselineValue != null && observedValue != null && (
          <svg
            className="h-4 w-4 text-zinc-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        )}

        {observedValue != null && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">Observed</span>
            <span
              className={`rounded px-2 py-0.5 font-mono text-sm ${
                severity === "high"
                  ? "bg-red-500/10 text-red-400"
                  : severity === "medium"
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-blue-500/10 text-blue-400"
              }`}
            >
              {typeof observedValue === "number"
                ? observedValue.toFixed(2)
                : observedValue}
            </span>
          </div>
        )}

        {confidenceDisplay !== "—" && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">Confidence</span>
            <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-sm text-emerald-400">
              {confidenceDisplay}
            </span>
          </div>
        )}
      </div>

      {/* ── Attribution (Blueprint §5) ────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/5 pt-3 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <svg
            className="h-3.5 w-3.5 text-indigo-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          Detected by AI Agent{" "}
          <span className="font-mono text-indigo-400">
            {truncateAddress(alert.creator)}
          </span>
        </span>
        <span className="hidden text-zinc-700 sm:inline">—</span>
        <span className="flex items-center gap-1">
          <svg
            className="h-3.5 w-3.5 text-emerald-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          Owned by{" "}
          <span className="font-mono text-emerald-400">
            {truncateAddress(alert.owner)}
          </span>
        </span>
      </div>
    </div>
  );
}
