"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import SensorDetailSidebar from "@/components/SensorDetailSidebar";
import { COORD_SCALE } from "@/lib/arkiv";

/**
 * Sensor Detail — Client Component wrapper.
 *
 * Blueprint §5 (Screen 2):
 *   Fetches device + calibrations client-side via API routes.
 *   Two-column layout: sidebar (280px) + main content area.
 *
 * [GAP] Blueprint does not strictly define server vs client fetching strategy.
 * Using client component because wallet state (useAccount) is needed for
 * owner-only controls, and Next.js App Router implies server components for
 * data fetching but wallet state requires client.
 */

// ── Types ───────────────────────────────────────────────────────

interface DeviceData {
  entityKey: string;
  owner: string | null;
  creator: string | null;
  attributes: Record<string, string | number>;
  payload: {
    name?: string;
    description?: string;
    manufacturer?: string;
    firmwareVersion?: string;
  } | null;
  contentType: string | null;
  createdAtBlock: string | null;
  lastModifiedAtBlock: string | null;
  expiresAtBlock: string | null;
}

interface CalibrationData {
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
  contentType: string | null;
}

export default function SensorDetailContent({
  entityKey,
}: {
  entityKey: string;
}) {
  const router = useRouter();
  const { address: walletAddress } = useAccount();

  const [device, setDevice] = useState<DeviceData | null>(null);
  const [calibrations, setCalibrations] = useState<CalibrationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch device and calibrations on mount ──────────────────
  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch device
        const deviceRes = await fetch(
          `/api/device/${entityKey}`,
          { signal: controller.signal },
        );

        if (!deviceRes.ok) {
          if (deviceRes.status === 404) {
            setError("Device not found");
          } else {
            const body = await deviceRes.json().catch(() => ({}));
            setError(body.error || `Failed to load device (${deviceRes.status})`);
          }
          return;
        }

        const deviceData: DeviceData = await deviceRes.json();
        setDevice(deviceData);

        // Fetch calibrations for this device
        const calRes = await fetch(
          `/api/calibrations?deviceKey=${entityKey}`,
          { signal: controller.signal },
        );

        if (calRes.ok) {
          const calData = await calRes.json();
          setCalibrations(calData.calibrations ?? []);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    return () => controller.abort();
  }, [entityKey]);

  // ── Loading state ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
          <p className="text-sm text-zinc-500">Loading sensor…</p>
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────
  if (error || !device) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4">
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-6 py-4">
          <p className="text-sm text-red-400">{error ?? "Device not found"}</p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
        >
          ← Back to Map
        </button>
      </div>
    );
  }

  // ── Extract device attributes ───────────────────────────────
  const attrs = device.attributes;
  const payload = device.payload ?? {};
  const name = payload.name ?? "Untitled Sensor";
  const description = payload.description ?? "";
  const manufacturer = payload.manufacturer ?? "";
  const firmwareVersion = payload.firmwareVersion ?? "";
  const sensorType = String(attrs.sensor_type ?? "unknown");
  const status = String(attrs.status ?? "unknown");
  const latRaw = Number(attrs.lat ?? 0);
  const lngRaw = Number(attrs.lng ?? 0);
  const lat = latRaw / COORD_SCALE;
  const lng = lngRaw / COORD_SCALE;
  const registeredAt = Number(attrs.registered_at ?? 0);

  return (
    <div className="flex h-full w-full">
      {/* ── Left sidebar (280px) ──────────────────────────────── */}
      <SensorDetailSidebar
        entityKey={entityKey}
        name={name}
        description={description}
        manufacturer={manufacturer}
        firmwareVersion={firmwareVersion}
        sensorType={sensorType}
        status={status}
        lat={lat}
        lng={lng}
        registeredAt={registeredAt}
        owner={device.owner}
        creator={device.creator}
        calibrations={calibrations}
        walletAddress={walletAddress ?? null}
      />

      {/* ── Main content area ─────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-4xl">
          {/* Back button */}
          <button
            onClick={() => router.push("/")}
            className="mb-6 flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-300"
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
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            Back to Map
          </button>

          {/* Device header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">{name}</h1>
            {description && (
              <p className="mt-2 text-sm text-zinc-400">{description}</p>
            )}
          </div>

          {/* Charts + readings table placeholder — deferred to M3.3 */}
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
            <p className="text-sm text-zinc-500">
              Reading history charts and data table
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              Coming in Step M3.3
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
