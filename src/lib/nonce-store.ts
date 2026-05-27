// ─────────────────────────────────────────────────────────────
// In-memory nonce store for wallet signature verification (G4)
// Blueprint §6, §10 — UUID nonce, 5-minute TTL, single-use
//
// ⚠️  [GAP] Blueprint does not specify exact file structure for
//     the store; this follows the standard in-memory Map pattern.
// ─────────────────────────────────────────────────────────────

const NONCE_TTL_MS = 300_000; // 5 minutes

interface NonceEntry {
  nonce: string;
  expires: number;
}

const nonceMap = new Map<string, NonceEntry>();

/**
 * Generate and store a new nonce for the given wallet address.
 * Overwrites any existing nonce for the same address.
 * Returns the generated nonce string.
 */
export function setNonce(address: string): string {
  const nonce = crypto.randomUUID();
  nonceMap.set(address.toLowerCase(), {
    nonce,
    expires: Date.now() + NONCE_TTL_MS,
  });
  return nonce;
}

/**
 * Retrieve and consume the nonce for the given address.
 * Returns the nonce string if valid and not expired, otherwise null.
 * The nonce is deleted from the store after retrieval (single-use).
 */
export function getNonce(address: string): string | null {
  const key = address.toLowerCase();
  const entry = nonceMap.get(key);

  if (!entry) {
    return null;
  }

  // Expired — clean up
  if (Date.now() > entry.expires) {
    nonceMap.delete(key);
    return null;
  }

  // Consume (single-use)
  nonceMap.delete(key);
  return entry.nonce;
}
