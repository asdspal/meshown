import type { NextRequest } from "next/server";
import type { Hex } from "viem";
import { jsonToPayload, ExpirationTime } from "@arkiv-network/sdk/utils";

import { walletClient, PROJECT_ATTRIBUTE, OFFSET_SCALE } from "@/lib/arkiv";
import { verifyWalletAuth } from "@/lib/auth";
import { CalibrationRecordPayloadSchema } from "@/lib/schemas";

// ─────────────────────────────────────────────────────────────
// POST /api/calibration/add
// Blueprint §4 (Entity 3: CalibrationRecord), §6 (Calibration Endpoints)
// §11 (C1, H1)
//
// Creates a CalibrationRecord entity on Arkiv using the agent wallet,
// then transfers ownership to the requesting user's wallet.
//
// Calibration records have a 10-year TTL (C1: fromDays(3650)).
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

    // ── 3. Validate payload via CalibrationRecordPayloadSchema
    const payloadResult = CalibrationRecordPayloadSchema.safeParse({
      offset_value: body.offset_value,
      offset_unit: body.offset_unit,
      calibration_method: body.calibration_method,
      notes: body.notes,
    });

    if (!payloadResult.success) {
      return Response.json(
        { error: "Invalid calibration payload", details: payloadResult.error.flatten() },
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

    // ── 5. Extract and validate valid_until_ms ───────────────
    const valid_until_ms = body.valid_until_ms as number | undefined;

    if (typeof valid_until_ms !== "number" || valid_until_ms <= Date.now()) {
      return Response.json(
        { error: "valid_until_ms must be a future Unix timestamp in milliseconds" },
        { status: 400 },
      );
    }

    // ── 6. Construct payload and attributes ──────────────────
    const now = Date.now();

    const payload = jsonToPayload(payloadResult.data);

    const attributes = [
      PROJECT_ATTRIBUTE,
      { key: "entityType", value: "calibration_record" },
      { key: "device_key", value: deviceKey },
      { key: "calibrated_by", value: ownerAddress },
      { key: "valid_from", value: now },
      { key: "valid_until", value: valid_until_ms },
      { key: "offset_value", value: Math.round(payloadResult.data.offset_value * OFFSET_SCALE) },
      { key: "offset_unit", value: payloadResult.data.offset_unit },
      { key: "calibration_method", value: payloadResult.data.calibration_method },
    ];

    // ── 7. Create entity on Arkiv (C1: 10yr TTL) ────────────
    const client = walletClient();

    const createResult = await client.createEntity({
      payload,
      attributes,
      contentType: "application/json",
      expiresIn: ExpirationTime.fromDays(3650),
    });

    // ── 8. Transfer ownership to user's wallet ──────────────
    const ownershipResult = await client.changeOwnership({
      entityKey: createResult.entityKey,
      newOwner: ownerAddress as Hex,
    });

    // ── 9. Return result ─────────────────────────────────────
    return Response.json({
      entityKey: ownershipResult.entityKey,
      txHash: ownershipResult.txHash,
    });
  } catch (err) {
    console.error("POST /api/calibration/add error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
