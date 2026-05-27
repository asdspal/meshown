import { eq, gt, lt } from "@arkiv-network/sdk/query";

import { publicClient, PROJECT_ATTRIBUTE, COORD_SCALE } from "@/lib/arkiv";

// ─────────────────────────────────────────────────────────────
// Quality Score Algorithm — Blueprint §6
//
// Computes a 0–100 quality score for a new reading based on
// deviation from neighbouring readings within a geographic
// bounding box and recent time window.
//
// Algorithm:
//   1. Query neighbour readings in bbox (±radiusDeg), last 30 min
//   2. If fewer than 2 neighbours → return 75 (default)
//   3. Compute mean of neighbour values
//   4. deviation = |newValue - mean| / (mean || 1)
//   5. score = max(0, round(100 - deviation * 200))
//
// Deviation 0% → score 100; deviation 50%+ → score 0
// ─────────────────────────────────────────────────────────────

/**
 * Computes a quality score (0–100) for a new reading based on
 * neighbour deviation within a geographic bounding box.
 *
 * Blueprint §6 — Quality Score Algorithm (exact match).
 *
 * @param newValue - The new sensor reading value
 * @param lat - Latitude of the reading
 * @param lng - Longitude of the reading
 * @param sensor_type - Sensor type (e.g. "air_quality")
 * @param radiusDeg - Bounding box radius in degrees (~5 km default)
 * @returns Quality score 0–100
 */
export async function computeQualityScore(
  newValue: number,
  lat: number,
  lng: number,
  sensor_type: string,
  radiusDeg: number = 0.05, // ~5 km
): Promise<number> {
  // 1. Query neighbour readings in bounding box, last 30 minutes
  //    Attributes are stored as scaled integers (micro-degrees), so scale query bounds
  const latScaled = Math.round(lat * COORD_SCALE);
  const lngScaled = Math.round(lng * COORD_SCALE);
  const radiusScaled = Math.round(radiusDeg * COORD_SCALE);

  let neighbours;
  try {
    neighbours = await publicClient
      .buildQuery()
      .where([
        eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value),
        eq("entityType", "reading"),
        eq("sensor_type", sensor_type),
        gt("lat", latScaled - radiusScaled),
        lt("lat", latScaled + radiusScaled),
        gt("lng", lngScaled - radiusScaled),
        lt("lng", lngScaled + radiusScaled),
        gt("timestamp", Date.now() - 30 * 60 * 1000),
      ])
      .withPayload(true)
      .limit(20)
      .fetch();
  } catch (err) {
    // RPC timeout / context cancelled — return default score gracefully
    console.warn("Quality score query failed, returning default 75:", err);
    return 75;
  }

  // 2. If fewer than 2 neighbours → return default score
  if (neighbours.entities.length < 2) return 75; // insufficient neighbours — default

  // 3. Extract values from neighbour payloads
  const values = neighbours.entities.map(
    (e) => e.toJson().value as number,
  );

  // 4. Compute mean and deviation
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const deviation = Math.abs(newValue - mean) / (mean || 1);

  // 5. Deviation 0% → score 100; deviation 50%+ → score 0
  return Math.max(0, Math.round(100 - deviation * 200));
}
