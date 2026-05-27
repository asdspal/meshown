"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import DashboardStats from "@/components/DashboardStats";
import DeviceListTable from "@/components/DeviceListTable";

/**
 * DashboardContent — Client Component for the Owner Dashboard (Screen 3).
 *
 * Blueprint §5 — Screen 3: Owner Dashboard.
 * Blueprint §7 — Phase 3: "All queries filtered with .ownedBy(walletAddress)".
 *
 * Uses useAccount() from wagmi to get the connected wallet address.
 * Fetches devices filtered by ownership via GET /api/devices?owner=...
 * Fetches recent alerts via GET /api/alerts/recent.
 * Computes aggregate stats client-side from the returned data.
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

interface AlertEntry {
  entityKey: string;
  attributes: Record<string, string | number>;
  payload: unknown;
}

export default function DashboardContent() {
  const { address, isConnected } = useAccount();

  const [devices, setDevices] = useState<DeviceEntry[]>([]);
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch devices owned by the connected wallet
  const fetchDevices = useCallback(async (owner: string) => {
    const controller = new AbortController();
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/devices?owner=${owner}&limit=1000`,
        { signal: controller.signal },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setDevices(data.devices ?? []);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to fetch devices");
    } finally {
      setLoading(false);
    }
    return controller;
  }, []);

  // Fetch recent alerts
  const fetchAlerts = useCallback(async () => {
    const controller = new AbortController();
    try {
      const res = await fetch(
        "/api/alerts/recent?hours=24&limit=200",
        { signal: controller.signal },
      );
      if (!res.ok) return;
      const data = await res.json();
      setAlerts(data.alerts ?? []);
    } catch {
      // Alerts are non-critical; silently ignore fetch errors
    }
    return controller;
  }, []);

  useEffect(() => {
    if (!address) return;

    let deviceCtrl: AbortController | undefined;
    let alertCtrl: AbortController | undefined;

    fetchDevices(address).then((ctrl) => {
      deviceCtrl = ctrl;
    });
    fetchAlerts().then((ctrl) => {
      alertCtrl = ctrl;
    });

    return () => {
      deviceCtrl?.abort();
      alertCtrl?.abort();
    };
  }, [address, fetchDevices, fetchAlerts]);

  // ── Compute aggregate stats from device data (client-side) ─────
  const stats = useMemo(() => {
    const totalDevices = devices.length;

    // Count active devices (status === "active")
    const activeDevices = devices.filter((d) => {
      const status = d.attributes.status;
      return typeof status === "string" && status.toLowerCase() === "active";
    }).length;

    // Unique sensor types
    const sensorTypes = new Set(
      devices
        .map((d) => d.attributes.sensor_type)
        .filter((v) => typeof v === "string" && v.length > 0),
    );
    const uniqueSensorTypes = sensorTypes.size;

    // Active alerts in last 24h
    const activeAlerts = alerts.length;

    return {
      totalDevices,
      activeDevices,
      uniqueSensorTypes,
      activeAlerts,
    };
  }, [devices, alerts]);

  // ── Auth guard: show connect prompt if wallet not connected ─────
  if (!isConnected || !address) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-zinc-900/90 p-8 text-center shadow-2xl backdrop-blur-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800">
            <svg
              className="h-8 w-8 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-white">
            Connect Your Wallet
          </h2>
          <p className="mb-6 text-sm text-zinc-400">
            Connect your wallet to view your owned devices and dashboard
            statistics.
          </p>
          <div className="flex justify-center">
            <ConnectButton
              chainStatus="icon"
              showBalance={false}
              accountStatus="address"
            />
          </div>
          <Link
            href="/"
            className="mt-6 inline-block text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            ← Back to Map
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Owner Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Devices owned by{" "}
            <span className="font-mono text-indigo-400">
              {address.slice(0, 6)}…{address.slice(-4)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
          >
            ← Map
          </Link>
          <ConnectButton
            chainStatus="icon"
            showBalance={false}
            accountStatus="address"
          />
        </div>
      </div>

      {/* ── Error banner ────────────────────────────────────── */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ── Stats cards ─────────────────────────────────────── */}
      <DashboardStats
        totalDevices={stats.totalDevices}
        activeDevices={stats.activeDevices}
        uniqueSensorTypes={stats.uniqueSensorTypes}
        activeAlerts={stats.activeAlerts}
        loading={loading}
      />

      {/* ── Device list table ───────────────────────────────── */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Your Devices
        </h2>
        <DeviceListTable devices={devices} loading={loading} />
      </div>
    </div>
  );
}
