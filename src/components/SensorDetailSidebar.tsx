"use client";

/**
 * Sensor Detail Sidebar — Screen 2, left column (280px).
 *
 * Blueprint §5 (Screen 2):
 *   - Device name, type badge, status indicator
 *   - Owner wallet address, creator wallet ("Registered by")
 *   - Registration date
 *   - Calibration section: current record, status badge (Valid/Expiring/Expired),
 *     calibration history list
 *   - Owner-only controls: Submit Reading, Add Calibration, Edit, Transfer
 *
 * Calibration validity logic (Blueprint §5):
 *   - Find latest calibration where valid_from <= Date.now()
 *   - If none → "Uncalibrated"
 *   - If valid_until < Date.now() → "Expired" (red)
 *   - If valid_until < Date.now() + 30 days → "Expiring soon" (amber)
 *   - Else → "Valid" (green)
 *
 * All timestamps are in milliseconds as per Extraction 4 schema (1716800000000).
 */

import { ConnectButton } from "@rainbow-me/rainbowkit";

// ── Types ───────────────────────────────────────────────────────

interface CalibrationRecord {
  entityKey: string;
  owner: string | null;
  creator: string | null;
  attributes: Record<string, string | number>;
  payload: {
    offset_value?: number;
    offset_unit?: string;
    calibration_method?: string;
    notes?: string;
  } | null;
}

export interface SensorDetailSidebarProps {
  entityKey: string;
  name: string;
  description: string;
  manufacturer: string;
  firmwareVersion: string;
  sensorType: string;
  status: string;
  lat: number;
  lng: number;
  registeredAt: number;
  owner: string | null;
  creator: string | null;
  calibrations: CalibrationRecord[];
  walletAddress: string | null;
}

// ── Sensor type config ──────────────────────────────────────────

const SENSOR_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  air_quality: { label: "Air Quality", color: "bg-sky-500/20 text-sky-400", icon: "🌬" },
  temperature: { label: "Temperature", color: "bg-orange-500/20 text-orange-400", icon: "🌡" },
  energy: { label: "Energy", color: "bg-yellow-500/20 text-yellow-400", icon: "⚡" },
  soil: { label: "Soil", color: "bg-amber-700/20 text-amber-500", icon: "🌱" },
  weather: { label: "Weather", color: "bg-indigo-500/20 text-indigo-400", icon: "☁" },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; dot: string }
> = {
  active: { label: "Active", color: "text-emerald-400", dot: "bg-emerald-400" },
  inactive: { label: "Inactive", color: "text-zinc-400", dot: "bg-zinc-400" },
  calibration_needed: {
    label: "Calibration Needed",
    color: "text-amber-400",
    dot: "bg-amber-400",
  },
};

// ── Calibration status logic ────────────────────────────────────

type CalibrationStatus = {
  label: string;
  color: string;
  bg: string;
  border: string;
};

const THIRTY_DAYS_MS = 30 * 24 * 3600 * 1000;

/**
 * Compute calibration status from the calibration records list.
 *
 * Blueprint §5 (Screen 2):
 *   - Find the latest calibration where valid_from <= Date.now()
 *   - If none found → "Uncalibrated"
 *   - If valid_until < Date.now() → "Expired" (red)
 *   - If valid_until < Date.now() + 30 days → "Expiring soon" (amber)
 *   - Else → "Valid" (green)
 *
 * valid_from and valid_until are numeric milliseconds per Extraction 4 schema.
 */
function computeCalibrationStatus(
  calibrations: CalibrationRecord[],
): CalibrationStatus {
  const now = Date.now();

  // Sort by valid_from descending (most recent first) — already ordered by API
  // Find the latest calibration whose valid_from <= now
  const active = calibrations.find((c) => {
    const validFrom = Number(c.attributes.valid_from ?? 0);
    return validFrom <= now;
  });

  if (!active) {
    return {
      label: "Uncalibrated",
      color: "text-zinc-400",
      bg: "bg-zinc-500/10",
      border: "border-zinc-500/20",
    };
  }

  const validUntil = Number(active.attributes.valid_until ?? 0);

  if (validUntil < now) {
    return {
      label: "Expired",
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    };
  }

  if (validUntil < now + THIRTY_DAYS_MS) {
    return {
      label: "Expiring Soon",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    };
  }

  return {
    label: "Valid",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  };
}

// ── Utilities ───────────────────────────────────────────────────

/** Truncate an Ethereum address to `0x1234…abcd` format. */
function truncateAddress(addr: string): string {
  if (addr.length <= 13) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Format a Unix ms timestamp to a human-readable date. */
function formatDate(ms: number): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Format a Unix ms timestamp to a human-readable datetime. */
function formatDateTime(ms: number): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Component ───────────────────────────────────────────────────

export default function SensorDetailSidebar({
  entityKey,
  name,
  manufacturer,
  firmwareVersion,
  sensorType,
  status,
  lat,
  lng,
  registeredAt,
  owner,
  creator,
  calibrations,
  walletAddress,
}: SensorDetailSidebarProps) {
  // Owner check — case-insensitive hex comparison (matches API auth pattern)
  const isOwner =
    walletAddress !== null &&
    owner !== null &&
    walletAddress.toLowerCase() === owner.toLowerCase();

  const typeConfig = SENSOR_TYPE_CONFIG[sensorType] ?? {
    label: sensorType,
    color: "bg-zinc-500/20 text-zinc-400",
    icon: "📡",
  };
  const statusConfig = STATUS_CONFIG[status] ?? {
    label: status,
    color: "text-zinc-400",
    dot: "bg-zinc-400",
  };

  const calStatus = computeCalibrationStatus(calibrations);

  // Find the active calibration (valid_from <= now) for display
  const now = Date.now();
  const activeCal = calibrations.find(
    (c) => Number(c.attributes.valid_from ?? 0) <= now,
  );

  return (
    <aside
      className="flex h-full w-[280px] flex-shrink-0 flex-col gap-4 overflow-y-auto border-r border-white/10 bg-zinc-900/90 p-5"
      aria-label="Sensor details"
    >
      {/* ── Logo + Back link ─────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
          <svg
            className="h-4 w-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
            />
          </svg>
        </div>
        <span className="text-sm font-bold tracking-tight text-white">
          MeshOwn
        </span>
      </div>

      {/* ── Wallet connection ────────────────────────────────── */}
      <ConnectButton
        chainStatus="icon"
        showBalance={false}
        accountStatus="address"
      />

      {/* ── Device name + badges ─────────────────────────────── */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold text-white leading-tight">
          {name}
        </h2>

        {/* Type badge */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${typeConfig.color}`}
          >
            <span>{typeConfig.icon}</span>
            {typeConfig.label}
          </span>

          {/* Status indicator */}
          <span className="inline-flex items-center gap-1.5 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${statusConfig.dot}`}
            />
            <span className={statusConfig.color}>{statusConfig.label}</span>
          </span>
        </div>
      </div>

      {/* ── Device info ──────────────────────────────────────── */}
      <div className="space-y-3 rounded-xl border border-white/5 bg-zinc-800/50 p-3">
        {/* Owner */}
        {owner && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">
              Owner
            </p>
            <p className="mt-0.5 font-mono text-xs text-zinc-300">
              {truncateAddress(owner)}
            </p>
          </div>
        )}

        {/* Creator — "Registered by" */}
        {creator && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">
              Registered by
            </p>
            <p className="mt-0.5 font-mono text-xs text-zinc-300">
              {truncateAddress(creator)}
            </p>
          </div>
        )}

        {/* Registration date */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
            Registered
          </p>
          <p className="mt-0.5 text-xs text-zinc-300">
            {formatDate(registeredAt)}
          </p>
        </div>

        {/* Coordinates */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
            Coordinates
          </p>
          <p className="mt-0.5 font-mono text-xs text-zinc-300">
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </p>
        </div>

        {/* Manufacturer + firmware */}
        {manufacturer && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">
              Manufacturer
            </p>
            <p className="mt-0.5 text-xs text-zinc-300">
              {manufacturer}
              {firmwareVersion && (
                <span className="ml-1 text-zinc-500">
                  v{firmwareVersion}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Entity key (truncated) */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
            Entity Key
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-zinc-500 break-all">
            {entityKey}
          </p>
        </div>
      </div>

      {/* ── Calibration section ──────────────────────────────── */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Calibration
        </h3>

        {/* Status badge */}
        <div
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${calStatus.color} ${calStatus.bg} ${calStatus.border}`}
        >
          {calStatus.label === "Valid" && (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
          {calStatus.label === "Expiring Soon" && (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          )}
          {calStatus.label === "Expired" && (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {calStatus.label === "Uncalibrated" && (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          )}
          {calStatus.label}
        </div>

        {/* Active calibration details */}
        {activeCal && (
          <div className="space-y-1.5 rounded-lg border border-white/5 bg-zinc-800/30 p-2.5">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                Valid from
              </p>
              <p className="mt-0.5 text-xs text-zinc-300">
                {formatDateTime(Number(activeCal.attributes.valid_from ?? 0))}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                Valid until
              </p>
              <p className="mt-0.5 text-xs text-zinc-300">
                {formatDateTime(Number(activeCal.attributes.valid_until ?? 0))}
              </p>
            </div>
            {activeCal.attributes.calibrated_by && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Calibrated by
                </p>
                <p className="mt-0.5 font-mono text-xs text-zinc-300">
                  {truncateAddress(String(activeCal.attributes.calibrated_by))}
                </p>
              </div>
            )}
            {activeCal.payload?.calibration_method && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Method
                </p>
                <p className="mt-0.5 text-xs text-zinc-300">
                  {activeCal.payload.calibration_method.replace(/_/g, " ")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Calibration history list */}
        {calibrations.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-xs text-zinc-500 transition hover:text-zinc-300">
              Calibration history ({calibrations.length})
            </summary>
            <div className="mt-2 space-y-1.5">
              {calibrations.map((cal) => {
                const vf = Number(cal.attributes.valid_from ?? 0);
                const vu = Number(cal.attributes.valid_until ?? 0);
                const calNow = Date.now();
                const isExpired = vu < calNow;
                const isCurrent = vf <= calNow && vu >= calNow;

                return (
                  <div
                    key={cal.entityKey}
                    className={`rounded-lg border p-2 text-xs ${
                      isCurrent
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : isExpired
                          ? "border-zinc-700 bg-zinc-800/30 opacity-60"
                          : "border-zinc-700 bg-zinc-800/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-300">
                        {formatDate(vf)}
                      </span>
                      {isCurrent && (
                        <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-400">
                          Active
                        </span>
                      )}
                      {isExpired && (
                        <span className="rounded-full bg-zinc-600/20 px-1.5 py-0.5 text-[10px] text-zinc-500">
                          Expired
                        </span>
                      )}
                    </div>
                    {cal.payload?.notes && (
                      <p className="mt-1 text-[10px] text-zinc-500 line-clamp-2">
                        {cal.payload.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </div>

      {/* ── Owner-only controls ──────────────────────────────── */}
      {isOwner && (
        <div className="space-y-2 border-t border-white/5 pt-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Owner Controls
          </h3>

          {/* Submit New Reading */}
          <button
            className="flex w-full items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-indigo-500"
            title="Submit a new sensor reading"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Submit New Reading
          </button>

          {/* Add Calibration Record */}
          <button
            className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-zinc-700 hover:text-white"
            title="Add a calibration record"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.78.929l-.15.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Add Calibration Record
          </button>

          {/* Edit Device Info */}
          <button
            className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-zinc-700 hover:text-white"
            title="Edit device information"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
              />
            </svg>
            Edit Device Info
          </button>

          {/* Transfer Ownership */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">
              Transfer Ownership
            </p>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="0x…"
                className="flex-1 rounded-lg border border-white/10 bg-zinc-800 px-2.5 py-1.5 font-mono text-xs text-zinc-300 placeholder-zinc-600 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
                title="Transfer ownership to another address"
              >
                Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer spacer ────────────────────────────────────── */}
      <div className="flex-1" />
    </aside>
  );
}
