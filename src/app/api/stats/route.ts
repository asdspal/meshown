import { eq } from "@arkiv-network/sdk/query";

import { publicClient, PROJECT_ATTRIBUTE, CREATOR_WALLET_ADDRESS } from "@/lib/arkiv";

// ─────────────────────────────────────────────────────────────
// GET /api/stats
// Blueprint §6 (Utility Endpoints)
//
// Returns entity counts for each MeshOwn entity type on-chain.
// Uses buildQuery().where(...).count() for filtered per-type counts
// (NOT publicClient.getEntityCount() which returns total chain count).
//
// H1: .createdBy(CREATOR_WALLET_ADDRESS) scopes all queries to agent wallet.
// H4: eq() used only for string attributes (project, entityType).
//
// Response: { total_devices, total_readings, total_alerts, total_calibrations }
// ─────────────────────────────────────────────────────────────

/** Entity types tracked by MeshOwn */
const ENTITY_TYPES = [
  "sensor_device",
  "reading",
  "anomaly_alert",
  "calibration_record",
] as const;

export async function GET() {
  try {
    // ── 0. Validate creator address is configured (H1) ──────
    if (!CREATOR_WALLET_ADDRESS) {
      return Response.json(
        { error: "AGENT_WALLET_ADDRESS is not configured" },
        { status: 500 },
      );
    }

    // ── 1. Query counts sequentially (SDK best practices §4) ─
    // Avoid parallel SDK queries — sequential execution is safer on testnet.
    const counts: Record<string, number> = {};

    for (const entityType of ENTITY_TYPES) {
      const predicates = [
        eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value),
        eq("entityType", entityType),
      ];

      try {
        const count = await publicClient
          .buildQuery()
          .where(predicates)
          .createdBy(CREATOR_WALLET_ADDRESS)
          .count();

        counts[entityType] = count;
      } catch {
        // Transient RPC failure for this entity type — default to 0
        counts[entityType] = 0;
      }
    }

    // ── 2. Return aggregated stats ──────────────────────────
    return Response.json({
      total_devices: counts.sensor_device ?? 0,
      total_readings: counts.reading ?? 0,
      total_alerts: counts.anomaly_alert ?? 0,
      total_calibrations: counts.calibration_record ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return Response.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
