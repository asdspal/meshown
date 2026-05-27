"use client";

/**
 * AddCalibrationModal — Modal for adding a CalibrationRecord to a device on Arkiv.
 *
 * Blueprint §5 (Screen 3), §4 (Entity 3: CalibrationRecord), §6 (Calibration Endpoints).
 * Auth: G4 personal_sign nonce pattern via useWalletAuth hook.
 *
 * Form fields: device (select from owned devices), offset_value, offset_unit,
 * calibration_method, notes, valid_until (date picker → Unix ms).
 * On submit: fetches auth signature, POSTs to /api/calibration/add.
 */

import { useState } from "react";
import { useWalletAuth } from "@/lib/useWalletAuth";

interface DeviceEntry {
  entityKey: string;
  attributes: Record<string, string | number>;
  payload: unknown;
}

interface AddCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: DeviceEntry[];
  onSuccess?: () => void;
}

export default function AddCalibrationModal({
  isOpen,
  onClose,
  devices,
  onSuccess,
}: AddCalibrationModalProps) {
  const { getAuthSignature } = useWalletAuth();

  const [deviceKey, setDeviceKey] = useState("");
  const [offsetValue, setOffsetValue] = useState("");
  const [offsetUnit, setOffsetUnit] = useState("");
  const [calibrationMethod, setCalibrationMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    entityKey: string;
    txHash: string;
  } | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setDeviceKey("");
    setOffsetValue("");
    setOffsetUnit("");
    setCalibrationMethod("");
    setNotes("");
    setValidUntil("");
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
    if (!offsetUnit) {
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
          setOffsetUnit(defaultUnits[sensorType]);
        }
      }
    }
  };

  // Default valid_until to 1 year from now if not set
  const getDefaultValidUntil = (): string => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const numOffset = parseFloat(offsetValue);
      if (isNaN(numOffset)) {
        throw new Error("Offset value must be a number");
      }

      if (!offsetUnit.trim()) {
        throw new Error("Offset unit is required");
      }

      if (!calibrationMethod.trim()) {
        throw new Error("Calibration method is required");
      }

      // Convert date string to Unix ms (end of day)
      const dateStr = validUntil || getDefaultValidUntil();
      const validUntilMs = new Date(dateStr + "T23:59:59.999Z").getTime();
      if (validUntilMs <= Date.now()) {
        throw new Error("Valid until date must be in the future");
      }

      // G4: Fetch nonce + sign with wallet
      const auth = await getAuthSignature();

      // POST to calibration endpoint
      const res = await fetch("/api/calibration/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...auth,
          deviceKey,
          offset_value: numOffset,
          offset_unit: offsetUnit.trim(),
          calibration_method: calibrationMethod.trim(),
          notes: notes.trim(),
          valid_until_ms: validUntilMs,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error || `Calibration submission failed (HTTP ${res.status})`,
        );
      }

      const data = (await res.json()) as { entityKey: string; txHash: string };
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
      <div className="mx-4 w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-md">
        {/* ── Header ────────────────────────────────────── */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Add Calibration</h2>
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
              Calibration Added!
            </h3>
            <p className="mb-4 text-sm text-zinc-400">
              The calibration record has been created on Arkiv and ownership
              transferred to your wallet.
            </p>
            <div className="mb-4 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-left">
              <p className="mb-1 text-xs text-zinc-500">Entity Key</p>
              <p className="break-all font-mono text-xs text-indigo-400">
                {success.entityKey}
              </p>
              <p className="mt-2 mb-1 text-xs text-zinc-500">
                Transaction Hash
              </p>
              <p className="break-all font-mono text-xs text-indigo-400">
                {success.txHash}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Done
            </button>
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
                htmlFor="cal-device"
                className="mb-1.5 block text-xs font-medium text-zinc-400"
              >
                Device *
              </label>
              <select
                id="cal-device"
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

            {/* Offset Value + Offset Unit row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="cal-offset"
                  className="mb-1.5 block text-xs font-medium text-zinc-400"
                >
                  Offset Value *
                </label>
                <input
                  id="cal-offset"
                  type="number"
                  required
                  step="any"
                  value={offsetValue}
                  onChange={(e) => setOffsetValue(e.target.value)}
                  placeholder="e.g. -0.5"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder-zinc-600 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label
                  htmlFor="cal-unit"
                  className="mb-1.5 block text-xs font-medium text-zinc-400"
                >
                  Offset Unit *
                </label>
                <input
                  id="cal-unit"
                  type="text"
                  required
                  value={offsetUnit}
                  onChange={(e) => setOffsetUnit(e.target.value)}
                  placeholder="e.g. ppm, °C"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder-zinc-600 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Calibration Method */}
            <div>
              <label
                htmlFor="cal-method"
                className="mb-1.5 block text-xs font-medium text-zinc-400"
              >
                Calibration Method *
              </label>
              <input
                id="cal-method"
                type="text"
                required
                value={calibrationMethod}
                onChange={(e) => setCalibrationMethod(e.target.value)}
                placeholder="e.g. Reference gas, Ice bath, NIST traceable"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder-zinc-600 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Valid Until */}
            <div>
              <label
                htmlFor="cal-valid"
                className="mb-1.5 block text-xs font-medium text-zinc-400"
              >
                Valid Until
              </label>
              <input
                id="cal-valid"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 [color-scheme:dark]"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Defaults to 1 year from today if left empty.
              </p>
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="cal-notes"
                className="mb-1.5 block text-xs font-medium text-zinc-400"
              >
                Notes
              </label>
              <textarea
                id="cal-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Calibration details, environmental conditions, etc."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder-zinc-600 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              />
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
                disabled={
                  submitting ||
                  !deviceKey ||
                  !offsetValue.trim() ||
                  !offsetUnit.trim() ||
                  !calibrationMethod.trim()
                }
                className="flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                {submitting ? "Signing & Saving…" : "Add Calibration"}
              </button>
            </div>

            <p className="text-center text-xs text-zinc-600">
              You'll be prompted to sign a message with your wallet to verify
              ownership.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
