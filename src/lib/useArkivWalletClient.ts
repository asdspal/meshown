"use client";

/**
 * useArkivWalletClient — Bridges wagmi wallet connection to Arkiv SDK wallet client.
 *
 * Uses the browser's EIP-1193 provider (MetaMask) via wagmi's useWalletClient()
 * to create an Arkiv SDK wallet client with transport: custom(wagmiClient.transport).
 *
 * This enables direct MetaMask-signed writes to Arkiv, bypassing the server-side
 * agent wallet where user-owned entity operations are needed.
 *
 * Blueprint: §11 (C4 constraint) — useArkivWalletClient() must use
 * transport: custom(wagmiWalletClient.transport).
 */

import { useMemo } from "react";
import { useWalletClient } from "wagmi";
import { createWalletClient } from "@arkiv-network/sdk";
import { custom } from "viem";
import { bragaTestnet } from "@/config/wagmi";

export function useArkivWalletClient() {
  const { data: wagmiClient } = useWalletClient();

  const arkivWalletClient = useMemo(() => {
    if (!wagmiClient) return undefined;

    return createWalletClient({
      chain: bragaTestnet,
      transport: custom(wagmiClient.transport),
    });
  }, [wagmiClient]);

  return {
    arkivWalletClient,
    isConnected: !!wagmiClient,
  };
}
