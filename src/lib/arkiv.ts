import { createPublicClient, createWalletClient, http } from "@arkiv-network/sdk";
import { privateKeyToAccount } from "viem/accounts";
import { type Address } from "viem";

// ─────────────────────────────────────────────────────────────
// Project attribute — used on every entity write + query filter
// Extraction 4: PROJECT_ATTRIBUTE
// ─────────────────────────────────────────────────────────────
export const PROJECT_ATTRIBUTE = {
  key: "project",
  value: "meshown-v1",
} as const;

// ─────────────────────────────────────────────────────────────
// Attribute scale factors
// Arkiv SDK stores numeric attributes as BigInt — only integers.
// Floats must be scaled to integers before writing, divided when reading.
// ─────────────────────────────────────────────────────────────

/** Coordinates: micro-degrees. 1 degree = 1,000,000 units (~11 cm precision). */
export const COORD_SCALE = 1_000_000;

/** Sensor reading values: centi-units. 1 unit = 100 centi-units. */
export const VALUE_SCALE = 100;

/** Calibration offset values: milli-units. 1 unit = 1000 milli-units. */
export const OFFSET_SCALE = 1000;

// ─────────────────────────────────────────────────────────────
// Creator wallet address — derived from AGENT_PRIVATE_KEY
// Used for .createdBy() attribution on agent-written entities.
// MUST match the address derived from AGENT_PRIVATE_KEY.
// ─────────────────────────────────────────────────────────────
export const CREATOR_WALLET_ADDRESS =
  process.env.AGENT_WALLET_ADDRESS as Address | undefined;

// ─────────────────────────────────────────────────────────────
// Braga chain config for Arkiv SDK
// ─────────────────────────────────────────────────────────────
const bragaChain = {
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
} as const;

// ─────────────────────────────────────────────────────────────
// Public client — read-only queries (buildQuery, getEntity, etc.)
// Safe for server and client use.
// ─────────────────────────────────────────────────────────────
export const publicClient = createPublicClient({
  chain: bragaChain,
  transport: http(),
});

// ─────────────────────────────────────────────────────────────
// Wallet client — server-side only (write ops: createEntity, etc.)
// ⚠️  AGENT_PRIVATE_KEY must NEVER be exported to client code.
// ─────────────────────────────────────────────────────────────
function getWalletClient() {
  const rawKey = process.env.AGENT_PRIVATE_KEY;
  if (!rawKey) {
    throw new Error(
      "AGENT_PRIVATE_KEY is not set. Add it to .env.local for server-side write operations.",
    );
  }

  // Ensure 0x prefix (viem requires it)
  const privateKey = rawKey.startsWith("0x")
    ? (rawKey as `0x${string}`)
    : (`0x${rawKey}` as `0x${string}`);

  const account = privateKeyToAccount(privateKey);

  return createWalletClient({
    account,
    chain: bragaChain,
    transport: http(),
  });
}

// Lazy-initialized singleton — only constructed on first server-side access.
let _walletClient: ReturnType<typeof getWalletClient> | null = null;

export function walletClient() {
  if (!_walletClient) {
    _walletClient = getWalletClient();
  }
  return _walletClient;
}
