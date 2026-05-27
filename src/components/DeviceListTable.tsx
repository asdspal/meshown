"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { COORD_SCALE } from "@/lib/arkiv";

/**
 * DeviceListTable — Filterable, sortable device list for the Owner Dashboard.
 *
 * Blueprint §5 — Screen 3: Device list table.
 * Blueprint §7 — Phase 3: "All queries filtered with .ownedBy(walletAddress)".
 *
 * Displays devices in a table with columns:
 *   Name, Type, Status, Lat, Lng, Registered
 *
 * Supports text search filtering and column header sorting.
 */

interface DeviceEntry {
  entityKey: string;
  owner: string | null;
  creator: string | null;
  attributes: Record<string, string | number>;
  payload: unknown;
  contentType: string | null;
  createdAtBlock: string | null;
}

interface DeviceListTableProps {
  devices: DeviceEntry[];
  loading: boolean;
}

type SortKey = "name" | "type" | "status" | "lat" | "lng" | "registered";
type SortDir = "asc" | "desc";

/** Sensor type display config */
const SENSOR_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  air_quality: { label: "Air Quality", color: "text-sky-400", bg: "bg-sky-500/20" },
  temperature: { label: "Temperature", color: "text-orange-400", bg: "bg-orange-500/20" },
  energy: { label: "Energy", color: "text-yellow-400", bg: "bg-yellow-500/20" },
  soil: { label: "Soil", color: "text-lime-400", bg: "bg-lime-500/20" },
  weather: { label: "Weather", color: "text-cyan-400", bg: "bg-cyan-500/20" },
};

/** Status badge config */
const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  active: { color: "text-emerald-400", bg: "bg-emerald-500/20" },
  inactive: { color: "text-zinc-400", bg: "bg-zinc-500/20" },
  maintenance: { color: "text-amber-400", bg: "bg-amber-500/20" },
};

/** Truncate a hex address to 0x1234…abcd */
function truncateAddr(addr: string | null): string {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Get a string attribute value safely */
function getAttrStr(
  attrs: Record<string, string | number>,
  key: string,
): string {
  const v = attrs[key];
  return typeof v === "string" ? v : String(v ?? "");
}

/** Get a numeric attribute value safely */
function getAttrNum(
  attrs: Record<string, string | number>,
  key: string,
): number {
  const v = attrs[key];
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v) || 0;
  return 0;
}

export default function DeviceListTable({
  devices,
  loading,
}: DeviceListTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // ── Filter by search text ─────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return devices;
    const q = search.toLowerCase();
    return devices.filter((d) => {
      const name = getAttrStr(d.attributes, "name").toLowerCase();
      const type = getAttrStr(d.attributes, "sensor_type").toLowerCase();
      const status = getAttrStr(d.attributes, "status").toLowerCase();
      const key = d.entityKey.toLowerCase();
      return name.includes(q) || type.includes(q) || status.includes(q) || key.includes(q);
    });
  }, [devices, search]);

  // ── Sort ──────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = getAttrStr(a.attributes, "name").localeCompare(
            getAttrStr(b.attributes, "name"),
          );
          break;
        case "type":
          cmp = getAttrStr(a.attributes, "sensor_type").localeCompare(
            getAttrStr(b.attributes, "sensor_type"),
          );
          break;
        case "status":
          cmp = getAttrStr(a.attributes, "status").localeCompare(
            getAttrStr(b.attributes, "status"),
          );
          break;
        case "lat":
          cmp =
            getAttrNum(a.attributes, "lat") - getAttrNum(b.attributes, "lat");
          break;
        case "lng":
          cmp =
            getAttrNum(a.attributes, "lng") - getAttrNum(b.attributes, "lng");
          break;
        case "registered":
          cmp =
            Number(getAttrNum(a.attributes, "registered_at")) -
            Number(getAttrNum(b.attributes, "registered_at"));
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column)
      return (
        <span className="ml-1 text-zinc-600">↕</span>
      );
    return (
      <span className="ml-1 text-indigo-400">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  }

  // ── Loading skeleton ──────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-900/90 backdrop-blur-md overflow-hidden">
        <div className="p-4">
          <div className="h-10 w-full animate-pulse rounded-lg bg-zinc-800" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 border-t border-zinc-800 px-4 py-3"
          >
            <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
            <div className="h-4 w-20 animate-pulse rounded bg-zinc-800" />
            <div className="h-4 w-16 animate-pulse rounded bg-zinc-800" />
            <div className="h-4 w-16 animate-pulse rounded bg-zinc-800" />
            <div className="h-4 w-16 animate-pulse rounded bg-zinc-800" />
            <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
          </div>
        ))}
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────
  if (devices.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-900/90 p-12 text-center backdrop-blur-md">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800">
          <svg
            className="h-8 w-8 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>
        <p className="text-sm text-zinc-400">
          No devices found for this wallet address.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/90 backdrop-blur-md overflow-hidden">
      {/* ── Search bar ────────────────────────────────────── */}
      <div className="border-b border-zinc-800 p-4">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search devices by name, type, status, or key…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        {search && (
          <p className="mt-2 text-xs text-zinc-500">
            Showing {sorted.length} of {devices.length} devices
          </p>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
              <th
                onClick={() => handleSort("name")}
                className="cursor-pointer px-4 py-3 text-left font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Name
                <SortIcon column="name" />
              </th>
              <th
                onClick={() => handleSort("type")}
                className="cursor-pointer px-4 py-3 text-left font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Type
                <SortIcon column="type" />
              </th>
              <th
                onClick={() => handleSort("status")}
                className="cursor-pointer px-4 py-3 text-left font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Status
                <SortIcon column="status" />
              </th>
              <th
                onClick={() => handleSort("lat")}
                className="cursor-pointer px-4 py-3 text-right font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Lat
                <SortIcon column="lat" />
              </th>
              <th
                onClick={() => handleSort("lng")}
                className="cursor-pointer px-4 py-3 text-right font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Lng
                <SortIcon column="lng" />
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">
                Entity Key
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((device, idx) => {
              const name = getAttrStr(device.attributes, "name") || "Unnamed";
              const sensorType = getAttrStr(device.attributes, "sensor_type");
              const status = getAttrStr(device.attributes, "status") || "unknown";
              const latMicro = getAttrNum(device.attributes, "lat");
              const lngMicro = getAttrNum(device.attributes, "lng");
              const lat = latMicro / COORD_SCALE;
              const lng = lngMicro / COORD_SCALE;

              const typeCfg = SENSOR_TYPE_CONFIG[sensorType] ?? {
                label: sensorType || "Unknown",
                color: "text-zinc-400",
                bg: "bg-zinc-500/20",
              };
              const statusCfg = STATUS_CONFIG[status.toLowerCase()] ?? {
                color: "text-zinc-400",
                bg: "bg-zinc-500/20",
              };

              return (
                <tr
                  key={device.entityKey}
                  className={`border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/40 ${
                    idx % 2 === 0 ? "" : "bg-zinc-900/30"
                  }`}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/sensor/${device.entityKey}`}
                      className="font-medium text-white hover:text-indigo-400 transition-colors"
                    >
                      {name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${typeCfg.color} ${typeCfg.bg}`}
                    >
                      {typeCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${statusCfg.color} ${statusCfg.bg}`}
                    >
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-zinc-300">
                    {lat.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-zinc-300">
                    {lng.toFixed(4)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/sensor/${device.entityKey}`}
                      className="font-mono text-xs text-zinc-500 hover:text-indigo-400 transition-colors"
                      title={device.entityKey}
                    >
                      {device.entityKey.slice(0, 10)}…
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Footer ────────────────────────────────────────── */}
      <div className="border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500">
        {sorted.length} device{sorted.length !== 1 ? "s" : ""} displayed
      </div>
    </div>
  );
}
