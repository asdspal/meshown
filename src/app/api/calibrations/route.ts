import type { NextRequest } from "next/server";
import { eq, desc } from "@arkiv-network/sdk/query";

import { publicClient, PROJECT_ATTRIBUTE, CREATOR_WALLET_ADDRESS } from "@/lib/arkiv";

// ─────────────────────────────────────────────────────────────
// GET /api/calibrations
// Blueprint §6 (Calibration Endpoints), §11 (H1, H3)
//
// Lists CalibrationRecord entities for a specific device, scoped
// to the agent wallet via .createdBy() (H1). Ordered by valid_from
// descending (H3) so most recent calibration comes first.
//
// Query params:
//   - deviceKey (required): 0x + 64 hex chars — parent device entity key
//   - limit    (optional): 1–1000, default 100
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

    // ── 2. Build predicates (H4: eq() only for strings) ────
    const predicates = [
      eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value),
      eq("entityType", "calibration_record"),
      eq("device_key", deviceKey),
    ];

    // ── 3. Execute query (H1: scoped to agent creator) ─────
    // H3: Order by valid_from descending (most recent calibration first)
    const result = await publicClient
      .buildQuery()
      .where(predicates)
      .createdBy(CREATOR_WALLET_ADDRESS)
      .orderBy(desc("valid_from", "number"))
      .withPayload(true)
      .withAttributes(true)
      .withMetadata(true)
      .limit(limit)
      .fetch();

    // ── 4. Map entities to response shape ───────────────────
    const calibrations = result.entities.map((entity) => {
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
      calibrations,
    });
  } catch (err) {
    console.error("GET /api/calibrations error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
