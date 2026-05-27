# MeshOwn — Demo Script

**Duration:** 2–3 minutes  
**Audience:** Hackathon judges / Arkiv team  
**Goal:** Demonstrate that MeshOwn is a working DePIN sensor data platform where device owners own their telemetry on Arkiv's tamper-proof Layer 3, with multi-owner mesh queries, calibration lineage, and AI anomaly detection.

---

## Pre-Demo Checklist

- [ ] Agent wallet funded with GLM from [Braga Faucet](https://braga.hoodi.arkiv.network/faucet)
- [ ] Dev server running (`pnpm dev`)
- [ ] MetaMask connected to **Arkiv Braga Testnet** (Chain ID `60138453102`)
- [ ] Seed data loaded (`npx tsx scripts/integration-test.ts`) — at least 3 devices with readings on the map
- [ ] Browser at `http://localhost:3000` with the map visible

---

## Scene 1: Map View & Live Events (30s)

**[Show the map page — `/`]**

> "This is MeshOwn — a DePIN sensor data platform built on Arkiv. Every sensor device, every reading, every calibration record, and every anomaly alert lives on-chain as Arkiv entities."

**Action:** Point to device markers on the map.

> "Each marker is a registered sensor device — air quality, temperature, energy, soil, or weather. Click any marker to see its details."

**Action:** Click a marker → popup shows name, sensor type, status, coordinates, entity key.

> "Notice the pulsing red markers — those are AI-detected anomalies. The map polls Arkiv every 5 seconds for new entities. Alerts appear in real time without any WebSocket — just HTTP polling via `subscribeEntityEvents()`."

**Action:** Point to the alert count badge (top-right corner) and the green "Live" indicator.

---

## Scene 2: Draw Bounding Box → Mesh Query (40s)

**[Still on `/`]**

> "The killer feature of Arkiv is geographic mesh queries across multiple independent owners. Let me show you."

**Action:**
1. Toggle sidebar to **Query** mode
2. Set filters: sensor_type = `air_quality`, min quality = `70`, time range = `24h`
3. Click **Draw Bounding Box** → draw a rectangle on the map covering several sensors
4. Click **Run Mesh Query**

**[Navigation to `/query`]**

> "One on-chain query, one bounding box, multiple independent sensor owners. This is architecturally impossible with any centralised API."

**Action:** Point to the results table — show columns: timestamp, device, owner, lat/lng, value, quality score, sensor type.

> "Every row is a tamper-proof reading on Arkiv. Notice the `unique_owners` count — these readings come from different wallets. The quality score is computed server-side using a 3σ algorithm against neighboring sensors."

**Action:** Click a column header to sort. Click **Export CSV** to demonstrate data portability.

---

## Scene 3: Sensor Detail → Calibration Lineage (40s)

**[Navigate to `/sensor/[entityKey]`]**

**Action:** Click a device name in the query results table (or from the map popup).

> "This is the sensor detail page. On the left — device info, calibration status, and owner controls. On the right — time-series charts and the full readings table."

**Action:** Point to the charts:
- Value line chart (indigo) — sensor readings over time
- Quality score chart (emerald) — quality score trend

> "The quality score chart shows how each reading is validated against neighboring sensors. Scores above 80 are green, below 50 are red."

**Action:** Scroll to the sidebar → calibration section.

> "Every sensor has calibration lineage stored on-chain as `CalibrationRecord` entities. The status shows whether calibration is valid, expiring soon, or expired. This is transparent provenance — anyone can audit it."

**Action:** Point to calibration status badge (green = valid, amber = expiring, red = expired, zinc = uncalibrated).

---

## Scene 4: AI Anomaly Alert → Owner/Creator Split (30s)

**[Navigate to `/alerts`]**

**Action:** Click "Alert Feed" link from the sidebar or sensor detail page.

> "The AI anomaly agent runs every 2 hours via Vercel Cron. It scans recent readings, computes a rolling baseline, and flags values that deviate more than 3 standard deviations."

**Action:** Point to an alert card:
- Severity badge (high/medium/low)
- Description: "Value 340% above baseline (4.2σ)"
- Baseline → Observed visualization
- Confidence score bar

> "Here's the key insight — look at the attribution on each alert. The `$creator` is the AI agent's wallet — immutable, permanent. The `$owner` is the sensor owner's wallet — transferable. This is the Arkiv owner/creator split. The agent gets permanent credit for detecting the anomaly; the sensor owner retains ownership of their device."

**Action:** Point to the two wallet addresses on the alert card — "AI Agent" (indigo) and "Owner" (emerald).

---

## Scene 5: Owner Dashboard (20s)

**[Navigate to `/dashboard`]**

**Action:** Click "Owner Dashboard" from the sidebar (wallet must be connected).

> "Device owners manage their fleet from the dashboard. They can register new devices, submit readings, and add calibration records — all through MetaMask signature verification. No passwords, no JWT — just `personal_sign`."

**Action:** Point to the three action buttons: Register Device, Submit Reading, Add Calibration.

> "Every write operation goes through the G4 auth flow: fetch a UUID nonce, sign it with your wallet, server verifies the signature. The agent wallet pays gas; the owner retains control."

---

## Closing (10s)

> "MeshOwn proves that Arkiv is production-ready for DePIN. Four entity types, 17 API routes, 5 screens, real-time anomaly detection — all on a tamper-proof, queryable Layer 3. No database. No cloud silo. Just on-chain sensor data owned by the people who deployed the sensors."

**Action:** Return to the map page to end on the visual high note.

---

## Key Talking Points (if time allows)

- **No traditional database** — all persistent state lives on Arkiv. Zustand is the only client-side state for UI ephemera.
- **COORD_SCALE = 1,000,000** — coordinates stored as micro-degree integers for efficient on-chain numeric queries.
- **VALUE_SCALE = 100** — sensor values stored as centi-units (integers) to avoid floating-point issues.
- **Entity TTL strategy** — SensorDevice/Calibration: 10 years; Reading: 30 days; AnomalyAlert: 90 days. GLM gas scales with TTL.
- **Sequential SDK queries** — Arkiv SDK warns against parallel queries; all routes process entities sequentially.
- **`.createdBy(CREATOR_WALLET_ADDRESS)`** — every server-side query scopes to the agent wallet per H1 constraint.
