#!/usr/bin/env tsx
// ═══════════════════════════════════════════════════════════════════
// MeshOwn — Integration Test Script (Step M1.8)
// ═══════════════════════════════════════════════════════════════════
//
// Registers 3 simulated devices, submits 10 readings each,
// adds 1 calibration, then verifies via GET endpoints.
//
// Usage: npx tsx scripts/integration-test.ts
// Requires: Next.js dev server running on localhost:3000
// ═══════════════════════════════════════════════════════════════════

import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";

// ── Configuration ────────────────────────────────────────────────
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// Deterministic test wallet (NOT the agent wallet — this is the "user" wallet)
// This key is for testing only and has no real funds.
const TEST_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as `0x${string}`;

const testAccount = privateKeyToAccount(TEST_PRIVATE_KEY);

// ── Device configurations ────────────────────────────────────────
const DEVICE_CONFIGS = [
  {
    name: "TempSensor-Alpha",
    description: "Temperature sensor in downtown area",
    manufacturer: "SensorCorp",
    firmwareVersion: "2.1.0",
    sensor_type: "temperature",
    lat: 12.9716,
    lng: 77.5946,
  },
  {
    name: "HumiditySensor-Beta",
    description: "Humidity sensor in park district",
    manufacturer: "EnviroTech",
    firmwareVersion: "1.5.2",
    sensor_type: "humidity",
    lat: 12.9756,
    lng: 77.6012,
  },
  {
    name: "AirQualitySensor-Gamma",
    description: "Air quality monitoring station near highway",
    manufacturer: "AirWatch",
    firmwareVersion: "3.0.1",
    sensor_type: "air_quality",
    lat: 12.9680,
    lng: 77.5880,
  },
];

// ── Helpers ──────────────────────────────────────────────────────

interface TestResult {
  step: string;
  status: "PASS" | "FAIL";
  detail: string;
}

const results: TestResult[] = [];
let passedCount = 0;
let failedCount = 0;

function log(msg: string) {
  console.log(`  ${msg}`);
}

function record(step: string, status: "PASS" | "FAIL", detail: string) {
  results.push({ step, status, detail });
  if (status === "PASS") {
    passedCount++;
    console.log(`  ✅ ${step}: ${detail}`);
  } else {
    failedCount++;
    console.error(`  ❌ ${step}: ${detail}`);
  }
}

/**
 * Get an auth nonce + sign it for the test wallet.
 * Returns { ownerAddress, nonce, signature } for authenticated requests.
 */
async function getAuth(): Promise<{
  ownerAddress: string;
  nonce: string;
  signature: `0x${string}`;
}> {
  const address = testAccount.address;

  // 1. Request nonce from the API
  const nonceRes = await fetch(
    `${BASE_URL}/api/auth/nonce?address=${address}`,
  );
  if (!nonceRes.ok) {
    throw new Error(
      `Nonce request failed: ${nonceRes.status} ${await nonceRes.text()}`,
    );
  }
  const { nonce } = (await nonceRes.json()) as { nonce: string };

  // 2. Sign the nonce with the test wallet (personal_sign pattern)
  const signature = await testAccount.signMessage({ message: nonce });

  return { ownerAddress: address, nonce, signature };
}

/**
 * Register a device via POST /api/device/register
 */
async function registerDevice(config: (typeof DEVICE_CONFIGS)[number]) {
  const auth = await getAuth();

  const res = await fetch(`${BASE_URL}/api/device/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...auth,
      name: config.name,
      description: config.description,
      manufacturer: config.manufacturer,
      firmwareVersion: config.firmwareVersion,
      sensor_type: config.sensor_type,
      lat: config.lat,
      lng: config.lng,
    }),
  });

  const body = await res.json();

  if (!res.ok) {
    throw new Error(
      `Device register failed (${res.status}): ${JSON.stringify(body)}`,
    );
  }

  return body as { entityKey: string; txHash: string };
}

/**
 * Submit a reading via POST /api/reading/submit
 */
async function submitReading(
  deviceKey: string,
  value: number,
  unit: string,
  sensor_type: string,
) {
  const auth = await getAuth();

  const res = await fetch(`${BASE_URL}/api/reading/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...auth,
      deviceKey,
      value,
      unit,
      calibration_key: "none",
      raw: { adc: value * 100 + Math.floor(Math.random() * 10) },
    }),
  });

  const body = await res.json();

  if (!res.ok) {
    throw new Error(
      `Reading submit failed (${res.status}): ${JSON.stringify(body)}`,
    );
  }

  return body as { entityKey: string; txHash: string; quality_score: number };
}

/**
 * Add a calibration via POST /api/calibration/add
 */
async function addCalibration(deviceKey: string) {
  const auth = await getAuth();

  // valid_until = 1 year from now
  const validUntilMs = Date.now() + 365 * 24 * 60 * 60 * 1000;

  const res = await fetch(`${BASE_URL}/api/calibration/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...auth,
      deviceKey,
      offset_value: 0.05,
      offset_unit: "celsius",
      calibration_method: "ice_bath",
      notes: "Integration test calibration — ice bath reference at 0°C",
      valid_until_ms: validUntilMs,
    }),
  });

  const body = await res.json();

  if (!res.ok) {
    throw new Error(
      `Calibration add failed (${res.status}): ${JSON.stringify(body)}`,
    );
  }

  return body as { entityKey: string; txHash: string };
}

// ── Main test sequence ───────────────────────────────────────────

async function main() {
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  MeshOwn — Integration Test (Step M1.8)");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  Test wallet: ${testAccount.address}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  // ── Phase 0: Health check ─────────────────────────────────────
  console.log("▸ Phase 0: Health check");
  try {
    const healthRes = await fetch(`${BASE_URL}/api/auth/nonce?address=${testAccount.address}`);
    if (healthRes.ok) {
      record("Health check", "PASS", "API server is reachable");
    } else {
      record("Health check", "FAIL", `Server returned ${healthRes.status}`);
      printSummary();
      process.exit(1);
    }
  } catch (err) {
    record(
      "Health check",
      "FAIL",
      `Cannot reach ${BASE_URL}. Is the dev server running?\n    ${err}`,
    );
    printSummary();
    process.exit(1);
  }

  // ── Phase 1: Register 3 devices ───────────────────────────────
  console.log("\n▸ Phase 1: Register 3 devices");
  const deviceKeys: string[] = [];

  for (let i = 0; i < DEVICE_CONFIGS.length; i++) {
    const config = DEVICE_CONFIGS[i];
    try {
      const result = await registerDevice(config);
      deviceKeys.push(result.entityKey);
      record(
        `Device ${i + 1} (${config.name})`,
        "PASS",
        `entityKey=${result.entityKey.slice(0, 18)}… txHash=${result.txHash.slice(0, 18)}…`,
      );
    } catch (err) {
      record(
        `Device ${i + 1} (${config.name})`,
        "FAIL",
        String(err),
      );
    }
  }

  // Wait for testnet to index newly created device entities
  if (deviceKeys.length > 0) {
    console.log("\n  ⏳ Waiting 8s for device entity propagation on testnet…");
    await new Promise((resolve) => setTimeout(resolve, 8000));
  }

  // ── Phase 2: Submit 10 readings per device (30 total) ─────────
  console.log("\n▸ Phase 2: Submit 30 readings (10 per device)");
  const readingCounts: Record<string, number> = {};
  let totalReadingsSubmitted = 0;

  for (let d = 0; d < deviceKeys.length; d++) {
    const deviceKey = deviceKeys[d];
    if (!deviceKey) {
      record(`Readings for device ${d + 1}`, "FAIL", "Device not registered — skipping");
      continue;
    }

    const deviceLabel = DEVICE_CONFIGS[d].name;
    const unit =
      DEVICE_CONFIGS[d].sensor_type === "temperature"
        ? "celsius"
        : DEVICE_CONFIGS[d].sensor_type === "humidity"
          ? "percent"
          : "aqi";
    let successCount = 0;

    for (let r = 0; r < 10; r++) {
      // Generate realistic-ish sensor value
      const baseValue =
        DEVICE_CONFIGS[d].sensor_type === "temperature"
          ? 25 + Math.random() * 5
          : DEVICE_CONFIGS[d].sensor_type === "humidity"
            ? 55 + Math.random() * 20
            : 40 + Math.random() * 30;
      const value = Math.round(baseValue * 100) / 100;

      // Retry logic with delay — blockchain txns can be slow
      let submitted = false;
      for (let attempt = 0; attempt < 3 && !submitted; attempt++) {
        try {
          const result = await submitReading(deviceKey, value, unit, DEVICE_CONFIGS[d].sensor_type);
          successCount++;
          totalReadingsSubmitted++;
          submitted = true;
        } catch (err) {
          if (attempt < 2) {
            log(`  ⚠ Reading ${r + 1} for ${deviceLabel} attempt ${attempt + 1} failed, retrying…`);
            await new Promise((resolve) => setTimeout(resolve, 4000));
          } else {
            log(`  ⚠ Reading ${r + 1} for ${deviceLabel} failed after 3 attempts: ${err}`);
          }
        }
      }
      // Delay between readings to avoid rate limiting and allow testnet propagation
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    readingCounts[deviceLabel] = successCount;
    if (successCount === 10) {
      record(
        `Readings for ${deviceLabel}`,
        "PASS",
        `${successCount}/10 submitted`,
      );
    } else {
      record(
        `Readings for ${deviceLabel}`,
        "FAIL",
        `Only ${successCount}/10 submitted`,
      );
    }
  }

  // ── Phase 3: Add 1 calibration record ─────────────────────────
  console.log("\n▸ Phase 3: Add 1 calibration record");
  let calibrationEntityKey: string | undefined;

  if (deviceKeys[0]) {
    try {
      const result = await addCalibration(deviceKeys[0]);
      calibrationEntityKey = result.entityKey;
      record(
        "Calibration for TempSensor-Alpha",
        "PASS",
        `entityKey=${result.entityKey.slice(0, 18)}… txHash=${result.txHash.slice(0, 18)}…`,
      );
    } catch (err) {
      record("Calibration for TempSensor-Alpha", "FAIL", String(err));
    }
  } else {
    record("Calibration for TempSensor-Alpha", "FAIL", "Device not registered — cannot calibrate");
  }

  // ── Phase 4: Verify via GET endpoints ─────────────────────────
  console.log("\n▸ Phase 4: Verify via GET endpoints");

  // 4a. GET /api/devices — expect 3 devices
  try {
    const res = await fetch(`${BASE_URL}/api/devices`);
    const body = await res.json();
    if (res.ok && body.total >= 3) {
      record(
        "GET /api/devices",
        "PASS",
        `Returned ${body.total} device(s) (expected ≥ 3)`,
      );
    } else {
      record(
        "GET /api/devices",
        "FAIL",
        `Expected ≥ 3 devices, got ${body.total ?? 0}. Status: ${res.status}`,
      );
    }
  } catch (err) {
    record("GET /api/devices", "FAIL", String(err));
  }

  // 4b. GET /api/readings?deviceKey=... — expect 10 readings per device
  for (let d = 0; d < deviceKeys.length; d++) {
    const deviceKey = deviceKeys[d];
    if (!deviceKey) continue;

    const deviceLabel = DEVICE_CONFIGS[d].name;
    try {
      const res = await fetch(
        `${BASE_URL}/api/readings?deviceKey=${deviceKey}&limit=100`,
      );
      const body = await res.json();
      const count = body.readings?.length ?? 0;
      if (res.ok && count >= 10) {
        record(
          `GET /api/readings for ${deviceLabel}`,
          "PASS",
          `Returned ${count} reading(s) (expected ≥ 10)`,
        );
      } else {
        record(
          `GET /api/readings for ${deviceLabel}`,
          "FAIL",
          `Expected ≥ 10 readings, got ${count}. Status: ${res.status}`,
        );
      }
    } catch (err) {
      record(`GET /api/readings for ${deviceLabel}`, "FAIL", String(err));
    }
  }

  // 4c. GET /api/calibrations?deviceKey=... — expect 1 calibration
  if (deviceKeys[0]) {
    try {
      const res = await fetch(
        `${BASE_URL}/api/calibrations?deviceKey=${deviceKeys[0]}`,
      );
      const body = await res.json();
      const count = body.calibrations?.length ?? 0;
      if (res.ok && count >= 1) {
        record(
          "GET /api/calibrations for TempSensor-Alpha",
          "PASS",
          `Returned ${count} calibration(s) (expected ≥ 1)`,
        );
      } else {
        record(
          "GET /api/calibrations for TempSensor-Alpha",
          "FAIL",
          `Expected ≥ 1 calibration, got ${count}. Status: ${res.status}`,
        );
      }
    } catch (err) {
      record("GET /api/calibrations for TempSensor-Alpha", "FAIL", String(err));
    }
  }

  // 4d. GET single device by entityKey
  if (deviceKeys[0]) {
    try {
      const res = await fetch(
        `${BASE_URL}/api/device/${deviceKeys[0]}`,
      );
      const body = await res.json();
      if (res.ok && body.entityKey) {
        const owner = body.owner ?? "unknown";
        record(
          "GET /api/device/[entityKey]",
          "PASS",
          `entityKey=${body.entityKey.slice(0, 18)}… owner=${owner.slice(0, 18)}…`,
        );
      } else {
        record(
          "GET /api/device/[entityKey]",
          "FAIL",
          `Status: ${res.status}, body: ${JSON.stringify(body).slice(0, 200)}`,
        );
      }
    } catch (err) {
      record("GET /api/device/[entityKey]", "FAIL", String(err));
    }
  }

  // ── Summary ───────────────────────────────────────────────────
  printSummary();

  // ── Print entity keys for Arkiv Explorer verification ─────────
  console.log("\n── Entity Keys (for Arkiv Explorer) ─────────────────────");
  for (let i = 0; i < deviceKeys.length; i++) {
    console.log(`  Device ${i + 1}: ${deviceKeys[i] ?? "N/A"}`);
  }
  if (calibrationEntityKey) {
    console.log(`  Calibration: ${calibrationEntityKey}`);
  }
  console.log("───────────────────────────────────────────────────────────");
  console.log(
    `\n  Arkiv Explorer: https://explorer.braga.hoodi.arkiv.network`,
  );
  console.log(
    `  Search for the entity keys above to verify on-chain state.\n`,
  );
}

function printSummary() {
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  TEST SUMMARY");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Total: ${results.length} | Passed: ${passedCount} | Failed: ${failedCount}`);
  if (failedCount === 0) {
    console.log("  🎉 All tests passed!");
  } else {
    console.log("  ⚠️  Some tests failed. See details above.");
  }
  console.log("═══════════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("\n💥 Unhandled error in test script:", err);
  process.exit(1);
});
