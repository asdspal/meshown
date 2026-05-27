import type { NextRequest } from "next/server";
import { eq, gt, lt, gte, desc } from "@arkiv-network/sdk/query";

import {
  publicClient,
  PROJECT_ATTRIBUTE,
  CREATOR_WALLET_ADDRESS,
  COORD_SCALE,
} from "@/lib/arkiv";

// ─────────────────────────────────────────────────────────────
// GET /api/readings/mesh
// Blueprint §5 (Screen 4 code snippet), §6 (Mesh Query Endpoint),
// §10 (G8 — GET for linkability, G10 — truncation at 200),
// §11 (H1, H3, H4)
//
// The flagship bounding-box, multi-owner mesh query.
// Accepts geographic bounds and filter params as URL search params,
// making results fully linkable and bookmarkable (G8).
//
// H1: .createdBy(CREATOR_WALLET_ADDRESS) scopes all queries to agent wallet.
// H3: desc() imported from @arkiv-network/sdk/query for ordering.
// H4: eq() only for string attributes; gt()/lt()/gte() for numeric.
//
// Query params (from URL — §5 "Run Mesh Query" serialisation):
//   - sw_lat     (required): south-west latitude  (float degrees)
//   - sw_lng     (required): south-west longitude (float degrees)
//   - ne_lat     (required): north-east latitude  (float degrees)
//   - ne_lng     (required): north-east longitude (float degrees)
//   - sensor_type (optional): filter by sensor type enum; "all" or omitted = no filter
//   - min_quality (optional): minimum quality_score threshold, default 0
//   - hours       (optional): time window in hours, default 24
//
// Response: { readings: [...], summary: { count, unique_owners, avg_quality, truncated } }
// truncated = true when result set hits the 200-entity page cap (G10).
// ─────────────────────────────────────────────────────────────

const MESH_LIMIT = 200;

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

    // ── 1. Parse and validate required bbox parameters ──────
    const swLatParam = searchParams.get("sw_lat");
    const swLngParam = searchParams.get("sw_lng");
    const neLatParam = searchParams.get("ne_lat");
    const neLngParam = searchParams.get("ne_lng");

    if (!swLatParam || !swLngParam || !neLatParam || !neLngParam) {
      return Response.json(
        {
          error:
            "Missing required query parameters: sw_lat, sw_lng, ne_lat, ne_lng",
        },
        { status: 400 },
      );
    }

    const sw_lat = parseFloat(swLatParam);
    const sw_lng = parseFloat(swLngParam);
    const ne_lat = parseFloat(neLatParam);
    const ne_lng = parseFloat(neLngParam);

    if (
      isNaN(sw_lat) ||
      isNaN(sw_lng) ||
      isNaN(ne_lat) ||
      isNaN(ne_lng)
    ) {
      return Response.json(
        { error: "Bounding box coordinates must be valid numbers" },
        { status: 400 },
      );
    }

    // Validate bbox logical bounds
    if (sw_lat >= ne_lat || sw_lng >= ne_lng) {
      return Response.json(
        {
          error:
            "Invalid bounding box: sw_lat must be < ne_lat and sw_lng must be < ne_lng",
        },
        { status: 400 },
      );
    }

    // ── 2. Parse optional filter parameters ─────────────────
    const sensorTypeParam = searchParams.get("sensor_type");
    const sensor_type =
      sensorTypeParam && sensorTypeParam !== "all"
        ? sensorTypeParam
        : null;

    const minQualityParam = searchParams.get("min_quality");
    const min_quality = minQualityParam ? parseInt(minQualityParam, 10) : 0;
    if (isNaN(min_quality) || min_quality < 0 || min_quality > 100) {
      return Response.json(
        { error: "min_quality must be between 0 and 100" },
        { status: 400 },
      );
    }

    const hoursParam = searchParams.get("hours");
    const hours = hoursParam ? parseInt(hoursParam, 10) : 24;
    if (isNaN(hours) || hours < 1 || hours > 720) {
      return Response.json(
        { error: "hours must be between 1 and 720" },
        { status: 400 },
      );
    }

    // ── 3. Scale bbox to micro-degrees (COORD_SCALE) ───────
    // Arkiv stores lat/lng as BigInt integers — float degrees
    // are multiplied by COORD_SCALE before storage.
    const swLatScaled = Math.round(sw_lat * COORD_SCALE);
    const swLngScaled = Math.round(sw_lng * COORD_SCALE);
    const neLatScaled = Math.round(ne_lat * COORD_SCALE);
    const neLngScaled = Math.round(ne_lng * COORD_SCALE);

    // ── 4. Compute time boundary ───────────────────────────
    const sinceTimestamp = Date.now() - hours * 3600000;

    // ── 5. Build predicates ─────────────────────────────────
    // Exact query from Blueprint §5 (Screen 4 code snippet):
    // eq(PROJECT_ATTRIBUTE), eq("entityType", "reading"),
    // ...optional sensor_type, gt("lat", sw), lt("lat", ne),
    // gt("lng", sw), lt("lng", ne), gte("quality_score", min),
    // gt("timestamp", cutoff)
    //
    // H4: eq() for string attrs, gt()/lt()/gte() for numeric attrs.
    // H3: desc() imported from @arkiv-network/sdk/query.
    const predicates = [
      eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value),
      eq("entityType", "reading"),
      // Optional sensor_type filter (H4: eq for string attribute)
      ...(sensor_type ? [eq("sensor_type", sensor_type)] : []),
      // Bounding-box range on denormalised lat/lng (numeric, scaled)
      gt("lat", swLatScaled),
      lt("lat", neLatScaled),
      gt("lng", swLngScaled),
      lt("lng", neLngScaled),
      // Quality score floor (numeric, 0-100, not scaled)
      gte("quality_score", min_quality),
      // Time window (numeric, Unix ms)
      gt("timestamp", sinceTimestamp),
    ];

    // ── 6. Execute query (H1: scoped to agent creator) ─────
    // G10: limit(200) — truncation flag when hit
    const result = await publicClient
      .buildQuery()
      .where(predicates)
      .createdBy(CREATOR_WALLET_ADDRESS)
      .withPayload(true)
      .withAttributes(true)
      .withMetadata(true)
      .orderBy(desc("timestamp", "number"))
      .limit(MESH_LIMIT)
      .fetch();

    // ── 7. Map entities to response shape ───────────────────
    const readings = result.entities.map((entity) => {
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

    // ── 8. Compute summary stats ────────────────────────────
    const count = readings.length;

    // unique_owners: set of $owner addresses across all results
    const ownerSet = new Set<string>();
    for (const r of readings) {
      if (r.owner) {
        ownerSet.add(r.owner);
      }
    }
    const unique_owners = ownerSet.size;

    // avg_quality: average of quality_score attribute values
    let qualitySum = 0;
    let qualityCount = 0;
    for (const r of readings) {
      const qs = r.attributes.quality_score;
      if (typeof qs === "number") {
        qualitySum += qs;
        qualityCount++;
      }
    }
    const avg_quality =
      qualityCount > 0
        ? Math.round((qualitySum / qualityCount) * 100) / 100
        : 0;

    // G10: truncated flag — true when results hit the 200-entity cap
    const truncated = result.entities.length === MESH_LIMIT;

    // ── 9. Return response ──────────────────────────────────
    return Response.json({
      readings,
      summary: {
        count,
        unique_owners,
        avg_quality,
        truncated,
      },
    });
  } catch (err) {
    console.error("GET /api/readings/mesh error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
