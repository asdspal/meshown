import type { NextRequest } from "next/server";
import { eq, gt, desc } from "@arkiv-network/sdk/query";

import { publicClient, PROJECT_ATTRIBUTE, CREATOR_WALLET_ADDRESS } from "@/lib/arkiv";

// ─────────────────────────────────────────────────────────────
// GET /api/alerts/recent
// Blueprint §6 (G7), §11 (H1, H3, H4)
//
// Returns recent AnomalyAlert entities within a configurable time window.
// Used by MeshMap popups and alert markers.
//
// H1: .createdBy(CREATOR_WALLET_ADDRESS) scopes all queries to agent wallet.
// H3: desc() imported from @arkiv-network/sdk/query for ordering.
// H4: eq() used only for string attributes; gt() for numeric timestamp.
//
// Query params:
//   - hours  (optional): time window in hours, default 24
//   - limit  (optional): max alerts to return, default 50, max 200
//
// Response: { alerts: [...] }
// ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // ── 0. Validate creator address is configured (H1) ──────
    if (!CREATOR_WALLET_ADDRESS) {
      return Response.json(
        { error: "AGENT_WALLET_ADDRESS is not configured" },
        { status: 500 },
      );
    }

    const { searchParams } = request.nextUrl;

    // ── 1. Parse optional query parameters ──────────────────
    const hoursParam = searchParams.get("hours");
    const limitParam = searchParams.get("limit");

    const hours = hoursParam ? parseInt(hoursParam, 10) : 24;
    if (isNaN(hours) || hours < 1 || hours > 720) {
      return Response.json(
        { error: "hours must be between 1 and 720" },
        { status: 400 },
      );
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    if (isNaN(limit) || limit < 1 || limit > 200) {
      return Response.json(
        { error: "limit must be between 1 and 200" },
        { status: 400 },
      );
    }

    // ── 2. Compute time boundary ────────────────────────────
    const sinceTimestamp = Date.now() - hours * 3600000;

    // ── 3. Build predicates (H4: eq() only for strings) ────
    const predicates = [
      eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value),
      eq("entityType", "anomaly_alert"),
      gt("timestamp", sinceTimestamp),
    ];

    // ── 4. Execute query (H1: scoped to agent creator) ─────
    // H3: Order by timestamp descending (newest alerts first)
    const result = await publicClient
      .buildQuery()
      .where(predicates)
      .createdBy(CREATOR_WALLET_ADDRESS)
      .orderBy(desc("timestamp", "number"))
      .withPayload(true)
      .withAttributes(true)
      .withMetadata(true)
      .limit(limit)
      .fetch();

    // ── 5. Map entities to response shape ───────────────────
    const alerts = result.entities.map((entity) => {
      // Convert attributes array to a key-value map
      const attrs: Record<string, string | number> = {};
      for (const attr of entity.attributes) {
        attrs[attr.key] = attr.value;
      }

      // Parse payload JSON (safe — may be undefined if empty)
      let payload: unknown = null;
      try {
        payload = entity.toJson();
      } catch {
        payload = null;
      }

      return {
        entityKey: entity.key,
        owner: entity.owner ?? null,
        creator: entity.creator ?? null,
        attributes: attrs,
        payload,
        contentType: entity.contentType ?? null,
        createdAtBlock: entity.createdAtBlock?.toString() ?? null,
      };
    });

    return Response.json({ alerts });
  } catch (err) {
    console.error("GET /api/alerts/recent error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
