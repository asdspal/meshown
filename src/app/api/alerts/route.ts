import type { NextRequest } from "next/server";
import { eq, gt, desc } from "@arkiv-network/sdk/query";

import { publicClient, PROJECT_ATTRIBUTE, CREATOR_WALLET_ADDRESS } from "@/lib/arkiv";

// ─────────────────────────────────────────────────────────────
// GET /api/alerts
// Blueprint §6 (Alert Endpoints), §7 (Phase 4), §10 (G3)
//
// General-purpose alert list endpoint with optional filters.
// Used by dashboards and external consumers to query anomaly alerts.
//
// H1: .createdBy(CREATOR_WALLET_ADDRESS) scopes all queries to agent wallet.
// H3: desc() imported from @arkiv-network/sdk/query for ordering.
// H4: eq() used only for string attributes; gt() for numeric timestamp.
//
// Query params:
//   - deviceKey (optional): 0x + 64 hex chars — filter alerts for a specific device
//   - severity  (optional): "low" | "medium" | "high" — filter by severity level
//   - since     (optional): Unix ms timestamp — only return alerts after this time
//   - limit     (optional): 1–200, default 50
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
    const deviceKey = searchParams.get("deviceKey");
    const severity = searchParams.get("severity");
    const sinceParam = searchParams.get("since");
    const limitParam = searchParams.get("limit");

    // Validate deviceKey format if provided
    if (deviceKey && !/^0x[0-9a-fA-F]{64}$/.test(deviceKey)) {
      return Response.json(
        { error: "Invalid deviceKey format (expected 0x + 64 hex chars)" },
        { status: 400 },
      );
    }

    // Validate severity if provided
    const validSeverities = ["low", "medium", "high"];
    if (severity && !validSeverities.includes(severity)) {
      return Response.json(
        { error: `Invalid severity (must be one of: ${validSeverities.join(", ")})` },
        { status: 400 },
      );
    }

    // Validate and parse since timestamp if provided
    let since: number | undefined;
    if (sinceParam) {
      since = parseInt(sinceParam, 10);
      if (isNaN(since) || since < 0) {
        return Response.json(
          { error: "Invalid since parameter (must be a positive Unix ms timestamp)" },
          { status: 400 },
        );
      }
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    if (isNaN(limit) || limit < 1 || limit > 200) {
      return Response.json(
        { error: "limit must be between 1 and 200" },
        { status: 400 },
      );
    }

    // ── 2. Build predicates (H4: eq() only for strings) ────
    const predicates = [
      eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value),
      eq("entityType", "anomaly_alert"),
    ];

    // Optional: filter by device_key
    if (deviceKey) {
      predicates.push(eq("device_key", deviceKey));
    }

    // Optional: filter by severity
    if (severity) {
      predicates.push(eq("severity", severity));
    }

    // Optional: filter alerts after a specific timestamp
    if (since !== undefined) {
      predicates.push(gt("timestamp", since));
    }

    // ── 3. Execute query (H1: scoped to agent creator) ─────
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

    // ── 4. Map entities to response shape ───────────────────
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
    console.error("GET /api/alerts error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
