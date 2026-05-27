// ─────────────────────────────────────────────────────────────
// Wallet signature verification utility (G4)
// Blueprint §3 (Auth Flow point 4), §10 (G4)
//
// Uses viem.verifyMessage to verify wallet-signed nonces.
// Nonce is consumed (deleted) upon successful verification
// to prevent replay attacks.
// ─────────────────────────────────────────────────────────────

import { verifyMessage } from "viem";
import { getNonce } from "./nonce-store";

/**
 * Verify a wallet-signed nonce for authentication.
 *
 * @param address   - Ethereum address that signed the message (checksummed)
 * @param nonce     - The nonce string the wallet signed
 * @param signature - The `personal_sign` hex signature from the wallet
 * @returns `true` if verification succeeds
 * @throws {Error} if nonce is missing/expired, mismatched, or signature is invalid
 */
export async function verifyWalletAuth(
  address: `0x${string}`,
  nonce: string,
  signature: `0x${string}`,
): Promise<boolean> {
  // 1. Retrieve nonce from store (also consumes it — single-use)
  const storedNonce = getNonce(address);

  if (!storedNonce) {
    throw new Error("Auth failed: nonce missing or expired");
  }

  // 2. Verify the client-supplied nonce matches the one we issued
  if (storedNonce !== nonce) {
    throw new Error("Auth failed: nonce mismatch");
  }

  // 3. Verify the wallet signature against the nonce message
  const isValid = await verifyMessage({
    address,
    message: nonce,
    signature,
  });

  if (!isValid) {
    throw new Error("Auth failed: invalid signature");
  }

  return true;
}
