import type { NextRequest } from "next/server";
import type { Hex } from "viem";
import { jsonToPayload, ExpirationTime } from "@arkiv-network/sdk/utils";

import { walletClient, PROJECT_ATTRIBUTE, COORD_SCALE } from "@/lib/arkiv";
import { verifyWalletAuth } from "@/lib/auth";
import { SensorDevicePayloadSchema } from "@/lib/schemas";

// ─────────────────────────────────────────────────────────────
// POST /api/device/register
// Blueprint §6 (Device Endpoints), §4 (Entity 1: SensorDevice)
// §11 (C1, H1, H5)
//
// Creates a SensorDevice entity on Arkiv using the agent wallet,
// then transfers ownership to the requesting user's wallet.
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

    // ── 3. Validate payload via SensorDevicePayloadSchema ────
    const payloadResult = SensorDevicePayloadSchema.safeParse({
      name: body.name,
      description: body.description,
      manufacturer: body.manufacturer,
      firmwareVersion: body.firmwareVersion,
    });

    if (!payloadResult.success) {
      return Response.json(
        { error: "Invalid device payload", details: payloadResult.error.flatten() },
        { status: 400 },
      );
    }

    // ── 4. Extract and validate metadata fields ──────────────
    const sensor_type = body.sensor_type as string | undefined;
    const lat = body.lat;
    const lng = body.lng;

    if (!sensor_type || typeof sensor_type !== "string") {
      return Response.json(
        { error: "Missing or invalid sensor_type" },
        { status: 400 },
      );
    }

    if (typeof lat !== "number" || typeof lng !== "number") {
      return Response.json(
        { error: "lat and lng must be numbers" },
        { status: 400 },
      );
    }

    // ── 5. Construct payload and attributes ──────────────────
    const payload = jsonToPayload(payloadResult.data);

    // Scale lat/lng to micro-degrees (BigInt-safe integers)
    const latScaled = Math.round(lat * COORD_SCALE);
    const lngScaled = Math.round(lng * COORD_SCALE);

    const attributes = [
      PROJECT_ATTRIBUTE,
      { key: "entityType", value: "sensor_device" },
      { key: "sensor_type", value: sensor_type },
      { key: "lat", value: latScaled },
      { key: "lng", value: lngScaled },
      { key: "status", value: "active" },
      { key: "registered_at", value: Date.now() },
    ];

    // ── 6. Create entity on Arkiv (H5: 10yr TTL) ────────────
    const client = walletClient();

    const createResult = await client.createEntity({
      payload,
      attributes,
      contentType: "application/json",
      expiresIn: ExpirationTime.fromDays(3650),
    });

    // ── 7. Transfer ownership to user's wallet ───────────────
    const ownershipResult = await client.changeOwnership({
      entityKey: createResult.entityKey,
      newOwner: ownerAddress as Hex,
    });

    // ── 8. Return result ─────────────────────────────────────
    return Response.json({
      entityKey: ownershipResult.entityKey,
      txHash: ownershipResult.txHash,
    });
  } catch (err) {
    console.error("POST /api/device/register error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
