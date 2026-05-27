"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * MeshMap — Client-only Leaflet map rendering device markers.
 *
 * Blueprint §5 (Screen 1), §7 (Phase 2), §10 (G2)
 *   - Full-viewport map with OpenStreetMap tiles [GAP: tile URL inferred]
 *   - Device markers with popups showing name, status, sensor type
 *   - Uses /api/devices endpoint (GET) to fetch registered sensors
 *
 * Data shape from GET /api/devices:
 *   { devices: [{ entityKey, attributes: { lat, lng, sensor_type, status, ... }, payload: {...} }], total }
 *
 * Coordinates stored as micro-degrees (COORD_SCALE = 1_000_000) — divide to get float degrees.
 */

// ── Fix Leaflet default marker icons (broken by webpack bundling) ──────
// Leaflet's default icon images are not included by webpack; point to CDN.
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// ── Scale factor matching src/lib/arkiv.ts ──────────────────────────────
const COORD_SCALE = 1_000_000;

// ── Types ───────────────────────────────────────────────────────────────
interface DeviceAttributes {
  lat: number;
  lng: number;
  sensor_type?: string;
  status?: string;
  registered_at?: string;
  [key: string]: string | number | undefined;
}

interface DevicePayload {
  name?: string;
  description?: string;
  manufacturer?: string;
  firmwareVersion?: string;
  [key: string]: unknown;
}

interface Device {
  entityKey: string;
  owner: string | null;
  creator: string | null;
  attributes: DeviceAttributes;
  payload: DevicePayload | null;
  contentType: string | null;
  createdAtBlock: string | null;
}

// ── Sensor type display labels ──────────────────────────────────────────
const SENSOR_TYPE_LABELS: Record<string, string> = {
  air_quality: "Air Quality",
  temperature: "Temperature",
  energy: "Energy",
  soil: "Soil",
  weather: "Weather",
};

// ── Status badge colors ─────────────────────────────────────────────────
function statusColor(status: string | undefined): string {
  switch (status) {
    case "active":
      return "text-emerald-400";
    case "inactive":
      return "text-zinc-500";
    case "maintenance":
      return "text-amber-400";
    default:
      return "text-zinc-400";
  }
}

// ── Component ───────────────────────────────────────────────────────────
export default function MeshMap() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch devices on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchDevices() {
      try {
        const res = await fetch("/api/devices?limit=1000");
        if (!res.ok) {
          throw new Error(`Failed to fetch devices: ${res.status}`);
        }
        const data = await res.json();
        if (!cancelled) {
          setDevices(data.devices ?? []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchDevices();
    return () => {
      cancelled = true;
    };
  }, []);

  // Default center: midpoint of Europe (works for demo; production would use device bounds)
  const defaultCenter: [number, number] = [50.0, 10.0];
  const defaultZoom = 4;

  return (
    <div className="relative h-full w-full">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm">
          <div className="text-sm text-zinc-400">Loading devices…</div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="absolute top-2 left-1/2 z-[500] -translate-x-1/2 rounded-lg border border-red-500/30 bg-red-950/80 px-4 py-2 text-xs text-red-300 backdrop-blur-sm">
          {error}
        </div>
      )}

      {/* Leaflet map */}
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="h-full w-full"
        style={{ background: "#0a0a0a" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Device markers */}
        {devices.map((device) => {
          const lat = Number(device.attributes.lat) / COORD_SCALE;
          const lng = Number(device.attributes.lng) / COORD_SCALE;

          // Skip devices with invalid coordinates
          if (!isFinite(lat) || !isFinite(lng)) return null;

          const name =
            (device.payload?.name as string) ??
            device.attributes.sensor_type ??
            "Unknown Sensor";
          const sensorType = device.attributes.sensor_type ?? "unknown";
          const status = device.attributes.status ?? "unknown";

          return (
            <Marker key={device.entityKey} position={[lat, lng]}>
              <Popup className="mesh-popup">
                <div className="min-w-[200px] p-1">
                  {/* Header */}
                  <h3 className="text-sm font-bold text-zinc-900">
                    {name}
                  </h3>

                  {/* Status + type */}
                  <div className="mt-1.5 flex items-center gap-2 text-xs">
                    <span className={`font-semibold ${statusColor(status)}`}>
                      ● {status}
                    </span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-zinc-600">
                      {SENSOR_TYPE_LABELS[sensorType] ?? sensorType}
                    </span>
                  </div>

                  {/* Details */}
                  {device.payload?.description && (
                    <p className="mt-2 text-xs text-zinc-600">
                      {device.payload.description as string}
                    </p>
                  )}

                  {/* Metadata grid */}
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-zinc-200 pt-2 text-[10px] text-zinc-500">
                    {device.payload?.manufacturer && (
                      <>
                        <span className="font-medium text-zinc-600">
                          Manufacturer
                        </span>
                        <span>{device.payload.manufacturer as string}</span>
                      </>
                    )}
                    {device.payload?.firmwareVersion && (
                      <>
                        <span className="font-medium text-zinc-600">
                          Firmware
                        </span>
                        <span>{device.payload.firmwareVersion as string}</span>
                      </>
                    )}
                    <span className="font-medium text-zinc-600">
                      Coordinates
                    </span>
                    <span className="font-mono">
                      {lat.toFixed(4)}, {lng.toFixed(4)}
                    </span>
                    <span className="font-medium text-zinc-600">
                      Entity Key
                    </span>
                    <span className="font-mono break-all">
                      {device.entityKey.slice(0, 10)}…{device.entityKey.slice(-6)}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Device count badge */}
      {!loading && devices.length > 0 && (
        <div className="absolute bottom-4 right-4 z-[500] rounded-lg border border-zinc-700/50 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-400 backdrop-blur-sm">
          <span className="font-mono text-white">{devices.length}</span>{" "}
          device{devices.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
