"use client";

/**
 * RegisterDeviceModal — Modal for registering a new SensorDevice on Arkiv.
 *
 * Blueprint §5 (Screen 3), §4 (Entity 1: SensorDevice), §6 (Device Endpoints).
 * Auth: G4 personal_sign nonce pattern via useWalletAuth hook.
 *
 * Form fields: name, description, sensor_type, lat, lng, manufacturer, firmwareVersion.
 * On submit: fetches auth signature, POSTs to /api/device/register.
 */

import { useState } from "react";
import { useWalletAuth } from "@/lib/useWalletAuth";

const SENSOR_TYPES = [
  { value: "air_quality", label: "Air Quality" },
  { value: "temperature", label: "Temperature" },
  { value: "energy", label: "Energy" },
  { value: "soil", label: "Soil" },
  { value: "weather", label: "Weather" },
];

interface RegisterDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RegisterDeviceModal({
  isOpen,
  onClose,
  onSuccess,
}: RegisterDeviceModalProps) {
  const { getAuthSignature } = useWalletAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [firmwareVersion, setFirmwareVersion] = useState("");
  const [sensorType, setSensorType] = useState("air_quality");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    entityKey: string;
    txHash: string;
  } | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setName("");
    setDescription("");
    setManufacturer("");
    setFirmwareVersion("");
    setSensorType("air_quality");
    setLat("");
    setLng("");
    setError(null);
    setSuccess(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Validate coordinates client-side
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);

      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        throw new Error("Latitude must be between -90 and 90");
      }
      if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        throw new Error("Longitude must be between -180 and 180");
      }

      // G4: Fetch nonce + sign with wallet
      const auth = await getAuthSignature();

      // POST to device registration endpoint
      const res = await fetch("/api/device/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...auth,
          name,
          description,
          manufacturer,
          firmwareVersion,
          sensor_type: sensorType,
          lat: latNum,
          lng: lngNum,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Registration failed (HTTP ${res.status})`);
      }

      const data = (await res.json()) as { entityKey: string; txHash: string };
      setSuccess(data);
      onSuccess?.();
    } catch (err) {
      if (err instanceof Error) {
        // User rejected signing
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
          <h2 className="text-lg font-bold text-white">Register New Device</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Success state ─────────────────────────────── */}
        {success ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
              <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">Device Registered!</h3>
            <p className="mb-4 text-sm text-zinc-400">
              Your device has been created on Arkiv and ownership transferred to your wallet.
            </p>
            <div className="mb-4 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-left">
              <p className="mb-1 text-xs text-zinc-500">Entity Key</p>
              <p className="break-all font-mono text-xs text-indigo-400">{success.entityKey}</p>
              <p className="mt-2 mb-1 text-xs text-zinc-500">Transaction Hash</p>
              <p className="break-all font-mono text-xs text-indigo-400">{success.txHash}</p>
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
            {/* Error banner */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Device Name */}
            <div>
              <label htmlFor="reg-name" className="mb-1.5 block text-xs font-medium text-zinc-400">
                Device Name *
              </label>
              <input
                id="reg-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Air Quality Sensor #42"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder-zinc-600 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="reg-desc" className="mb-1.5 block text-xs font-medium text-zinc-400">
                Description
              </label>
              <input
                id="reg-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the sensor"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder-zinc-600 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Sensor Type */}
            <div>
              <label htmlFor="reg-type" className="mb-1.5 block text-xs font-medium text-zinc-400">
                Sensor Type *
              </label>
              <select
                id="reg-type"
                required
                value={sensorType}
                onChange={(e) => setSensorType(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {SENSOR_TYPES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Lat / Lng row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-lat" className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Latitude *
                </label>
                <input
                  id="reg-lat"
                  type="number"
                  required
                  step="any"
                  min={-90}
                  max={90}
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="e.g. 41.1579"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder-zinc-600 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="reg-lng" className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Longitude *
                </label>
                <input
                  id="reg-lng"
                  type="number"
                  required
                  step="any"
                  min={-180}
                  max={180}
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="e.g. -8.6291"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder-zinc-600 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Manufacturer + Firmware row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-mfg" className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Manufacturer
                </label>
                <input
                  id="reg-mfg"
                  type="text"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="e.g. Sensirion"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder-zinc-600 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="reg-fw" className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Firmware Version
                </label>
                <input
                  id="reg-fw"
                  type="text"
                  value={firmwareVersion}
                  onChange={(e) => setFirmwareVersion(e.target.value)}
                  placeholder="e.g. 2.1.0"
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
                disabled={submitting || !name.trim()}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting && (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {submitting ? "Signing & Registering…" : "Register Device"}
              </button>
            </div>

            {/* Auth flow hint */}
            <p className="text-center text-xs text-zinc-600">
              You'll be prompted to sign a message with your wallet to verify ownership.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
