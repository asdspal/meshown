import type { NextRequest } from "next/server";
import type { Hex } from "viem";
import { NoEntityFoundError } from "@arkiv-network/sdk";
import { jsonToPayload, ExpirationTime } from "@arkiv-network/sdk/utils";

import { publicClient, walletClient, COORD_SCALE } from "@/lib/arkiv";
import { verifyWalletAuth } from "@/lib/auth";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Convert entity attributes array to a key→value map. */
function attrsToMap(
  attrs: Array<{ key: string; value: string | number }>,
): Record<string, string | number> {
  const map: Record<string, string | number> = {};
  for (const a of attrs) {
    map[a.key] = a.value;
  }
  return map;
}

/** Validate 0x + 64 hex char entity key format. */
function isValidEntityKey(key: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(key);
}

/** Validate 0x + 40 hex char Ethereum address format. */
function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

/**
 * Parse auth fields from request body and verify wallet signature.
 * Returns the verified address or throws with an appropriate HTTP response.
 */
async function verifyAuth(body: Record<string, unknown>): Promise<{
  address: Hex;
  response: null;
} | {
  address: null;
  response: Response;
}> {
  const address = body.address as Hex | undefined;
  const nonce = body.nonce as string | undefined;
  const signature = body.signature as `0x${string}` | undefined;

  if (!address || !nonce || !signature) {
    return {
      address: null,
      response: Response.json(
        { error: "Missing required auth fields: address, nonce, signature" },
        { status: 400 },
      ),
    };
  }

  if (!isValidAddress(address)) {
    return {
      address: null,
      response: Response.json(
        { error: "Invalid address format" },
        { status: 400 },
      ),
    };
  }

  try {
    await verifyWalletAuth(address, nonce, signature);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Auth verification failed";
    return {
      address: null,
      response: Response.json({ error: message }, { status: 401 }),
    };
  }

  return { address, response: null };
}

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
    if (!entityKey || !isValidEntityKey(entityKey)) {
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
    const attrs = attrsToMap(entity.attributes);

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

// ─────────────────────────────────────────────────────────────
// PUT /api/device/[entityKey]
// Blueprint §6 (Device Endpoints), §10 (updateEntity full-replace)
//
// Updates a SensorDevice entity. Fetches current attributes first,
// merges incoming changes, and writes the complete set via
// walletClient.updateEntity (full-replace semantics).
//
// Owner-only auth enforced: signer address must match entity owner.
// ─────────────────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ entityKey: string }> },
) {
  try {
    const { entityKey } = await params;

    // ── 1. Validate entityKey format ────────────────────────
    if (!entityKey || !isValidEntityKey(entityKey)) {
      return Response.json(
        {
          error:
            "Invalid entityKey format. Must be 0x-prefixed 64 hex characters (32 bytes).",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    // ── 2. Verify auth (G4) ─────────────────────────────────
    const auth = await verifyAuth(body);
    if (auth.response) return auth.response;
    const address = auth.address;

    // ── 3. Fetch entity and verify ownership ────────────────
    const entity = await publicClient.getEntity(entityKey as Hex);

    // Compare owner address (case-insensitive hex)
    const entityOwner = entity.owner?.toLowerCase();
    if (!entityOwner || entityOwner !== address.toLowerCase()) {
      return Response.json(
        { error: "Forbidden: signer is not the entity owner" },
        { status: 403 },
      );
    }

    // ── 4. Extract current attributes and payload ───────────
    const currentAttrs = attrsToMap(entity.attributes);

    let currentPayload: Record<string, unknown> = {};
    try {
      currentPayload = (entity.toJson() as Record<string, unknown>) ?? {};
    } catch {
      currentPayload = {};
    }

    // ── 5. Merge body updates into current state ────────────
    // Payload fields (stored in entity payload JSON)
    const updatedPayload = { ...currentPayload };
    if (body.name !== undefined) updatedPayload.name = body.name;
    if (body.description !== undefined) updatedPayload.description = body.description;
    if (body.manufacturer !== undefined) updatedPayload.manufacturer = body.manufacturer;
    if (body.firmwareVersion !== undefined) updatedPayload.firmwareVersion = body.firmwareVersion;

    const payload = jsonToPayload(updatedPayload);

    // Attribute fields (stored as on-chain key-value pairs)
    // Build the complete attribute array from current attrs + overrides
    const mergedAttrs: Record<string, string | number> = { ...currentAttrs };

    if (body.status !== undefined) {
      if (typeof body.status !== "string") {
        return Response.json(
          { error: "status must be a string (e.g. 'active', 'inactive', 'maintenance')" },
          { status: 400 },
        );
      }
      mergedAttrs.status = body.status;
    }

    if (body.sensor_type !== undefined) {
      if (typeof body.sensor_type !== "string") {
        return Response.json(
          { error: "sensor_type must be a string" },
          { status: 400 },
        );
      }
      mergedAttrs.sensor_type = body.sensor_type;
    }

    if (body.lat !== undefined) {
      if (typeof body.lat !== "number") {
        return Response.json(
          { error: "lat must be a number" },
          { status: 400 },
        );
      }
      mergedAttrs.lat = Math.round(body.lat * COORD_SCALE);
    }

    if (body.lng !== undefined) {
      if (typeof body.lng !== "number") {
        return Response.json(
          { error: "lng must be a number" },
          { status: 400 },
        );
      }
      mergedAttrs.lng = Math.round(body.lng * COORD_SCALE);
    }

    // Always update the modified timestamp
    mergedAttrs.updated_at = Date.now();

    // Convert merged attrs map back to Attribute[] array
    const attributes = Object.entries(mergedAttrs).map(([key, value]) => ({
      key,
      value,
    }));

    // ── 6. Call updateEntity (full-replace semantics) ────────
    const client = walletClient();
    const result = await client.updateEntity({
      entityKey: entityKey as Hex,
      payload,
      attributes,
      contentType: "application/json",
      expiresIn: ExpirationTime.fromDays(3650), // Preserve 10yr TTL (H5)
    });

    // ── 7. Return result ────────────────────────────────────
    return Response.json({
      entityKey: result.entityKey,
      txHash: result.txHash,
    });
  } catch (err) {
    console.error("PUT /api/device/[entityKey] error:", err);

    if (err instanceof NoEntityFoundError) {
      return Response.json({ error: "Device not found" }, { status: 404 });
    }

    const message =
      err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/device/[entityKey]
// Blueprint §6 (Device Endpoints), §10 (G11: delete leaves
//   readings/calibrations intact)
//
// Deletes a SensorDevice entity from Arkiv. Owner-only auth enforced.
// Associated reading and calibration entities are NOT removed (G11).
// ─────────────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ entityKey: string }> },
) {
  try {
    const { entityKey } = await params;

    // ── 1. Validate entityKey format ────────────────────────
    if (!entityKey || !isValidEntityKey(entityKey)) {
      return Response.json(
        {
          error:
            "Invalid entityKey format. Must be 0x-prefixed 64 hex characters (32 bytes).",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    // ── 2. Verify auth (G4) ─────────────────────────────────
    const auth = await verifyAuth(body);
    if (auth.response) return auth.response;
    const address = auth.address;

    // ── 3. Fetch entity and verify ownership ────────────────
    const entity = await publicClient.getEntity(entityKey as Hex);

    // Compare owner address (case-insensitive hex)
    const entityOwner = entity.owner?.toLowerCase();
    if (!entityOwner || entityOwner !== address.toLowerCase()) {
      return Response.json(
        { error: "Forbidden: signer is not the entity owner" },
        { status: 403 },
      );
    }

    // ── 4. Delete entity (G11: readings/calibrations intact) ─
    const client = walletClient();
    const result = await client.deleteEntity({
      entityKey: entityKey as Hex,
    });

    // ── 5. Return result ────────────────────────────────────
    return Response.json({
      entityKey: result.entityKey,
      txHash: result.txHash,
    });
  } catch (err) {
    console.error("DELETE /api/device/[entityKey] error:", err);

    if (err instanceof NoEntityFoundError) {
      return Response.json({ error: "Device not found" }, { status: 404 });
    }

    const message =
      err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
