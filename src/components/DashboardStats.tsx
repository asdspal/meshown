"use client";

/**
 * DashboardStats — 4 metric stat cards for the Owner Dashboard.
 *
 * Blueprint §5 — Screen 3: Owner Dashboard metric cards.
 *
 * Cards:
 *   1. Total Devices — count of all devices owned by the wallet
 *   2. Active Devices — devices with status === "active"
 *   3. Sensor Types — unique sensor_type values across owned devices
 *   4. Active Alerts — anomaly alerts in the last 24 hours
 *
 * [GAP] Blueprint specifies 4 metric cards but doesn't name them.
 *   These 4 are inferred from available data endpoints within Phase 3 scope.
 */

interface DashboardStatsProps {
  totalDevices: number;
  activeDevices: number;
  uniqueSensorTypes: number;
  activeAlerts: number;
  loading: boolean;
}

/** Skeleton placeholder while data loads */
function StatSkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/90 p-5 backdrop-blur-md">
      <div className="mb-2 h-3 w-20 animate-pulse rounded bg-zinc-800" />
      <div className="h-8 w-16 animate-pulse rounded bg-zinc-800" />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/90 p-5 backdrop-blur-md transition-colors hover:border-white/20">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          {label}
        </span>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}
        >
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
    </div>
  );
}

export default function DashboardStats({
  totalDevices,
  activeDevices,
  uniqueSensorTypes,
  activeAlerts,
  loading,
}: DashboardStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Devices"
        value={totalDevices}
        color="bg-indigo-500/20"
        icon={
          <svg
            className="h-4 w-4 text-indigo-400"
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
        }
      />

      <StatCard
        label="Active Devices"
        value={activeDevices}
        color="bg-emerald-500/20"
        icon={
          <svg
            className="h-4 w-4 text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
      />

      <StatCard
        label="Sensor Types"
        value={uniqueSensorTypes}
        color="bg-amber-500/20"
        icon={
          <svg
            className="h-4 w-4 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
            />
          </svg>
        }
      />

      <StatCard
        label="Active Alerts (24h)"
        value={activeAlerts}
        color="bg-red-500/20"
        icon={
          <svg
            className="h-4 w-4 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        }
      />
    </div>
  );
}
