import type { NextRequest } from "next/server";
import type { Hex } from "viem";
import { jsonToPayload, ExpirationTime } from "@arkiv-network/sdk/utils";
import { eq, gt, desc } from "@arkiv-network/sdk/query";

import {
  walletClient,
  publicClient,
  PROJECT_ATTRIBUTE,
  CREATOR_WALLET_ADDRESS,
  COORD_SCALE,
  VALUE_SCALE,
} from "@/lib/arkiv";

// ─────────────────────────────────────────────────────────────
// POST /api/agent/scan
// Blueprint §4 (Entity 4: AnomalyAlert), §6 (Alert Endpoints),
// §9 (Coverage Map)
//
// Cron-triggered anomaly detection endpoint. Fetches readings
// from the last 5 minutes, groups by device, compares each
// reading against that device's last 20 readings (rolling
// baseline), and creates AnomalyAlert entities for any value
// that deviates >3σ from the baseline mean.
//
// Auth: CRON_SECRET header (Bearer token).
// $creator = Agent wallet (implicit via walletClient).
// $owner = Device owner's wallet (via changeOwnership).
// expiresIn: ExpirationTime.fromDays(90) per §4.
// ─────────────────────────────────────────────────────────────

/** Helper: extract a key-value map from an entity's attributes array */
function attrsToMap(
  attributes: Array<{ key: string; value: string | number }>,
): Record<string, string | number> {
  const map: Record<string, string | number> = {};
  for (const attr of attributes) {
    map[attr.key] = attr.value;
  }
  return map;
}

/** Calculate population standard deviation [GAP: blueprint does not specify
 *  sample vs population; using population stddev which is more conservative] */
function stddev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length);
}

/** Calculate mean of an array of numbers */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export async function POST(request: NextRequest) {
  try {
    // ── 0. Validate creator address is configured (H1) ──────
    if (!CREATOR_WALLET_ADDRESS) {
      return Response.json(
        { error: "AGENT_WALLET_ADDRESS is not configured" },
        { status: 500 },
      );
    }

    // ── 1. Verify CRON_SECRET auth ───────────────────────────
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return Response.json(
        { error: "CRON_SECRET is not configured" },
        { status: 500 },
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return Response.json(
        { error: "Unauthorized — invalid or missing CRON_SECRET" },
        { status: 401 },
      );
    }

    // ── 2. Fetch all readings from the last 5 minutes ───────
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    const recentResult = await publicClient
      .buildQuery()
      .where([
        eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value),
        eq("entityType", "reading"),
        gt("timestamp", fiveMinutesAgo),
      ])
      .createdBy(CREATOR_WALLET_ADDRESS)
      .orderBy(desc("timestamp", "number"))
      .withPayload(true)
      .withAttributes(true)
      .withMetadata(true)
      .limit(500) // cap to avoid runaway queries
      .fetch();

    const recentReadings = recentResult.entities;

    if (recentReadings.length === 0) {
      return Response.json({ processed: 0, alerts_created: 0 });
    }

    // ── 3. Group recent readings by device_key ───────────────
    const byDevice = new Map<
      string,
      Array<{
        entityKey: string;
        value: number; // scaled integer from attribute
        timestamp: number;
        attrs: Record<string, string | number>;
      }>
    >();

    for (const entity of recentReadings) {
      const attrs = attrsToMap(entity.attributes);
      const deviceKey = attrs.device_key as string | undefined;
      const valueRaw = attrs.value;
      const timestamp = attrs.timestamp as number | undefined;

      if (
        !deviceKey ||
        typeof valueRaw !== "number" ||
        typeof timestamp !== "number"
      ) {
        continue; // skip malformed readings
      }

      if (!byDevice.has(deviceKey)) {
        byDevice.set(deviceKey, []);
      }
      byDevice.get(deviceKey)!.push({
        entityKey: entity.key,
        value: valueRaw,
        timestamp,
        attrs,
      });
    }

    // ── 4. For each device, fetch baseline and detect anomalies
    const client = walletClient();
    let alertCount = 0;

    // Process devices sequentially to avoid parallel SDK queries
    // (warned against in SDK best practices §4)
    for (const [deviceKey, recentDeviceReadings] of byDevice) {
      // 4a. Fetch the last 20 readings for this device as baseline
      let baselineValues: number[] = [];

      try {
        const baselineResult = await publicClient
          .buildQuery()
          .where([
            eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value),
            eq("entityType", "reading"),
            eq("device_key", deviceKey),
          ])
          .createdBy(CREATOR_WALLET_ADDRESS)
          .orderBy(desc("timestamp", "number"))
          .withAttributes(true)
          .limit(20)
          .fetch();

        baselineValues = baselineResult.entities
          .map((e) => {
            const a = attrsToMap(e.attributes);
            return a.value;
          })
          .filter((v): v is number => typeof v === "number");
      } catch (err) {
        console.warn(
          `Baseline query failed for device ${deviceKey}:`,
          err,
        );
        continue; // skip this device — can't establish baseline
      }

      // Need at least 2 data points for meaningful statistics
      if (baselineValues.length < 2) {
        continue;
      }

      const baselineMean = mean(baselineValues);
      const baselineStddev = stddev(baselineValues);

      // 4b. Check each recent reading against 3σ threshold
      for (const reading of recentDeviceReadings) {
        // Division by zero guard: if stddev === 0, only flag if value != mean
        let isAnomaly = false;
        if (baselineStddev === 0) {
          isAnomaly = reading.value !== baselineMean;
        } else {
          const deviation = Math.abs(reading.value - baselineMean);
          isAnomaly = deviation > 3 * baselineStddev;
        }

        if (!isAnomaly) continue;

        // 4c. Fetch parent device to get lat, lng, sensor_type, and $owner
        let deviceOwner: string;
        let latScaled: number;
        let lngScaled: number;
        let sensorType: string;

        try {
          const deviceEntity = await publicClient.getEntity(
            deviceKey as Hex,
          );
          const deviceAttrs = attrsToMap(deviceEntity.attributes);

          deviceOwner = deviceEntity.owner ?? CREATOR_WALLET_ADDRESS;
          latScaled =
            typeof deviceAttrs.lat === "number" ? deviceAttrs.lat : 0;
          lngScaled =
            typeof deviceAttrs.lng === "number" ? deviceAttrs.lng : 0;
          sensorType =
            typeof deviceAttrs.sensor_type === "string"
              ? deviceAttrs.sensor_type
              : "unknown";
        } catch (err) {
          console.warn(
            `Failed to fetch device ${deviceKey} for alert:`,
            err,
          );
          continue; // skip this alert — can't get device info
        }

        // 4d. Calculate display values (unscaled) for payload
        const observedValueDisplay =
          reading.value / VALUE_SCALE;
        const baselineValueDisplay =
          baselineMean / VALUE_SCALE;

        // Confidence: scaled by how many σ the deviation is,
        // capped at 0.99. [GAP: exact formula not in blueprint]
        const sigmaCount =
          baselineStddev === 0
            ? 5 // arbitrary high confidence when stddev is 0
            : Math.abs(reading.value - baselineMean) / baselineStddev;
        const confidenceFloat = Math.min(
          0.99,
          0.5 + sigmaCount * 0.1,
        );
        const confidenceInt = Math.round(confidenceFloat * 100); // 0-100 for attribute

        // Determine severity based on sigma count
        const severity =
          sigmaCount >= 5 ? "high" : sigmaCount >= 4 ? "medium" : "low";

        // Build human-readable description
        const pctChange =
          baselineValueDisplay !== 0
            ? Math.round(
                (Math.abs(observedValueDisplay - baselineValueDisplay) /
                  Math.abs(baselineValueDisplay)) *
                  100,
              )
            : 0;
        const direction =
          observedValueDisplay > baselineValueDisplay ? "rose" : "fell";
        const description = `Value ${direction} ${pctChange}% from baseline (${baselineValueDisplay.toFixed(2)} → ${observedValueDisplay.toFixed(2)}) — ${sigmaCount.toFixed(1)}σ deviation detected`;

        // 4e. Construct AnomalyAlert payload (§4 Entity 4)
        const alertPayload = jsonToPayload({
          anomaly_type: "spike",
          description,
          baseline_value: baselineValueDisplay,
          observed_value: observedValueDisplay,
          confidence: confidenceFloat,
          affected_reading_key: reading.entityKey,
        });

        // 4f. Construct AnomalyAlert attributes (§4 Entity 4)
        const alertAttributes = [
          PROJECT_ATTRIBUTE,
          { key: "entityType", value: "anomaly_alert" },
          { key: "device_key", value: deviceKey },
          { key: "sensor_type", value: sensorType },
          { key: "severity", value: severity },
          { key: "lat", value: latScaled },
          { key: "lng", value: lngScaled },
          { key: "timestamp", value: Date.now() },
          { key: "confidence", value: confidenceInt },
        ];

        // 4g. Create AnomalyAlert entity on Arkiv
        // $creator = Agent wallet (implicit via walletClient)
        // expiresIn: 90 days per §4
        const createResult = await client.createEntity({
          payload: alertPayload,
          attributes: alertAttributes,
          contentType: "application/json",
          expiresIn: ExpirationTime.fromDays(90),
        });

        // 4h. Transfer ownership to device owner
        // $owner = device owner's wallet
        await client.changeOwnership({
          entityKey: createResult.entityKey,
          newOwner: deviceOwner as Hex,
        });

        alertCount++;
        console.log(
          `AnomalyAlert created: ${createResult.entityKey} for device ${deviceKey} (owner: ${deviceOwner})`,
        );
      }
    }

    // ── 5. Return summary ────────────────────────────────────
    return Response.json({
      processed: recentReadings.length,
      alerts_created: alertCount,
    });
  } catch (err) {
    console.error("POST /api/agent/scan error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
