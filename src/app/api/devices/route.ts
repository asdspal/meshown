import type { NextRequest } from "next/server";
import { eq, gte, lte } from "@arkiv-network/sdk/query";

import { publicClient, PROJECT_ATTRIBUTE, CREATOR_WALLET_ADDRESS } from "@/lib/arkiv";

// ─────────────────────────────────────────────────────────────
// GET /api/devices
// Blueprint §6 (Device Endpoints), §11 (H1, H4)
//
// Lists all SensorDevice entities created by the agent wallet.
// Supports optional bounding-box filtering via lat_min/lat_max/lng_min/lng_max
// and optional sensor_type filter.
//
// H1: .createdBy(CREATOR_WALLET_ADDRESS) scoped to agent wallet.
// H4: Uses eq() only for string attributes (no glob ~ operator).
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
    const latMin = searchParams.get("lat_min");
    const latMax = searchParams.get("lat_max");
    const lngMin = searchParams.get("lng_min");
    const lngMax = searchParams.get("lng_max");
    const sensorType = searchParams.get("sensor_type");
    const limitParam = searchParams.get("limit");
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
      eq("entityType", "sensor_device"),
    ];

    // Optional: filter by sensor_type (H4: eq for string attribute)
    if (sensorType) {
      predicates.push(eq("sensor_type", sensorType));
    }

    // Optional: bounding-box filter on numeric lat/lng attributes
    if (latMin !== null) {
      const val = parseFloat(latMin);
      if (!isNaN(val)) predicates.push(gte("lat", val));
    }
    if (latMax !== null) {
      const val = parseFloat(latMax);
      if (!isNaN(val)) predicates.push(lte("lat", val));
    }
    if (lngMin !== null) {
      const val = parseFloat(lngMin);
      if (!isNaN(val)) predicates.push(gte("lng", val));
    }
    if (lngMax !== null) {
      const val = parseFloat(lngMax);
      if (!isNaN(val)) predicates.push(lte("lng", val));
    }

    // ── 3. Execute query (H1: scoped to agent creator) ─────
    const result = await publicClient
      .buildQuery()
      .where(predicates)
      .createdBy(CREATOR_WALLET_ADDRESS)
      .withPayload(true)
      .withAttributes(true)
      .withMetadata(true)
      .limit(limit)
      .fetch();

    // ── 4. Map entities to response shape ───────────────────
    // [GAP] Blueprint assumes `total: 42` but SDK returns no count.
    // Using entities.length as total for MVP (no separate count query).
    const devices = result.entities.map((entity) => {
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
      devices,
      total: devices.length,
    });
  } catch (err) {
    console.error("GET /api/devices error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
