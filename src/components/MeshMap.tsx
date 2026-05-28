"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import DrawControl from "@/components/DrawControl";
import AnomalyMarker from "@/components/AnomalyMarker";
import { useMeshStore } from "@/lib/store";
import { publicClient } from "@/lib/arkiv";

/**
 * MeshMap — Client-only Leaflet map rendering device markers + anomaly alerts.
 *
 * Blueprint §5 (Screen 1), §7 (Phase 2), §9 (Coverage Map), §10 (G2, C2)
 *   - Full-viewport map with OpenStreetMap tiles [GAP: tile URL inferred]
 *   - Device markers with popups showing name, status, sensor type
 *   - Uses /api/devices endpoint (GET) to fetch registered sensors
 *   - Live events polling via subscribeEntityEvents (5000ms, NOT WebSocket — C2)
 *   - Anomaly markers rendered from /api/alerts/recent on mount
 *
 * Data shape from GET /api/devices:
 *   { devices: [{ entityKey, attributes: { lat, lng, sensor_type, status, ... }, payload: {...} }], total }
 *
 * Data shape from GET /api/alerts/recent:
 *   { alerts: [{ entityKey, attributes: { lat, lng, severity, device_key, ... }, payload: {...} }] }
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

// ── Live events polling interval (C2: HTTP polling, NOT WebSocket) ─────
const POLLING_INTERVAL_MS = 5000;

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

interface AlertAttributes {
  lat: number;
  lng: number;
  severity: string;
  device_key: string;
  sensor_type: string;
  timestamp: number;
  confidence: number;
  [key: string]: string | number | undefined;
}

interface AlertPayload {
  anomaly_type?: string;
  description?: string;
  baseline_value?: number;
  observed_value?: number;
  confidence?: number;
  affected_reading_key?: string;
  [key: string]: unknown;
}

interface Alert {
  entityKey: string;
  owner: string | null;
  creator: string | null;
  attributes: AlertAttributes;
  payload: AlertPayload | null;
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

// ── Helper: extract attribute value from entity attributes array ────────
// Arkiv SDK Attribute type has value: string | number
function getAttr(
  attrs: { key: string; value: string | number }[],
  key: string,
): string | undefined {
  const val = attrs.find((a) => a.key === key)?.value;
  return val !== undefined ? String(val) : undefined;
}

// ── Component ───────────────────────────────────────────────────────────
export default function MeshMap() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapMode = useMeshStore((s) => s.mapMode);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ── Fetch devices on mount ──────────────────────────────────────────
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

  // ── Fetch recent alerts on mount (Blueprint §9) ─────────────────────
  useEffect(() => {
    let cancelled = false;

    async function fetchAlerts() {
      try {
        const res = await fetch("/api/alerts/recent?hours=24&limit=200");
        if (!res.ok) {
          console.warn("Failed to fetch alerts:", res.status);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setAlerts(data.alerts ?? []);
        }
      } catch (err) {
        // Non-fatal: alerts are supplementary
        console.warn("Error fetching alerts:", err);
      }
    }

    fetchAlerts();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Live events polling via subscribeEntityEvents (C2: 5000ms HTTP polling) ──
  // Blueprint Extraction 5, §10 (C2), §11
  // GAP: Blueprint snippet uses synchronous call; actual SDK returns Promise<() => void>.
  useEffect(() => {
    let mounted = true;

    async function startPolling() {
      try {
        const unsubscribe = await publicClient.subscribeEntityEvents(
          {
            onError: (error) => {
              console.error("[LiveEvents] Polling error:", error);
            },
            onEntityCreated: async (event) => {
              if (!mounted) return;

              try {
                // Fetch full entity to check if it's an anomaly_alert
                const entity = await publicClient.getEntity(event.entityKey);
                const entityType = getAttr(entity.attributes, "entityType");

                if (entityType !== "anomaly_alert") return;

                // Extract alert attributes
                const lat = Number(getAttr(entity.attributes, "lat"));
                const lng = Number(getAttr(entity.attributes, "lng"));
                const severity = getAttr(entity.attributes, "severity") ?? "low";
                const deviceKey = getAttr(entity.attributes, "device_key") ?? "";
                const sensorType = getAttr(entity.attributes, "sensor_type") ?? "unknown";
                const timestamp = Number(getAttr(entity.attributes, "timestamp")) || Date.now();
                const confidence = Number(getAttr(entity.attributes, "confidence")) || 0;

                if (!isFinite(lat) || !isFinite(lng)) return;

                // Parse payload JSON via SDK helper (entity.payload is Uint8Array)
                let payload: AlertPayload | null = null;
                try {
                  payload = entity.toJson() as AlertPayload;
                } catch {
                  payload = null;
                }

                const newAlert: Alert = {
                  entityKey: event.entityKey,
                  owner: event.owner,
                  creator: entity.creator ?? null,
                  attributes: { lat, lng, severity, device_key: deviceKey, sensor_type: sensorType, timestamp, confidence },
                  payload,
                  contentType: null,
                  createdAtBlock: null,
                };

                // Deduplicate: only add if not already in state
                setAlerts((prev) => {
                  if (prev.some((a) => a.entityKey === newAlert.entityKey)) {
                    return prev;
                  }
                  return [newAlert, ...prev];
                });

                console.log(
                  `[LiveEvents] New anomaly alert: ${event.entityKey} at (${(lat / COORD_SCALE).toFixed(4)}, ${(lng / COORD_SCALE).toFixed(4)})`,
                );
              } catch (err) {
                // getEntity may fail for non-alert entities — silent ignore
                console.debug("[LiveEvents] Entity fetch skipped:", err);
              }
            },
          },
          POLLING_INTERVAL_MS,
        );

        if (mounted) {
          unsubscribeRef.current = unsubscribe;
        } else {
          // Component unmounted before subscription completed
          unsubscribe();
        }
      } catch (err) {
        console.error("[LiveEvents] Failed to start polling:", err);
      }
    }

    startPolling();

    return () => {
      mounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // Default center: Prayagraj, India — where the demo sensors are deployed
  const defaultCenter: [number, number] = [25.4358, 81.8463];
  const defaultZoom = 11;

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

        {/* Draw control — only visible in Query mode [G8] */}
        {mapMode === "query" && <DrawControl />}

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

        {/* Anomaly alert markers (Blueprint §9: Coverage Map) */}
        {alerts.map((alert) => {
          const lat = Number(alert.attributes.lat) / COORD_SCALE;
          const lng = Number(alert.attributes.lng) / COORD_SCALE;

          if (!isFinite(lat) || !isFinite(lng)) return null;

          const severity = (alert.attributes.severity as "low" | "medium" | "high") ?? "low";
          const description =
            (alert.payload?.description as string) ??
            `Anomaly detected (${severity} severity)`;

          return (
            <AnomalyMarker
              key={`alert-${alert.entityKey}`}
              lat={lat}
              lng={lng}
              severity={severity}
              deviceKey={alert.attributes.device_key}
              sensorType={alert.attributes.sensor_type}
              description={description}
              confidence={Number(alert.attributes.confidence) || 0}
              timestamp={Number(alert.attributes.timestamp) || Date.now()}
              entityKey={alert.entityKey}
            />
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

      {/* Alert count badge (shown when alerts exist) */}
      {alerts.length > 0 && (
        <div className="absolute bottom-4 right-28 z-[500] flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-zinc-900/80 px-3 py-1.5 text-xs backdrop-blur-sm">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
          <span className="font-mono text-red-400">{alerts.length}</span>
          <span className="text-zinc-400">
            alert{alerts.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Live polling indicator */}
      <div className="absolute bottom-4 left-4 z-[500] flex items-center gap-1.5 rounded-lg border border-zinc-700/50 bg-zinc-900/80 px-3 py-1.5 text-[10px] text-zinc-500 backdrop-blur-sm">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
        Live ({POLLING_INTERVAL_MS / 1000}s)
      </div>
    </div>
  );
}
