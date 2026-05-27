import type { NextRequest } from "next/server";
import { setNonce } from "@/lib/nonce-store";

// ─────────────────────────────────────────────────────────────
// GET /api/auth/nonce?address=0x...
// Blueprint §6, §10 — G4: personal_sign nonce pattern
// Generates a UUID nonce, stores it with 5-min TTL, returns it.
// ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");

  if (!address) {
    return Response.json(
      { error: "Missing required query parameter: address" },
      { status: 400 },
    );
  }

  // Basic format check — must start with 0x and be 42 chars
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return Response.json(
      { error: "Invalid Ethereum address format" },
      { status: 400 },
    );
  }

  const nonce = setNonce(address);

  return Response.json({ nonce });
}
