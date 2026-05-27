import { publicClient } from "@/lib/arkiv";

// ─────────────────────────────────────────────────────────────
// GET /api/health
// Blueprint §6 (Utility Endpoints)
//
// Health check endpoint for deployment verification.
// Returns static status info plus live block timing from Arkiv RPC.
//
// Response: { status, network, blockTime, blockNumber, timestamp }
// ─────────────────────────────────────────────────────────────

export async function GET() {
  try {
    // Fetch live block timing from Arkiv RPC
    const blockTiming = await publicClient.getBlockTiming();

    return Response.json({
      status: "ok",
      network: "braga",
      blockTime: `${blockTiming.blockDuration}s`,
      blockNumber: blockTiming.currentBlock.toString(),
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Even if RPC is unreachable, report degraded status
    // (still 200 for basic health check — the status field indicates health)
    return Response.json({
      status: "degraded",
      network: "braga",
      blockTime: "unknown",
      timestamp: new Date().toISOString(),
    });
  }
}
