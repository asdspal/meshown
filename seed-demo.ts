/**
 * MeshOwn — Demo Seed Script  v2
 * ─────────────────────────────────────────────────────────────────────────────
 * USAGE:
 *   npx tsx --env-file=.env.local seed-demo.ts
 *
 * No extra dependencies needed beyond what your app already has.
 * If tsx --env-file is not supported on your tsx version, use:
 *   export $(cat .env.local | xargs) && npx tsx seed-demo.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── SDK imports — using the same paths your app uses ────────────────────────
import { createWalletClient, createPublicClient, http } from "@arkiv-network/sdk"
import { privateKeyToAccount } from "@arkiv-network/sdk/accounts"
import { braga } from "@arkiv-network/sdk/chains"
import { jsonToPayload, ExpirationTime } from "@arkiv-network/sdk/utils"
import * as fs from "fs"

// ─── Config ───────────────────────────────────────────────────────────────────

const READING_INTERVAL_MS = 15_000
const DEVICES_FILE        = "./demo-devices.json"
const PROJECT_ATTRIBUTE   = { key: "project", value: "meshown-v1" } as const

// Arkiv number attributes are encoded as BigInt internally — floats crash.
// Scale lat/lng by 1e6 (microdegrees) so they become safe integers.
// e.g. 25.4244 → 25424400. Your app's query layer must scale the bbox the same way.
const GEO_SCALE = 1_000_000
const scaleLat  = (lat: number) => Math.round(lat * GEO_SCALE)
const scaleLng  = (lng: number) => Math.round(lng * GEO_SCALE)
// Sensor float values: multiply by 10 so 28.4 → 284 (integer). Divide by 10 on read.
const scaleVal  = (v: number)   => Math.round(v * 100) // matches app VALUE_SCALE = 100

// ─── Wallet ───────────────────────────────────────────────────────────────────

const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}`
if (!privateKey) {
  console.error("\n❌ AGENT_PRIVATE_KEY not found.")
  console.error("   Run with: npx tsx --env-file=.env.local seed-demo.ts\n")
  process.exit(1)
}

const account      = privateKeyToAccount(privateKey)
const walletClient = createWalletClient({ chain: braga, transport: http(), account })
const publicClient = createPublicClient({ chain: braga, transport: http() })

console.log(`\n🔑 Agent wallet: ${account.address}`)

// ─── Device Definitions (Prayagraj) ──────────────────────────────────────────

const DEVICES = [
  {
    name: "Sangam Ghat Air Monitor",
    description: "Air quality sensor near Triveni Sangam",
    sensor_type: "air_quality", lat: 25.4244, lng: 81.8842,
    unit: "μg/m³", baseline: 28, variance: 12, spike_value: 145,
  },
  {
    name: "Civil Lines Weather Station",
    description: "Temperature sensor, rooftop Civil Lines",
    sensor_type: "temperature", lat: 25.4587, lng: 81.8407,
    unit: "°C", baseline: 36, variance: 3, spike_value: 42,
  },
  {
    name: "Naini Bridge Air Monitor",
    description: "Air quality, high-traffic bridge approach",
    sensor_type: "air_quality", lat: 25.4017, lng: 81.8792,
    unit: "μg/m³", baseline: 55, variance: 20, spike_value: 190,
  },
  {
    name: "Allahabad University Soil Sensor",
    description: "Soil moisture, campus botanical garden",
    sensor_type: "soil", lat: 25.4561, lng: 81.8430,
    unit: "%RH", baseline: 42, variance: 8, spike_value: 78,
  },
  {
    name: "George Town Energy Meter",
    description: "Power consumption, commercial district",
    sensor_type: "energy", lat: 25.4482, lng: 81.8503,
    unit: "kWh", baseline: 14.2, variance: 4, spike_value: 38,
  },
  {
    name: "Phaphamau Air Monitor",
    description: "Industrial zone air quality, north bank",
    sensor_type: "air_quality", lat: 25.4928, lng: 81.8573,
    unit: "μg/m³", baseline: 72, variance: 25, spike_value: 220,
  },
  {
    name: "Rajapur Weather Node",
    description: "Micro weather station, residential colony",
    sensor_type: "weather", lat: 25.4350, lng: 81.8233,
    unit: "°C", baseline: 34, variance: 2, spike_value: 41,
  },
  {
    name: "Katra Soil Monitor",
    description: "Agricultural soil sensor, peri-urban area",
    sensor_type: "soil", lat: 25.4680, lng: 81.9123,
    unit: "%RH", baseline: 38, variance: 10, spike_value: 85,
  },
]

type DeviceDef = typeof DEVICES[0]
interface RegisteredDevice extends DeviceDef {
  entityKey:       string
  calibration_key: string
  reading_count:   number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function generateReading(d: RegisteredDevice): number {
  if (Math.random() < 0.08) return d.spike_value + (Math.random() - 0.5) * 10
  const noise = (Math.random() + Math.random() + Math.random() - 1.5) * d.variance
  return Math.max(0, d.baseline + noise)
}

function qualityScore(value: number, d: RegisteredDevice): number {
  const dev = Math.abs(value - d.baseline) / (d.baseline || 1)
  return Math.max(0, Math.round(100 - dev * 150))
}

// ─── Phase 1: Register Devices ────────────────────────────────────────────────

async function registerDevices(): Promise<RegisteredDevice[]> {
  if (fs.existsSync(DEVICES_FILE)) {
    console.log(`\n📂 Loading existing devices from ${DEVICES_FILE}`)
    return JSON.parse(fs.readFileSync(DEVICES_FILE, "utf-8"))
  }

  console.log("\n📡 Phase 1: Registering 8 devices on Arkiv Braga…")
  const registered: RegisteredDevice[] = []

  for (let i = 0; i < DEVICES.length; i++) {
    const d = DEVICES[i]
    process.stdout.write(`   [${i + 1}/${DEVICES.length}] ${d.name}… `)
    try {
      const { entityKey } = await walletClient.createEntity({
        payload: jsonToPayload({
          name: d.name, description: d.description,
          manufacturer: "MeshOwn Demo", firmwareVersion: "1.0.0",
        }),
        contentType: "application/json",
        attributes: [
          PROJECT_ATTRIBUTE,
          { key: "entityType",    value: "sensor_device" },
          { key: "sensor_type",   value: d.sensor_type },
          { key: "lat",           value: scaleLat(d.lat) },
          { key: "lng",           value: scaleLng(d.lng) },
          { key: "status",        value: "active" },
          { key: "registered_at", value: Date.now() },
        ],
        expiresIn: ExpirationTime.fromDays(3650),
      })
      console.log(`✅  ${entityKey}`)
      registered.push({ ...d, entityKey, calibration_key: "", reading_count: 0 })
      await sleep(1200)
    } catch (err: any) {
      console.log(`❌  ${err.message}`)
    }
  }

  fs.writeFileSync(DEVICES_FILE, JSON.stringify(registered, null, 2))
  console.log(`\n   Saved to ${DEVICES_FILE}`)
  return registered
}

// ─── Phase 2: Calibration Records ────────────────────────────────────────────

async function addCalibrations(devices: RegisteredDevice[]): Promise<RegisteredDevice[]> {
  const todo = devices.filter(d => !d.calibration_key)
  if (!todo.length) { console.log("\n🔬 Phase 2: All calibrated — skipping"); return devices }

  console.log(`\n🔬 Phase 2: Calibrating ${todo.length} devices…`)
  for (const d of todo) {
    process.stdout.write(`   ${d.name.slice(0, 35)}… `)
    try {
      const now = Date.now()
      const { entityKey: calibKey } = await walletClient.createEntity({
        payload: jsonToPayload({
          offset_value: 0.0, offset_unit: d.unit,
          calibration_method: "factory_default",
          notes: "Demo calibration — MeshOwn seed script",
        }),
        contentType: "application/json",
        attributes: [
          PROJECT_ATTRIBUTE,
          { key: "entityType",    value: "calibration_record" },
          { key: "device_key",    value: d.entityKey },
          { key: "calibrated_by", value: account.address },
          { key: "valid_from",    value: now },
          { key: "valid_until",   value: now + 365 * 24 * 3600 * 1000 },
        ],
        expiresIn: ExpirationTime.fromDays(3650),
      })
      d.calibration_key = calibKey
      console.log("✅")
      await sleep(1200)
    } catch (err: any) {
      console.log(`❌  ${err.message}`)
    }
  }

  fs.writeFileSync(DEVICES_FILE, JSON.stringify(devices, null, 2))
  return devices
}

// ─── Phase 3: Pump Readings ───────────────────────────────────────────────────

async function pumpReadings(devices: RegisteredDevice[]) {
  const active = devices.filter(d => d.calibration_key)
  console.log(`\n🚀 Phase 3: Pumping readings every ${READING_INTERVAL_MS / 1000}s (${active.length} devices)`)
  console.log("   Ctrl+C to stop.\n")

  let cycle = 0

  while (true) {
    cycle++
    const ts = Date.now()
    console.log(`\n── Cycle ${cycle}  ${new Date().toLocaleTimeString()} ──────────────`)

    const creates = active.map(d => {
      const value = generateReading(d)
      const qs    = qualityScore(value, d)
      const spike = value >= d.spike_value * 0.85

      const label = spike
        ? `   🚨 SPIKE  ${d.name.slice(0, 28).padEnd(28)} ${value.toFixed(1).padStart(7)} ${d.unit}`
        : `   📊 ${d.sensor_type.padEnd(11)} ${d.name.slice(0, 25).padEnd(25)} ${value.toFixed(1).padStart(7)} ${d.unit.padEnd(5)} Q:${qs}`
      console.log(label)

      return {
        payload: jsonToPayload({
          value:           Math.round(value * 10) / 10,
          unit:            d.unit,
          quality_score:   qs,
          calibration_key: d.calibration_key,
        }),
        contentType: "application/json" as const,
        attributes: [
          PROJECT_ATTRIBUTE,
          { key: "entityType",    value: "reading" },
          { key: "sensor_type",   value: d.sensor_type },
          { key: "device_key",    value: d.entityKey },
          { key: "lat",           value: scaleLat(d.lat) },
          { key: "lng",           value: scaleLng(d.lng) },
          { key: "value",         value: scaleVal(value) },
          { key: "quality_score", value: qs },
          { key: "timestamp",     value: ts },
        ],
        expiresIn: ExpirationTime.fromDays(30),
      }
    })

    try {
      const result = await walletClient.mutateEntities({ creates })
      console.log(`\n   ✅ ${result.createdEntities.length} readings written`)
    } catch (err: any) {
      console.log(`\n   ❌ Batch failed: ${err.message}`)
      // On batch failure, fall back to individual creates so we still get data
      console.log("   ↩️  Retrying individually…")
      for (const create of creates) {
        try {
          await walletClient.createEntity(create)
          process.stdout.write(".")
        } catch { process.stdout.write("x") }
        await sleep(500)
      }
      console.log()
    }

    await sleep(READING_INTERVAL_MS)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("══════════════════════════════════════════")
  console.log("  MeshOwn Demo Seed — Arkiv Braga Testnet")
  console.log("══════════════════════════════════════════")

  const devices    = await registerDevices()
  const calibrated = await addCalibrations(devices)

  console.log("\n⏳ 3s before readings start…")
  await sleep(3000)

  await pumpReadings(calibrated)
}

main().catch(err => {
  console.error("\n💥", err.message)
  process.exit(1)
})
