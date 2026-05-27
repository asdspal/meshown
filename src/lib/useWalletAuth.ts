"use client";

/**
 * useWalletAuth — Custom hook for the G4 personal_sign nonce authentication flow.
 *
 * [GAP] This hook is inferred from Blueprint §3 (Auth Flow) and §10 (G4 constraint).
 * The blueprint specifies "Client signs nonce via personal_sign" but does not detail
 * the exact hook implementation. The pattern is derived from the existing API routes.
 *
 * Flow:
 *   1. Fetch a nonce from GET /api/auth/nonce?address=0x...
 *   2. Sign the nonce with the connected wallet via personal_sign
 *   3. Return { address, nonce, signature } for inclusion in POST request bodies
 */

import { useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";

export interface AuthSignature {
  ownerAddress: string;
  nonce: string;
  signature: string;
}

/**
 * Fetches a server-side nonce and signs it with the connected wallet.
 * Returns the auth payload needed for all POST endpoints (G4 pattern).
 *
 * @throws {Error} If wallet is not connected or signing fails
 */
export function useWalletAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const getAuthSignature = useCallback(async (): Promise<AuthSignature> => {
    if (!isConnected || !address) {
      throw new Error("Wallet not connected");
    }

    // Step 1: Fetch nonce from server
    const nonceRes = await fetch(
      `/api/auth/nonce?address=${encodeURIComponent(address)}`,
    );

    if (!nonceRes.ok) {
      const body = await nonceRes.json().catch(() => ({}));
      throw new Error(body.error || `Failed to fetch nonce (HTTP ${nonceRes.status})`);
    }

    const { nonce } = (await nonceRes.json()) as { nonce: string };

    if (!nonce) {
      throw new Error("Server returned empty nonce");
    }

    // Step 2: Sign the nonce with the connected wallet (personal_sign)
    const signature = await signMessageAsync({ message: nonce });

    // Step 3: Return auth payload
    return {
      ownerAddress: address,
      nonce,
      signature,
    };
  }, [address, isConnected, signMessageAsync]);

  return {
    getAuthSignature,
    isConnected,
    address,
  };
}
