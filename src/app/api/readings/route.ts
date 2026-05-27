import type { NextRequest } from "next/server";
import { eq, gte, desc } from "@arkiv-network/sdk/query";

import { publicClient, PROJECT_ATTRIBUTE, CREATOR_WALLET_ADDRESS } from "@/lib/arkiv";

// ─────────────────────────────────────────────────────────────
// GET /api/readings
// Blueprint §6 (Reading Endpoints), §11 (H1, H3)
//
// Lists Reading entities for a specific device, scoped to the
// agent wallet via .createdBy() (H1). Ordered by timestamp
// descending (H3) so newest readings come first.
//
// Query params:
//   - deviceKey (required): 0x + 64 hex chars — parent device entity key
//   - limit    (optional): 1–1000, default 100
//   - since    (optional): Unix ms timestamp — only return readings after this time
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

    // ── 1. Parse and validate query parameters ──────────────
    const deviceKey = searchParams.get("deviceKey");
    const limitParam = searchParams.get("limit");
    const sinceParam = searchParams.get("since");

    if (!deviceKey || typeof deviceKey !== "string") {
      return Response.json(
        { error: "Missing required query parameter: deviceKey" },
        { status: 400 },
      );
    }

    if (!/^0x[0-9a-fA-F]{64}$/.test(deviceKey)) {
      return Response.json(
        { error: "Invalid deviceKey format (expected 0x + 64 hex chars)" },
        { status: 400 },
      );
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 100;
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      return Response.json(
        { error: "limit must be between 1 and 1000" },
        { status: 400 },
      );
    }

    // Optional: only return readings created after this timestamp
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

    // ── 2. Build predicates (H4: eq() only for strings) ────
    const predicates = [
      eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value),
      eq("entityType", "reading"),
      eq("device_key", deviceKey),
    ];

    // Optional: filter readings after a specific timestamp
    // [GAP] Blueprint mentions `since` param but does not specify filter operator.
    // Using gte("timestamp", since) — consistent with numeric attribute filtering.
    if (since !== undefined) {
      predicates.push(gte("timestamp", since));
    }

    // ── 3. Execute query (H1: scoped to agent creator) ─────
    // H3: Order by timestamp descending (newest first)
    const result = await publicClient
      .buildQuery()
      .where(predicates)
      .createdBy(CREATOR_WALLET_ADDRESS)
      .orderBy(desc("timestamp", "number"))
      .withPayload(true)
      .withAttributes(true)
      .withMetadata(true)
      .limit(limit + 1) // fetch one extra to determine hasMore
      .fetch();

    // ── 4. Determine hasMore and trim to requested limit ───
    const hasMore = result.entities.length > limit;
    const entities = hasMore ? result.entities.slice(0, limit) : result.entities;

    // ── 5. Map entities to response shape ───────────────────
    const readings = entities.map((entity) => {
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

    return Response.json({
      readings,
      hasMore,
    });
  } catch (err) {
    console.error("GET /api/readings error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
