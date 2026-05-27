"use client";

import { useEffect, useRef } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";

interface AnomalyMarkerProps {
  lat: number;
  lng: number;
  severity: "low" | "medium" | "high";
  deviceKey: string;
  sensorType: string;
  description: string;
  confidence: number;
  timestamp: number;
  entityKey: string;
}

// Severity-based colors
const SEVERITY_COLORS: Record<string, string> = {
  high: "#ef4444",    // red-500
  medium: "#f59e0b",  // amber-500
  low: "#3b82f6",     // blue-500
};

const SEVERITY_LABELS: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

// Create pulsing div icon for anomaly markers
function createPulsingIcon(severity: string): L.DivIcon {
  const color = SEVERITY_COLORS[severity] || SEVERITY_COLORS.low;
  
  return L.divIcon({
    className: "anomaly-marker",
    html: `
      <div class="anomaly-pulse" style="--pulse-color: ${color}">
        <div class="anomaly-dot" style="background-color: ${color}"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

export default function AnomalyMarker({
  lat,
  lng,
  severity,
  deviceKey,
  sensorType,
  description,
  confidence,
  timestamp,
  entityKey,
}: AnomalyMarkerProps) {
  const markerRef = useRef<L.Marker>(null);

  // Update icon when severity changes
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setIcon(createPulsingIcon(severity));
    }
  }, [severity]);

  const icon = createPulsingIcon(severity);
  const severityColor = SEVERITY_COLORS[severity] || SEVERITY_COLORS.low;
  const severityLabel = SEVERITY_LABELS[severity] || "Unknown";
  const truncatedKey = `${deviceKey.slice(0, 6)}...${deviceKey.slice(-4)}`;
  const alertTime = new Date(timestamp).toLocaleString();

  return (
    <Marker
      ref={markerRef}
      position={[lat, lng]}
      icon={icon}
    >
      <Popup className="anomaly-popup">
        <div className="min-w-[220px] space-y-2 p-1">
          {/* Severity Badge */}
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
              style={{ backgroundColor: severityColor }}
            >
              ⚠️ {severityLabel} Alert
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-zinc-300">{description}</p>

          {/* Details */}
          <div className="space-y-1 text-xs text-zinc-400">
            <div className="flex justify-between">
              <span>Sensor Type:</span>
              <span className="font-medium text-zinc-200">{sensorType}</span>
            </div>
            <div className="flex justify-between">
              <span>Device:</span>
              <span className="font-mono text-zinc-300">{truncatedKey}</span>
            </div>
            <div className="flex justify-between">
              <span>Confidence:</span>
              <span className="font-medium text-zinc-200">{confidence}%</span>
            </div>
            <div className="flex justify-between">
              <span>Detected:</span>
              <span className="text-zinc-300">{alertTime}</span>
            </div>
          </div>

          {/* Link to sensor detail */}
          <Link
            href={`/sensor/${deviceKey}`}
            className="block text-center text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View sensor →
          </Link>
        </div>
      </Popup>
    </Marker>
  );
}
