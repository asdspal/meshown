import type { NextRequest } from "next/server";
import { eq, desc } from "@arkiv-network/sdk/query";

import { publicClient, PROJECT_ATTRIBUTE, CREATOR_WALLET_ADDRESS } from "@/lib/arkiv";

// ─────────────────────────────────────────────────────────────
// GET /api/readings/latest
// Blueprint §6 (G6), §11 (H1, H2, H3, H4)
//
// Returns the latest reading per device, optimized for map markers.
//
// H2 Resolution: Instead of parallel loops per deviceKey (G6 original),
// we execute a SINGLE buildQuery for recent readings ordered by timestamp
// descending, then group by device_key client-side to find the latest
// per device. This avoids parallel SDK queries which are warned against
// in SDK best practices §4.
//
// H1: .createdBy(CREATOR_WALLET_ADDRESS) scopes all queries to agent wallet.
// H3: desc() imported from @arkiv-network/sdk/query for ordering.
// H4: eq() used only for string attributes.
//
// Query params:
//   - deviceKeys (optional): comma-separated entityKeys (max 50)
//     If provided, results are filtered to only these device keys.
//   - limit    (optional): max readings to fetch from Arkiv (default 200, max 1000)
//     Higher values increase coverage but slow the query.
//
// Response: { latest: { [deviceKey]: Reading } }
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
    const deviceKeysParam = searchParams.get("deviceKeys");
    const limitParam = searchParams.get("limit");

    // Parse deviceKeys into a Set for O(1) lookup during filtering
    let deviceKeyFilter: Set<string> | null = null;
    if (deviceKeysParam) {
      const keys = deviceKeysParam
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

      if (keys.length > 50) {
        return Response.json(
          { error: "deviceKeys accepts a maximum of 50 keys" },
          { status: 400 },
        );
      }

      // Validate each key format (0x + 64 hex chars)
      for (const key of keys) {
        if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
          return Response.json(
            { error: `Invalid deviceKey format: ${key} (expected 0x + 64 hex chars)` },
            { status: 400 },
          );
        }
      }

      deviceKeyFilter = new Set(keys);
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 200;
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      return Response.json(
        { error: "limit must be between 1 and 1000" },
        { status: 400 },
      );
    }

    // ── 2. Build predicates (H4: eq() only for strings) ────
    const predicates = [
      eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value),
      eq("entityType", "reading"),
    ];

    // ── 3. Execute single query (H2 resolution) ────────────
    // H1: scoped to agent creator
    // H3: order by timestamp descending (newest first)
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

    // ── 4. Group by device_key — pick latest per device ────
    // Since results are ordered by timestamp desc, the first
    // occurrence of each device_key is its latest reading.
    const latestMap: Record<string, unknown> = {};
    const seen = new Set<string>();

    for (const entity of result.entities) {
      // Extract device_key from attributes
      const deviceKeyAttr = entity.attributes.find(
        (a) => a.key === "device_key",
      );
      if (!deviceKeyAttr) continue;

      const deviceKey = String(deviceKeyAttr.value);

      // Skip if already seen (we have a newer reading for this device)
      if (seen.has(deviceKey)) continue;

      // If deviceKeyFilter is set, skip devices not in the filter
      if (deviceKeyFilter && !deviceKeyFilter.has(deviceKey)) continue;

      seen.add(deviceKey);

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

      latestMap[deviceKey] = {
        entityKey: entity.key,
        owner: entity.owner ?? null,
        creator: entity.creator ?? null,
        attributes: attrs,
        payload,
        contentType: entity.contentType ?? null,
        createdAtBlock: entity.createdAtBlock?.toString() ?? null,
      };
    }

    return Response.json({ latest: latestMap });
  } catch (err) {
    console.error("GET /api/readings/latest error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
