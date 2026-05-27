"use client";

/**
 * SubmitReadingPanel — Panel for submitting a sensor reading on the Owner Dashboard.
 *
 * Blueprint §5 (Screen 3), §4 (Entity 2: Reading), §6 (Reading Endpoints).
 * Auth: G4 personal_sign nonce pattern via useWalletAuth hook.
 *
 * Form fields: device (select from owned devices), value, unit.
 * quality_score is computed server-side (not submitted by client).
 * On submit: fetches auth signature, POSTs to /api/reading/submit.
 *
 * [GAP] Blueprint does not specify exact panel vs. modal — inferred as a panel
 * to distinguish from the modal pattern used for device registration and calibration.
 */

import { useState } from "react";
import { useWalletAuth } from "@/lib/useWalletAuth";

interface DeviceEntry {
  entityKey: string;
  attributes: Record<string, string | number>;
  payload: unknown;
}

interface SubmitReadingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  devices: DeviceEntry[];
  onSuccess?: () => void;
}

export default function SubmitReadingPanel({
  isOpen,
  onClose,
  devices,
  onSuccess,
}: SubmitReadingPanelProps) {
  const { getAuthSignature } = useWalletAuth();

  const [deviceKey, setDeviceKey] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    entityKey: string;
    txHash: string;
    quality_score: number;
  } | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setDeviceKey("");
    setValue("");
    setUnit("");
    setError(null);
    setSuccess(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Auto-set unit from selected device's sensor type
  const handleDeviceChange = (key: string) => {
    setDeviceKey(key);
    if (!unit) {
      const device = devices.find((d) => d.entityKey === key);
      if (device) {
        const sensorType = device.attributes.sensor_type;
        const defaultUnits: Record<string, string> = {
          air_quality: "ppm",
          temperature: "°C",
          energy: "kWh",
          soil: "%",
          weather: "hPa",
        };
        if (typeof sensorType === "string" && defaultUnits[sensorType]) {
          setUnit(defaultUnits[sensorType]);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        throw new Error("Value must be a number");
      }

      // G4: Fetch nonce + sign with wallet
      const auth = await getAuthSignature();

      // POST to reading submission endpoint
      const res = await fetch("/api/reading/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...auth,
          deviceKey,
          value: numValue,
          unit,
          // raw field required by server schema but not user-facing
          raw: { value: numValue },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error || `Reading submission failed (HTTP ${res.status})`,
        );
      }

      const data = (await res.json()) as {
        entityKey: string;
        txHash: string;
        quality_score: number;
      };
      setSuccess(data);
      onSuccess?.();
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("User rejected")) {
          setError("Signature request was rejected. Please try again.");
        } else {
          setError(err.message);
        }
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-md">
        {/* ── Header ────────────────────────────────────── */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Submit Reading</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* ── Success state ─────────────────────────────── */}
        {success ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
              <svg
                className="h-8 w-8 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">
              Reading Submitted!
            </h3>
            <p className="mb-4 text-sm text-zinc-400">
              Quality score:{" "}
              <span
                className={`font-semibold ${
                  success.quality_score >= 80
                    ? "text-emerald-400"
                    : success.quality_score >= 50
                      ? "text-amber-400"
                      : "text-red-400"
                }`}
              >
                {success.quality_score}
              </span>
            </p>
            <div className="mb-4 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-left">
              <p className="mb-1 text-xs text-zinc-500">Entity Key</p>
              <p className="break-all font-mono text-xs text-indigo-400">
                {success.entityKey}
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  setSuccess(null);
                  setValue("");
                  setError(null);
                }}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
              >
                Submit Another
              </button>
              <button
                onClick={handleClose}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* ── Form ────────────────────────────────────────── */
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Device selector */}
            <div>
              <label
                htmlFor="read-device"
                className="mb-1.5 block text-xs font-medium text-zinc-400"
              >
                Device *
              </label>
              <select
                id="read-device"
                required
                value={deviceKey}
                onChange={(e) => handleDeviceChange(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select a device…</option>
                {devices.map((d) => {
                  const name =
                    typeof d.attributes.name === "string"
                      ? d.attributes.name
                      : d.entityKey.slice(0, 12) + "…";
                  return (
                    <option key={d.entityKey} value={d.entityKey}>
                      {name}
                    </option>
                  );
                })}
              </select>
              {devices.length === 0 && (
                <p className="mt-1 text-xs text-zinc-500">
                  No devices found. Register a device first.
                </p>
              )}
            </div>

            {/* Value + Unit row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="read-value"
                  className="mb-1.5 block text-xs font-medium text-zinc-400"
                >
                  Value *
                </label>
                <input
                  id="read-value"
                  type="number"
                  required
                  step="any"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g. 42.5"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder-zinc-600 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label
                  htmlFor="read-unit"
                  className="mb-1.5 block text-xs font-medium text-zinc-400"
                >
                  Unit *
                </label>
                <input
                  id="read-unit"
                  type="text"
                  required
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. ppm, °C"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder-zinc-600 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !deviceKey || !value.trim() || !unit.trim()}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting && (
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
                {submitting ? "Signing & Submitting…" : "Submit Reading"}
              </button>
            </div>

            <p className="text-center text-xs text-zinc-600">
              Quality score will be computed server-side based on neighboring
              sensors.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
