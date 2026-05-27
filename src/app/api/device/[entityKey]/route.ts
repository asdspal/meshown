import type { NextRequest } from "next/server";
import type { Hex } from "viem";
import { NoEntityFoundError } from "@arkiv-network/sdk";

import { publicClient } from "@/lib/arkiv";

// ─────────────────────────────────────────────────────────────
// GET /api/device/[entityKey]
// Blueprint §6 (Device Endpoints)
//
// Fetches a single SensorDevice entity by its Arkiv entity key.
// Returns the full entity JSON including attributes and payload.
// ─────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ entityKey: string }> },
) {
  try {
    const { entityKey } = await params;

    // ── 1. Validate entityKey format ────────────────────────
    if (!entityKey || !/^0x[0-9a-fA-F]{64}$/.test(entityKey)) {
      return Response.json(
        {
          error:
            "Invalid entityKey format. Must be 0x-prefixed 64 hex characters (32 bytes).",
        },
        { status: 400 },
      );
    }

    // ── 2. Fetch entity from Arkiv ──────────────────────────
    const entity = await publicClient.getEntity(entityKey as Hex);

    // ── 3. Map entity to response shape ─────────────────────
    const attrs: Record<string, string | number> = {};
    for (const attr of entity.attributes) {
      attrs[attr.key] = attr.value;
    }

    let payload: unknown = null;
    try {
      payload = entity.toJson();
    } catch {
      payload = null;
    }

    return Response.json({
      entityKey: entity.key,
      owner: entity.owner ?? null,
      creator: entity.creator ?? null,
      attributes: attrs,
      payload,
      contentType: entity.contentType ?? null,
      createdAtBlock: entity.createdAtBlock?.toString() ?? null,
      lastModifiedAtBlock: entity.lastModifiedAtBlock?.toString() ?? null,
      expiresAtBlock: entity.expiresAtBlock?.toString() ?? null,
    });
  } catch (err) {
    console.error("GET /api/device/[entityKey] error:", err);

    if (err instanceof NoEntityFoundError) {
      return Response.json({ error: "Device not found" }, { status: 404 });
    }

    const message =
      err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
