import type { NextRequest } from "next/server";
import type { Hex } from "viem";
import { jsonToPayload, ExpirationTime } from "@arkiv-network/sdk/utils";
import { eq, lte, gte } from "@arkiv-network/sdk/query";

import { walletClient, publicClient, PROJECT_ATTRIBUTE } from "@/lib/arkiv";
import { verifyWalletAuth } from "@/lib/auth";
import { ReadingPayloadSchema } from "@/lib/schemas";
import { computeQualityScore } from "@/lib/quality-score";

// ─────────────────────────────────────────────────────────────
// POST /api/reading/submit
// Blueprint §4 (Entity 2: Reading), §6 (Reading Endpoints),
// §9 (Denormalised lat/lng)
//
// Creates a Reading entity on Arkiv with denormalised lat/lng
// copied from the parent SensorDevice. Computes quality score
// via neighbour comparison. Short TTL (30 days).
//
// Auth: G4 personal_sign nonce pattern via verifyWalletAuth.
// ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ── 1. Extract auth fields (G4) ──────────────────────────
    const ownerAddress = body.ownerAddress as Hex | undefined;
    const nonce = body.nonce as string | undefined;
    const signature = body.signature as `0x${string}` | undefined;

    if (!ownerAddress || !nonce || !signature) {
      return Response.json(
        { error: "Missing required auth fields: ownerAddress, nonce, signature" },
        { status: 400 },
      );
    }

    // Validate address format
    if (!/^0x[0-9a-fA-F]{40}$/.test(ownerAddress)) {
      return Response.json(
        { error: "Invalid ownerAddress format" },
        { status: 400 },
      );
    }

    // ── 2. Verify wallet auth (G4) ───────────────────────────
    try {
      await verifyWalletAuth(
        ownerAddress as `0x${string}`,
        nonce,
        signature,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Auth verification failed";
      return Response.json({ error: message }, { status: 401 });
    }

    // ── 3. Validate reading payload ──────────────────────────
    // quality_score is computed server-side, so omit it from client input
    const ReadingInputSchema = ReadingPayloadSchema.omit({ quality_score: true });

    const payloadResult = ReadingInputSchema.safeParse({
      value: body.value,
      unit: body.unit,
      calibration_key: body.calibration_key,
      raw: body.raw,
    });

    if (!payloadResult.success) {
      return Response.json(
        { error: "Invalid reading payload", details: payloadResult.error.flatten() },
        { status: 400 },
      );
    }

    // ── 4. Extract and validate deviceKey ────────────────────
    const deviceKey = body.deviceKey as string | undefined;

    if (!deviceKey || typeof deviceKey !== "string") {
      return Response.json(
        { error: "Missing or invalid deviceKey" },
        { status: 400 },
      );
    }

    if (!/^0x[0-9a-fA-F]{64}$/.test(deviceKey)) {
      return Response.json(
        { error: "Invalid deviceKey format (expected 0x + 64 hex chars)" },
        { status: 400 },
      );
    }

    // ── 5. Fetch parent device to get lat/lng/sensor_type ────
    let deviceEntity;
    try {
      deviceEntity = await publicClient.getEntity(deviceKey as Hex);
    } catch {
      return Response.json(
        { error: "Device not found" },
        { status: 404 },
      );
    }

    // Extract attributes from device entity
    const deviceAttrs: Record<string, string | number> = {};
    for (const attr of deviceEntity.attributes) {
      deviceAttrs[attr.key] = attr.value;
    }

    const lat = deviceAttrs.lat;
    const lng = deviceAttrs.lng;
    const sensor_type = deviceAttrs.sensor_type;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return Response.json(
        { error: "Device missing numeric lat/lng attributes" },
        { status: 400 },
      );
    }

    if (typeof sensor_type !== "string") {
      return Response.json(
        { error: "Device missing sensor_type attribute" },
        { status: 400 },
      );
    }

    // ── 6. Fetch active CalibrationRecord for this device ────
    // [GAP] Blueprint §6 says "valid_from <= now <= valid_until"
    // SDK operators inferred as lte("valid_from", now) and gte("valid_until", now)
    const now = Date.now();

    let calibrationKey = payloadResult.data.calibration_key;
    let activeCalibrationFound = false;

    try {
      const calResult = await publicClient
        .buildQuery()
        .where([
          eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value),
          eq("entityType", "calibration_record"),
          eq("device_key", deviceKey),
          lte("valid_from", now),
          gte("valid_until", now),
        ])
        .withPayload(true)
        .withAttributes(true)
        .limit(1)
        .fetch();

      if (calResult.entities.length > 0) {
        activeCalibrationFound = true;
        // Use the entity key of the active calibration
        calibrationKey = calResult.entities[0].key;
      }
    } catch (err) {
      // Calibration query failure is non-fatal — proceed with client-supplied key
      console.warn("Calibration query failed, using client-supplied key:", err);
    }

    if (!activeCalibrationFound) {
      console.warn(
        `No active calibration found for device ${deviceKey} — using client-supplied calibration_key`,
      );
    }

    // ── 7. Compute quality_score via neighbour comparison ────
    const quality_score = await computeQualityScore(
      payloadResult.data.value,
      lat,
      lng,
      sensor_type,
    );

    // ── 8. Construct payload and attributes ──────────────────
    const readingPayload = jsonToPayload({
      value: payloadResult.data.value,
      unit: payloadResult.data.unit,
      quality_score,
      calibration_key: calibrationKey,
      raw: payloadResult.data.raw,
    });

    const attributes = [
      PROJECT_ATTRIBUTE,
      { key: "entityType", value: "reading" },
      { key: "sensor_type", value: sensor_type },
      { key: "device_key", value: deviceKey },
      { key: "lat", value: lat },        // denormalised from device (§9)
      { key: "lng", value: lng },        // denormalised from device (§9)
      { key: "value", value: payloadResult.data.value },
      { key: "quality_score", value: quality_score },
      { key: "timestamp", value: now },
    ];

    // ── 9. Create entity on Arkiv (30-day TTL per §4) ───────
    const client = walletClient();

    const createResult = await client.createEntity({
      payload: readingPayload,
      attributes,
      contentType: "application/json",
      expiresIn: ExpirationTime.fromDays(30),
    });

    // ── 10. Transfer ownership to user's wallet ──────────────
    const ownershipResult = await client.changeOwnership({
      entityKey: createResult.entityKey,
      newOwner: ownerAddress as Hex,
    });

    // ── 11. Return result ─────────────────────────────────────
    return Response.json({
      entityKey: ownershipResult.entityKey,
      txHash: ownershipResult.txHash,
      quality_score,
    });
  } catch (err) {
    console.error("POST /api/reading/submit error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
