/**
 * scripts/check-connection.ts
 *
 * Step M.0.4 — Verify Arkiv Braga testnet connection.
 *
 * Runs a lightweight query against the publicClient to confirm:
 *   1. The RPC endpoint is reachable.
 *   2. The SDK can build and execute a query.
 *
 * Usage:  npx tsx scripts/check-connection.ts
 */

import { publicClient, PROJECT_ATTRIBUTE } from "../src/lib/arkiv";
import { eq } from "@arkiv-network/sdk/query";

async function main() {
  console.log("─── MeshOwn: Arkiv Connection Check ───");
  console.log(`RPC URL : https://braga.hoodi.arkiv.network/rpc`);
  console.log(`Chain ID: 60138453102`);
  console.log(`Filter  : eq("${PROJECT_ATTRIBUTE.key}", "${PROJECT_ATTRIBUTE.value}")`);
  console.log();

  try {
    const result = await publicClient
      .buildQuery()
      .where(eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value))
      .limit(1)
      .fetch();

    console.log("✅ Connection successful!");
    console.log(`   Entities returned: ${result.entities.length}`);
    console.log(`   Cursor: ${result.cursor ?? "none"}`);

    if (result.entities.length > 0) {
      console.log("   First entity preview:");
      console.log(`     Key  : ${result.entities[0].key}`);
      console.log(`     Owner: ${result.entities[0].owner ?? "n/a"}`);
    }
  } catch (error) {
    console.error("❌ Connection failed!");
    console.error(error);
    process.exit(1);
  }
}

main();
