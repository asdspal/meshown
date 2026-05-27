import { defineChain, http } from "viem";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { fallback } from "wagmi";

/**
 * Arkiv Braga Testnet chain definition.
 * @see Extraction 11 (L3) — chain details from blueprint.
 */
export const bragaTestnet = defineChain({
  id: 60138453102,
  name: "Arkiv Braga Testnet",
  nativeCurrency: {
    name: "Golem",
    symbol: "GLM",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://braga.hoodi.arkiv.network/rpc"],
    },
  },
  testnet: true,
});

/**
 * Wagmi + RainbowKit configuration.
 *
 * Uses RainbowKit's `getDefaultConfig` which internally creates the wagmi
 * config with sensible defaults (injected wallet, WalletConnect, etc.).
 *
 * A WalletConnect project ID is required for the WalletConnect connector.
 * Get one at https://cloud.walletconnect.com
 */
export const config = getDefaultConfig({
  appName: "MeshOwn",
  appDescription: "Decentralized mesh network ownership on Arkiv",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
  chains: [bragaTestnet],
  transports: {
    [bragaTestnet.id]: fallback([
      http("https://braga.hoodi.arkiv.network/rpc"),
    ]),
  },
});
