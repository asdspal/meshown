# MeshOwn — Production Blueprint
**Theme:** DePIN × AI Hybrid | **Network:** Arkiv Braga Testnet | **Version:** 1.2.0
*(v1.0 → v1.1: 11 gaps from Phase 2 extraction resolved. v1.1 → v1.2: 13 issues from full Arkiv doc audit resolved — see §11)*

---

## Validation Checkpoint

✅ Tech Stack — exact versions resolved via npm registry; `@tanstack/react-query` added (C5)
✅ Database Schema — 4 Arkiv entity types; `expiresIn: null` replaced with `fromDays(3650)` everywhere (C1)
✅ Agent/Service — AI anomaly detection service; `mutateEntities()` return shape corrected (C3)
✅ API Endpoints — all 16 endpoints; `.createdBy(CREATOR_WALLET_ADDRESS)` on all server-written entity queries (H1)
✅ External Dependencies — Arkiv SDK, Braga faucet, optional LLM; free-tier limits noted
✅ UI Screens — 5 screens; WebSocket replaced with `subscribeEntityEvents()` polling (C2)
✅ Implicit Constraints — numeric attrs, PROJECT_ATTRIBUTE, private key server-side, expiresIn in seconds, GLM scales with TTL (H5), glob `~` not in TS SDK (H4)
✅ Coverage Map — all elements assigned; `desc` import (H3), `CREATOR_WALLET_ADDRESS` (H1), TanStack Query (C5) included  

---

# Final Blueprint

---

## 1. Project Vision

### Core Value Proposition
MeshOwn is a DePIN sensor data platform where device owners — not platforms — own their telemetry. Sensor readings are stored on Arkiv's tamper-proof, queryable Layer 3 DB-Chain. Researchers and applications query a geographic mesh of sensor data across multiple independent owners in a single on-chain query — something architecturally impossible with any centralised API. Data has transparent provenance, calibration lineage, and quality scores, all on-chain and auditable by anyone.

### User Personas

**Device Owner (Alice)** — Deploys an air quality or weather sensor. Registers it on MeshOwn, watches readings flow onto Arkiv, sees a quality score for each reading, and controls who can query her data. Earns recognition and on-chain attribution for contributing to the public mesh.

**Researcher / Data Consumer (Bob)** — Needs multi-owner, geographically bounded sensor data. Draws a bounding box on the map, sets a quality threshold, issues one query, and gets tamper-proof readings from dozens of independent owners. Knows exactly which sensor produced each reading and whether its calibration was valid at that moment.

**AI Anomaly Agent (automated)** — A backend service that watches incoming readings, detects statistical anomalies, and writes `AnomalyAlert` entities to Arkiv. The `$creator` is the agent's wallet; the `$owner` is the sensor owner. Attribution is permanent and immutable.

### Primary Problem Solved
DePIN sensor data today flows into centralised cloud silos (AWS IoT, Azure IoT Hub). Data quality verification is a black-box algorithm run on someone else's server. Researchers must call N different vendor APIs and merge results themselves. MeshOwn puts every reading, its quality attestation, and its calibration lineage on a public, queryable, tamper-proof ledger — owned by the humans who deployed the sensors.

---

## 2. Validated Tech Stack

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| Blockchain data layer | `@arkiv-network/sdk` | 0.6.8 | Only SDK for Arkiv Braga; typed `createWalletClient`, `createPublicClient`, `buildQuery()`, `createEntity()`, `updateEntity()` |
| Chain | Arkiv Braga testnet | Chain ID `60138453102` | Current testnet; GLM gas; 2 s block time; faucet at `braga.hoodi.arkiv.network/faucet` |
| Frontend framework | Next.js (App Router) | 16.2.6 | Server components for read queries (no private key exposure); client components for wallet interaction |
| Wallet connection | wagmi | 3.6.15 | MetaMask/injected wallet support; pairs with viem which underlies Arkiv SDK |
| Ethereum primitives | viem | 2.50.4 | Used internally by Arkiv SDK; `privateKeyToAccount` for server-side agent wallet |
| Map rendering | Leaflet + react-leaflet | 1.9.4 / 5.0.0 | Free, no API key; OpenStreetMap tiles |
| Map drawing | leaflet-draw + @types/leaflet-draw | 1.0.4 / 1.0.13 | Bounding-box rectangle draw on Leaflet map |
| Wallet UI | @rainbow-me/rainbowkit | 2.2.11 | Pre-built `ConnectButton` with MetaMask + injected wallet support; pairs with wagmi v3 |
| Charts | Recharts | 3.8.1 | Time-series line charts for reading history; free |
| Styling | Tailwind CSS | 4.3.0 | Utility-first; no component library dependency |
| State management | Zustand | 5.0.13 | Lightweight client store for wallet address, selected sensor, bounding box |
| Schema validation | Zod | 3.x | Validate reading payloads before writing to Arkiv |
| Backend runtime | Next.js API Routes | — | Server-side wallet client; anomaly agent endpoint; no separate server needed |
| Hosting | Vercel (free tier) | — | Zero-config Next.js deployment; 100 GB bandwidth free |
| Package manager | pnpm | — | Faster installs; monorepo-friendly |

**Why no traditional database:** All persistent state lives on Arkiv. The only client-side state is UI ephemera (selected sensor, map viewport, wallet address) managed in Zustand. This is architecturally pure for the hackathon and demonstrates the platform's value proposition directly.

---

## 3. Detailed System Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  BROWSER (Next.js Client Components)                           │
│  Zustand store: walletAddress, selectedSensor, boundingBox     │
│  wagmi: MetaMask connection → signs transactions               │
└──────────────┬──────────────────────────────┬──────────────────┘
               │ write (via API route)         │ read (direct)
               ▼                              ▼
┌─────────────────────────┐    ┌──────────────────────────────────┐
│  NEXT.JS API ROUTES     │    │  ARKIV PUBLIC CLIENT             │
│  /api/device/register   │    │  createPublicClient({            │
│  /api/reading/submit    │    │    chain: braga,                 │
│  /api/alert/detect      │    │    transport: http()             │
│  (hold server wallet)   │    │  })                              │
└──────────┬──────────────┘    └──────────────────────────────────┘
           │ walletClient.createEntity()              │
           ▼                                          │
┌─────────────────────────────────────────────────────────────────┐
│  ARKIV BRAGA TESTNET  (Chain ID: 60138453102)                  │
│  RPC: https://braga.hoodi.arkiv.network/rpc                    │
│                                                                 │
│  Entity: SensorDevice   Entity: Reading                        │
│  Entity: CalibrationRecord   Entity: AnomalyAlert              │
│                                                                 │
│  PROJECT_ATTRIBUTE: { key: "project", value: "meshown-v1" }   │
└─────────────────────────────────────────────────────────────────┘
```

### Authentication Flow

MeshOwn uses **wallet-based authentication** — no JWT, no sessions. The pattern:

1. User connects MetaMask via wagmi's `useConnect()` hook.
2. The connected wallet address is the user's identity — stored in Zustand.
3. **Write operations** (register device, submit reading): the browser sends the payload to a Next.js API route. The API route holds a **server-side `WalletClient`** instantiated from `process.env.AGENT_PRIVATE_KEY`. The entity is created with `$owner` set to the user's MetaMask address via `changeOwnership()` immediately after creation, so the user owns their data.
4. **Wallet signature verification (G4):** All write API routes verify the caller owns the wallet address they claim. Pattern:
   - Client calls `GET /api/auth/nonce?address=0x...` → server returns a time-limited nonce (UUID, stored in memory Map with 5-minute TTL)
   - Client signs the nonce: `const sig = await walletClient.signMessage({ message: nonce })`
   - Client sends `{ address, nonce, signature }` with the write request
   - Server verifies: `viem.verifyMessage({ address, message: nonce, signature })` → must return `true`
   - Nonce is consumed after one use (delete from Map)
   - Required env var: none (stateless nonce via in-memory Map, sufficient for hackathon demo)
4. **Alternative write path** (advanced): for MetaMask-signed writes, use the browser `WalletClient` pattern from the Arkiv docs — `createWalletClient` with `window.ethereum` transport. This avoids the ownership transfer step.
5. **Read operations**: use `createPublicClient` — no wallet needed, safe for server components.
6. **Anomaly agent**: runs as a Next.js API route cron (`/api/agent/scan`) triggered by Vercel Cron (free tier). Uses a dedicated `AGENT_PRIVATE_KEY`; `$creator` is the agent wallet, `$owner` is the sensor owner wallet.

### State Management Strategy

```
Zustand store (client-only, not persisted):
  walletAddress: string | null          — from wagmi useAccount()
  selectedSensorKey: string | null      — Arkiv entityKey of focused sensor
  boundingBox: { sw: LatLng, ne: LatLng } | null  — researcher's drawn bbox
  meshQueryResults: Reading[]           — last mesh query result set
  isQuerying: boolean                   — loading state for mesh query
  minQualityScore: number               — slider value 0–100 (default 70)  [G9]
  selectedSensorType: string            — dropdown value (default "all")    [G9]
  timeRangeHours: number                — 1 | 6 | 24 (default 24)          [G9]
```

Server state (readings, devices, alerts) is fetched directly from Arkiv via `publicClient.buildQuery()` — no client cache layer needed for MVP. Next.js `fetch` caching with `revalidate: 30` handles freshness on server components.

---

## 4. Arkiv Entity Schema

### PROJECT_ATTRIBUTE (required on every entity and every query)

```typescript
// lib/arkiv.ts
export const PROJECT_ATTRIBUTE = {
  key: "project",
  value: "meshown-v1",
} as const;
```

---

### Entity 1: SensorDevice

**Purpose:** Registers a physical sensor. One entity per device. Permanent (no expiry).

**Payload (JSON):**
```json
{
  "name": "Backyard PM2.5 Monitor",
  "description": "Rooftop sensor, south-facing",
  "manufacturer": "DIY",
  "firmwareVersion": "1.2.0"
}
```

**Attributes:**

| Key | Type | Value example | Notes |
|---|---|---|---|
| `project` | string | `"meshown-v1"` | PROJECT_ATTRIBUTE — required |
| `entityType` | string | `"sensor_device"` | Discriminator for queries |
| `sensor_type` | string | `"air_quality"` | Enum: `air_quality`, `temperature`, `energy`, `soil`, `weather` |
| `lat` | **number** | `48.8566` | Numeric — enables `gt()`/`lt()` bounding-box queries |
| `lng` | **number** | `2.3522` | Numeric — enables `gt()`/`lt()` bounding-box queries |
| `status` | string | `"active"` | `"active"` \| `"inactive"` \| `"calibration_needed"` |
| `registered_at` | **number** | `1716800000000` | `Date.now()` — numeric for ordering |

**Arkiv metadata:**
- `$owner`: sensor owner's wallet (mutable — transferable)
- `$creator`: sensor owner's wallet (immutable — permanent attribution)
- `expiresIn`: `ExpirationTime.fromDays(3650)` → 315,360,000 seconds (~10 years) **(C1 — `null` is not a valid SDK value; use long TTL instead)**

**Relationships:** `CalibrationRecord` entities reference this entity's key via `device_key` attribute.

---

### Entity 2: Reading

**Purpose:** A single sensor measurement. High volume, short TTL.

**Payload (JSON):**
```json
{
  "value": 23.4,
  "unit": "μg/m³",
  "quality_score": 87,
  "calibration_key": "0xabc123...",
  "raw": { "pm1": 18.2, "pm10": 31.1 }
}
```

**Attributes:**

| Key | Type | Value example | Notes |
|---|---|---|---|
| `project` | string | `"meshown-v1"` | PROJECT_ATTRIBUTE |
| `entityType` | string | `"reading"` | |
| `sensor_type` | string | `"air_quality"` | Matches parent SensorDevice |
| `device_key` | string | `"0xdeviceKey..."` | Links to parent SensorDevice entity key |
| `lat` | **number** | `48.8566` | Copied from device — enables mesh queries without join |
| `lng` | **number** | `2.3522` | Copied from device |
| `value` | **number** | `23.4` | Numeric — enables `gt()`/`lt()` threshold filtering |
| `quality_score` | **number** | `87` | 0–100; numeric for filtering |
| `timestamp` | **number** | `1716800000000` | `Date.now()`; numeric for time-range queries and ordering |

**Arkiv metadata:**
- `$owner`: sensor owner's wallet
- `$creator`: sensor owner's wallet (or server agent wallet — immutable proof of origin)
- `expiresIn`: `ExpirationTime.fromDays(30)` → `2592000` seconds

**Key design decision:** `lat` and `lng` are copied from the parent `SensorDevice` onto every `Reading`. This is denormalisation by design — Arkiv has no joins. Copying enables a single bounding-box query across readings without a two-step lookup.

---

### Entity 3: CalibrationRecord

**Purpose:** Records sensor calibration events. Permanent provenance — never expires.

**Payload (JSON):**
```json
{
  "offset_value": 0.8,
  "offset_unit": "μg/m³",
  "calibration_method": "reference_comparison",
  "notes": "Compared to EPA reference station #42"
}
```

**Attributes:**

| Key | Type | Value example | Notes |
|---|---|---|---|
| `project` | string | `"meshown-v1"` | PROJECT_ATTRIBUTE |
| `entityType` | string | `"calibration_record"` | |
| `device_key` | string | `"0xdeviceKey..."` | Links to parent SensorDevice — relationship pattern |
| `calibrated_by` | string | `"0xwallet..."` | Wallet of calibrating party |
| `valid_from` | **number** | `1716800000000` | Numeric — timestamp of calibration |
| `valid_until` | **number** | `1748336000000` | Numeric — expiry of calibration validity; enables "was this calibration active?" queries |

**Arkiv metadata:**
- `$owner`: sensor owner's wallet
- `$creator`: calibrating party wallet (immutable — who certified this calibration)
- `expiresIn`: `ExpirationTime.fromDays(3650)` → 315,360,000 seconds (~10 years) **(C1 — `null` invalid; H5: note this TTL costs more GLM than short-lived entities)**

---

### Entity 4: AnomalyAlert

**Purpose:** Written by the AI agent when a reading anomaly is detected. The `$creator`/`$owner` split is the key architectural feature.

**Payload (JSON):**
```json
{
  "anomaly_type": "spike",
  "description": "PM2.5 rose 420% in 8 minutes — possible local combustion event",
  "baseline_value": 18.2,
  "observed_value": 94.6,
  "confidence": 0.91,
  "affected_reading_key": "0xreadingKey..."
}
```

**Attributes:**

| Key | Type | Value example | Notes |
|---|---|---|---|
| `project` | string | `"meshown-v1"` | PROJECT_ATTRIBUTE |
| `entityType` | string | `"anomaly_alert"` | |
| `device_key` | string | `"0xdeviceKey..."` | Which device triggered the alert |
| `sensor_type` | string | `"air_quality"` | For filtered alert feeds |
| `severity` | string | `"high"` | `"low"` \| `"medium"` \| `"high"` |
| `lat` | **number** | `48.8566` | Copied from device — alert map queries |
| `lng` | **number** | `2.3522` | Copied from device |
| `timestamp` | **number** | `1716800000000` | Numeric for time ordering |
| `confidence` | **number** | `91` | 0–100 integer; numeric for filtering |

**Arkiv metadata:**
- `$owner`: **sensor owner's wallet** — they own the alert about their device
- `$creator`: **AI agent's wallet** (immutable — permanently proves the agent wrote this)
- `expiresIn`: `ExpirationTime.fromDays(90)` → `7776000` seconds

---

## 5. UI/UX Wireframes

### Design Specification

- **Theme:** System default (light/dark respects OS preference via Tailwind `dark:` classes)
- **Primary feel:** Clean data dashboard — similar to Linear or Vercel dashboard. Not a crypto-native dark terminal.
- **Background:** `#F9FAFB` light / `#0F172A` dark
- **Primary accent:** `#2563EB` (blue-600) — buttons, active states, links
- **Secondary accent:** `#10B981` (emerald-500) — quality scores, online status, success
- **Warning:** `#F59E0B` (amber-500) — medium severity alerts, expiring calibrations
- **Danger:** `#EF4444` (red-500) — high severity alerts, offline sensors
- **Typography:** Inter (system sans-serif stack fallback); headings 600 weight; body 400
- **Cards:** White bg, `shadow-sm`, `rounded-xl`, `border border-gray-100`
- **Buttons:** Solid filled primary (`bg-blue-600 text-white hover:bg-blue-700`); outline secondary
- **Inputs:** `bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500`
- **Badges:** Rounded pill; color-coded by sensor type and severity
- **Reference:** Vercel Dashboard, Linear — NOT VS Code or generic crypto dark UI

---

### Screen 1: Mesh Map (`/`)

**Purpose:** The hero screen. Shows all active sensors on a Leaflet map. Researcher mode: draw a bounding box to trigger a mesh query.

**Layout:** Full-viewport map with a floating left sidebar (320 px).

**Sidebar components:**
- Logo + tagline ("Own your sensor data")
- RainbowKit `<ConnectButton />` — shows truncated address + chain indicator when connected; handles MetaMask + injected wallets automatically
- Mode toggle: "Browse" / "Query" — switches map interaction
- **Query mode controls:**
  - `sensor_type` dropdown (all / air_quality / weather / energy / soil)
  - Quality score slider: min 0–100 (default 70)
  - Time range: last 1h / 6h / 24h
  - "Draw bounding box" instruction
  - "Run Mesh Query" button — disabled until box is drawn
- Query results summary: "Found 847 readings from 12 sensors"

**Map components:**
- Leaflet map, OpenStreetMap tiles (free, no API key)
- `SensorMarker`: colour-coded circle by sensor type; size reflects reading recency; click opens `SensorPopup`
- `SensorPopup`: device name, owner wallet (truncated), latest reading value + unit, quality score badge, "View Details" link
- `AnomalyMarker`: red pulsing circle at alert coordinates; click opens alert summary
- `BoundingBoxLayer`: drawn rectangle highlighting selected query area (Query mode only)
- Results overlay: semi-transparent panel showing mesh query result count and average quality score

**Data sources:**
- `GET /api/devices` → Arkiv query: `entityType = "sensor_device" && project = "meshown-v1"`; up to 200 devices
- `GET /api/readings/latest` → one latest reading per device
- `GET /api/alerts/recent` → alerts from last 24h

**Real-time (C2 — polling, not WebSocket):** Arkiv Live Events uses HTTP polling via `publicClient.subscribeEntityEvents()`. The `wss://` URL mentioned in earlier drafts does not exist in the SDK.

```typescript
// components/MeshMap.tsx — inside the map client component
useEffect(() => {
  const unsubscribe = publicClient.subscribeEntityEvents(
    {
      onEntityCreated: async (event) => {
        const entity = await publicClient.getEntity(event.entityKey)
        const data = entity.toJson()
        if (data.project === PROJECT_ATTRIBUTE.value) {
          // dispatch to Zustand → re-render markers
        }
      },
      onError: (err) => console.error("Live events error:", err),
    },
    5000,  // poll every 5 s
    // pass lastKnownBlock as bigint here to replay missed events on re-focus (L2)
  )
  return () => unsubscribe()
}, [])
```

---

### Screen 2: Sensor Detail (`/sensor/[entityKey]`)

**Purpose:** Deep-dive into a single sensor. Owner sees management controls; everyone sees the reading history.

**Layout:** Two-column (sidebar left 280 px, main content right).

**Sidebar — Sensor Info Card:**
- Device name, type badge, status indicator (active / inactive)
- Owner wallet address with Etherscan link
- `$creator` wallet — "Registered by"
- Registration date
- Sensor type icon + unit label
- **Calibration section:**
  - Current calibration record: valid from / valid until, calibrated by wallet
  - Status badge: "✓ Valid" (green) / "⚠ Expiring soon" (amber, within 30d) / "✗ Expired" (red)
  - Calibration history list (all `CalibrationRecord` entities for this device)
- **Owner-only controls** (shown when `walletAddress === device.$owner`):
  - "Submit New Reading" button
  - "Add Calibration Record" button
  - "Edit Device Info" button
  - "Transfer Ownership" input + button

**Main content:**
- Reading history line chart (Recharts `LineChart`) — last 24h, time on X, value on Y
- Quality score trend chart — same time window
- Readings table: timestamp, value, unit, quality score, calibration status at time of reading
- Anomaly alerts for this device (last 7 days) — card list with severity badge, description, AI agent attribution

**Data sources:**
- `GET /api/device/[key]` → `publicClient.getEntity(key)` + `.toJson()`
- `GET /api/readings?deviceKey=[key]&limit=200` → time-ordered readings
- `GET /api/calibrations?deviceKey=[key]` → all calibration records
- `GET /api/alerts?deviceKey=[key]` → anomaly alerts

---

### Screen 3: Owner Dashboard (`/dashboard`)

**Purpose:** Sensor owner's control panel. Requires connected wallet.

**Layout:** Standard dashboard grid.

**Components:**
- **Stats row (4 metric cards):**
  - Total devices registered
  - Total readings (last 30d)
  - Average quality score across all devices
  - Active anomaly alerts
- **Device list table:** name, sensor type, status, last reading, quality score, calibration status, actions
- **"Register New Device" modal:**
  - Form: name, description, sensor type (select), latitude, longitude
  - On submit: `POST /api/device/register` → `createEntity` on Arkiv
- **Reading submission panel:** select device, enter value + unit, submit
- **Anomaly alerts feed:** all alerts across owner's devices, last 30 days

**Data sources:** All queries filtered with `.ownedBy(walletAddress)`

---

### Screen 4: Mesh Query Results (`/query`)

**Purpose:** Full-page results of a bounding-box mesh query. Reached after drawing a box and clicking "Run Mesh Query" on the map.

**Layout:** Split — results table (left 60%) + mini map showing sensor locations (right 40%).

**Components:**
- Query parameters summary banner: bbox coordinates, sensor type, quality threshold, time range
- Results table: timestamp, device name, owner (truncated wallet), lat/lng, value, unit, quality score, calibration status — sortable columns
- **Truncation banner** (shown when `summary.truncated === true`): "Results capped at 200 — refine your bounding box or increase the quality filter" in amber warning style
- Export button: download results as CSV (client-side `Blob` — columns: timestamp, device_key, owner, lat, lng, value, unit, quality_score, calibration_valid)
- "Why can you query multiple owners at once?" explainer callout — educates judges
- Aggregate stats: readings count, unique owners, average quality, time span covered

**Key tech detail:** After drawing a box and clicking "Run Mesh Query", the app serialises the bbox into URL params and navigates to `/query?sw_lat=...&sw_lng=...&ne_lat=...&ne_lng=...&sensor_type=...&min_quality=70&hours=24`. The `/query` page reads these via Next.js `searchParams` and calls `GET /api/readings/mesh` — making the results fully linkable and bookmarkable. The underlying Arkiv call:

```typescript
const result = await publicClient
  .buildQuery()
  .where([
    eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value),
    eq("entityType", "reading"),
    ...(sensor_type !== "all" ? [eq("sensor_type", sensor_type)] : []),
    gt("lat", sw_lat),
    lt("lat", ne_lat),
    gt("lng", sw_lng),
    lt("lng", ne_lng),
    gte("quality_score", min_quality),
    gt("timestamp", Date.now() - hours * 3600000),
  ])
  .withPayload(true)
  .withAttributes(true)
  .withMetadata(true)
  .orderBy(desc("timestamp", "number"))
  .limit(200)
  .fetch();

const truncated = result.entities.length === 200;
```

---

### Screen 5: Alert Feed (`/alerts`)

**Purpose:** Public tamper-proof log of all AI-detected anomalies across the mesh.

**Layout:** Single-column feed with filter bar.

**Components:**
- Filter bar: severity (all/low/medium/high), sensor type, date range
- Alert cards:
  - Severity badge (colour-coded)
  - Device name + sensor type
  - Description (from payload)
  - Values: baseline → observed, confidence score
  - Timestamps: detected at
  - Attribution: "Detected by AI Agent `0xagent...`" (the `$creator`) — "Owned by `0xowner...`" (the `$owner`)
  - Link to sensor detail page

---

## 6. API Specification

All Next.js API routes. Write routes require `Authorization: Bearer <wallet-signed-nonce>` or run server-side with the agent key. Read routes are open.

---

### Device Endpoints

**`GET /api/devices`**
Auth: none
Query params: `sensor_type?`, `lat_min?`, `lat_max?`, `lng_min?`, `lng_max?`, `limit?` (default 100)
Arkiv call: `buildQuery().where([eq(PROJECT_ATTRIBUTE...), eq("entityType","sensor_device"), ...bbox conditions]).withPayload(true).withAttributes(true).withMetadata(true).fetch()`
Response:
```json
{ "devices": [{ "entityKey": "0x...", "name": "...", "sensor_type": "air_quality", "lat": 48.85, "lng": 2.35, "status": "active", "owner": "0x..." }], "total": 42 }
```

**`GET /api/device/[entityKey]`**
Auth: none
Arkiv call: `publicClient.getEntity(entityKey)` + `entity.toJson()`
Response: full device payload + attributes + metadata

**`POST /api/device/register`**
Auth: wallet address in body, validated via signature
Body: `{ name, description, sensor_type, lat, lng, ownerAddress }`
Arkiv call: `walletClient.createEntity({...})` then `walletClient.changeOwnership({ entityKey, newOwner: ownerAddress })`
Response: `{ entityKey, txHash }`

**`PUT /api/device/[entityKey]`**
Auth: only callable by `$owner`
Body: `{ name?, description?, status? }`
Arkiv call: `walletClient.updateEntity({...})` — must re-send all existing attributes
Response: `{ txHash }`

---

### Reading Endpoints

**`POST /api/reading/submit`**
Auth: wallet address in body
Body: `{ deviceKey, value, unit, ownerAddress }`
Server logic:
1. Fetch the device entity to get `lat`, `lng`, `sensor_type`
2. Fetch active `CalibrationRecord` for this device (`valid_from <= now <= valid_until`)
3. Compute `quality_score` (0–100) based on neighbour comparison (see Quality Score Algorithm below)
4. `walletClient.createEntity(Reading entity)` with `expiresIn: ExpirationTime.fromDays(30)`
5. `walletClient.changeOwnership({ entityKey, newOwner: ownerAddress })`
Response: `{ entityKey, txHash, quality_score }`

**`GET /api/readings`**
Auth: none
Query params: `deviceKey`, `limit?` (default 50), `since?` (unix ms timestamp)
Arkiv call: `buildQuery().where([eq(PROJECT_ATTRIBUTE...), eq("entityType","reading"), eq("device_key", deviceKey), gt("timestamp", since)]).createdBy(CREATOR_WALLET_ADDRESS).withPayload(true).orderBy(desc("timestamp","number")).limit(limit).fetch()` **(H1)**
Response: `{ readings: [...], hasMore: bool }`

**`GET /api/readings/latest`** *(G6 — was referenced in Screen 1 but missing from spec)*
Auth: none
Query params: `deviceKeys` (comma-separated list of entityKeys, max 50)
Logic: for each deviceKey, `buildQuery().where([...PROJECT_ATTRIBUTE, eq("device_key", key)]).orderBy(desc("timestamp","number")).limit(1).fetch()` — batched in parallel via `Promise.all`
Response: `{ latest: { [deviceKey]: Reading } }`

**`GET /api/alerts/recent`** *(G7 — was referenced in Screen 1 but missing from spec)*
Auth: none
Query params: `hours?` (default 24), `limit?` (default 50)
Arkiv call: `buildQuery().where([...PROJECT_ATTRIBUTE, eq("entityType","anomaly_alert"), gt("timestamp", Date.now() - hours*3600000)]).createdBy(CREATOR_WALLET_ADDRESS).withPayload(true).withAttributes(true).withMetadata(true).orderBy(desc("timestamp","number")).limit(limit).fetch()` **(H1)**
Response: `{ alerts: [...] }`

**`GET /api/readings/mesh`** *(G8 — changed from POST to GET for linkability)*
Auth: none
Query params: `sw_lat`, `sw_lng`, `ne_lat`, `ne_lng`, `sensor_type?`, `min_quality?` (default 0), `hours?` (default 24)
Arkiv call: single `buildQuery()` with numeric attribute range conditions on `lat`, `lng`, `quality_score`, `timestamp`
Response: `{ readings: [...], summary: { count, unique_owners, avg_quality, truncated: boolean } }`
Note: `truncated: true` when result set hits the 200-entity page cap — client shows "Results capped at 200 — refine your area" banner

---

### Calibration Endpoints

**`GET /api/calibrations`**
Auth: none
Query params: `deviceKey`
Arkiv call: `buildQuery().where([eq(PROJECT_ATTRIBUTE...), eq("entityType","calibration_record"), eq("device_key", deviceKey)]).createdBy(CREATOR_WALLET_ADDRESS).withPayload(true).withAttributes(true).withMetadata(true).orderBy(desc("valid_from","number")).fetch()` **(H1)**
Response: `{ calibrations: [...] }`

**`POST /api/calibration/add`**
Auth: device owner only
Body: `{ deviceKey, offset_value, offset_unit, calibration_method, notes, valid_until_ms, ownerAddress }`
Arkiv call: `walletClient.createEntity(CalibrationRecord)` with `expiresIn: ExpirationTime.fromDays(3650)` **(C1)**
Response: `{ entityKey, txHash }`

---

### Alert Endpoints

**`GET /api/alerts`**
Auth: none
Query params: `deviceKey?`, `severity?`, `limit?` (default 50), `since?`
Arkiv call: `buildQuery().where([eq(PROJECT_ATTRIBUTE...), eq("entityType","anomaly_alert"), ...filters]).createdBy(CREATOR_WALLET_ADDRESS).withPayload(true).withAttributes(true).withMetadata(true).orderBy(desc("timestamp","number")).limit(limit).fetch()` **(H1)**
Response: `{ alerts: [...] }`

**`POST /api/agent/scan`** *(internal — called by Vercel Cron)*
Auth: `CRON_SECRET` header
Logic: Fetch all readings from last 5 minutes. For each, compare against that device's last 20 readings. If value deviates >3σ from rolling mean, create `AnomalyAlert` entity. `$creator` = AGENT wallet, `$owner` = device owner.
Response: `{ processed: N, alerts_created: M }`

---

### Utility Endpoints

**`DELETE /api/device/[entityKey]`** *(G11 — owner deregistration)*
Auth: owner only (wallet sig verified via nonce pattern)
Body: `{ address, nonce, signature }`
Arkiv call: `walletClient.deleteEntity({ entityKey })`
Note: does not delete associated readings or calibrations — those remain on-chain as historical provenance
Response: `{ txHash }`
Auth: none
Query params: `address` (wallet address)
Logic: generate UUID nonce, store in server-side Map with `{ address, expires: Date.now() + 300_000 }`
Response: `{ nonce: "uuid-..." }`

**`GET /api/health`**
Returns: `{ status: "ok", network: "braga", blockTime: "2s" }`

**`GET /api/stats`**
Arkiv calls: `publicClient.buildQuery()...getEntityCount()` for each entity type
Returns: `{ total_devices, total_readings, total_alerts, total_calibrations }`

---

### Quality Score Algorithm

Runs server-side in `/api/reading/submit`:

```typescript
async function computeQualityScore(
  newValue: number,
  lat: number,
  lng: number,
  sensor_type: string,
  radiusDeg: number = 0.05  // ~5 km
): Promise<number> {
  // 1. Query neighbour readings in bounding box, last 30 minutes
  const neighbours = await publicClient
    .buildQuery()
    .where([
      eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value),
      eq("entityType", "reading"),
      eq("sensor_type", sensor_type),
      gt("lat", lat - radiusDeg),
      lt("lat", lat + radiusDeg),
      gt("lng", lng - radiusDeg),
      lt("lng", lng + radiusDeg),
      gt("timestamp", Date.now() - 30 * 60 * 1000),
    ])
    .withPayload(true)
    .limit(20)
    .fetch();

  if (neighbours.entities.length < 2) return 75; // insufficient neighbours — default

  const values = neighbours.entities.map(e => e.toJson().value as number);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const deviation = Math.abs(newValue - mean) / (mean || 1);

  // Deviation 0% → score 100; deviation 50%+ → score 0
  return Math.max(0, Math.round(100 - deviation * 200));
}
```

---

## 7. Development Roadmap

### Phase 0 — Environment Setup (Day 1, ~2 hours)

- [ ] `pnpm create next-app meshown --typescript --tailwind --app`
- [ ] `pnpm add @arkiv-network/sdk wagmi viem zustand recharts leaflet@1.9.4 react-leaflet@5.0.0 leaflet-draw@1.0.4 @rainbow-me/rainbowkit@2.2.11 zod`
- [ ] `pnpm add -D @types/leaflet @types/leaflet-draw@1.0.13`
- [ ] Create `.env.local`:
  ```
  AGENT_PRIVATE_KEY=0x...          # server-side only — never exposed to browser
  NEXT_PUBLIC_CHAIN_ID=60138453102
  NEXT_PUBLIC_RPC_URL=https://braga.hoodi.arkiv.network/rpc
  CRON_SECRET=...
  ```
- [ ] Create `lib/arkiv.ts` — `PROJECT_ATTRIBUTE`, `publicClient`, `walletClient` (server-only)
- [ ] Fund agent wallet from Braga faucet: `https://braga.hoodi.arkiv.network/faucet`
- [ ] Verify connection: `publicClient.buildQuery().where(eq("project","meshown-v1")).limit(1).fetch()`
- [ ] Init GitHub repo, push, confirm public

### Phase 1 — Core Entity Layer (Day 1–2, ~6 hours)

- [ ] Implement `POST /api/device/register` — create `SensorDevice` entity, transfer ownership
- [ ] Implement `GET /api/devices` — query all SensorDevice entities
- [ ] Implement `GET /api/device/[entityKey]` — single device fetch
- [ ] Implement `POST /api/reading/submit` — create `Reading` with quality score
- [ ] Implement `GET /api/readings` — reading history per device
- [ ] Implement `POST /api/calibration/add` — create permanent `CalibrationRecord`
- [ ] Implement `GET /api/calibrations` — calibration history
- [ ] Write Zod schemas for all entity payloads
- [ ] Manual test: register 3 simulated devices, submit 10 readings each, verify on Arkiv explorer (`https://explorer.braga.hoodi.arkiv.network`)

### Phase 2 — Map UI + Mesh Query (Day 2–3, ~8 hours)

- [ ] Create `components/MeshMap.tsx` as a **client-only** module — wrap in `next/dynamic` with `ssr: false` to prevent Leaflet's `window` access from crashing SSR:
  ```typescript
  // app/page.tsx
  import dynamic from 'next/dynamic'
  const MeshMap = dynamic(() => import('@/components/MeshMap'), { ssr: false })
  ```
- [ ] Build `MeshMap` component — Leaflet, OpenStreetMap tiles, `SensorMarker`, `SensorPopup`
- [ ] Build `BoundingBoxDraw` — `leaflet-draw` rectangle tool, stores bbox in Zustand
- [ ] Build query sidebar with sensor type filter, quality slider, time range
- [ ] Implement `GET /api/readings/mesh` — the flagship bounding-box multi-owner query (GET with query params for linkability — see §6)
- [ ] Wire "Run Mesh Query" button → mesh endpoint → serialise bbox into `/query?sw_lat=...&sw_lng=...&ne_lat=...&ne_lng=...` URL params → populate results
- [ ] Build `/query` results page — reads bbox from `searchParams`, sortable table, CSV export, aggregate stats, truncation banner when results hit 200
- [ ] Add RainbowKit `ConnectButton` and `RainbowKitProvider` + wagmi `WagmiProvider` to root layout — RainbowKit automatically handles `wallet_addEthereumChain` for Braga **(L3 — fallback without RainbowKit: call `window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: "0xe0087f86e", chainName: "Arkiv Braga Testnet", nativeCurrency: { name: "Golem", symbol: "GLM", decimals: 18 }, rpcUrls: ["https://braga.hoodi.arkiv.network/rpc"] }] })` manually)**
- [ ] **Demo checkpoint:** draw a box over 3 simulated sensors, run query, verify single Arkiv call returns all readings from multiple owners

### Phase 3 — Sensor Detail + Owner Dashboard (Day 3, ~6 hours)

- [ ] Build `/sensor/[entityKey]` — detail page with Recharts time-series, calibration timeline, quality trend
- [ ] Build calibration validity check — compare `valid_until` attribute against `Date.now()`
- [ ] Build `/dashboard` — owner's device list, stats row, "Register New Device" modal, reading submission panel
- [ ] Filter dashboard queries with `.ownedBy(walletAddress)` from Zustand
- [ ] Implement `PUT /api/device/[entityKey]` — update device info

### Phase 4 — AI Anomaly Agent + Alert Feed (Day 3–4, ~4 hours)

- [ ] Implement `POST /api/agent/scan` — rolling mean calculation, 3σ anomaly detection
- [ ] Create `AnomalyAlert` entities with agent `$creator`, sensor owner `$owner`
- [ ] Configure Vercel Cron in `vercel.json` — use every-2-hour schedule to stay within Hobby free tier (12 invocations/day max; `*/5 * * * *` = 288/day would silently fail after 12):
  ```json
  { "crons": [{ "path": "/api/agent/scan", "schedule": "0 */2 * * *" }] }
  ```
  **Alternative for more frequent scanning during demo:** use [cron-job.org](https://cron-job.org) free external cron to `POST https://your-app.vercel.app/api/agent/scan` with `Authorization: Bearer <CRON_SECRET>` header every 5 minutes — bypasses Vercel limit.
- [ ] Build `/alerts` page — severity-filtered feed, attribution display, sensor links
- [ ] Add `AnomalyMarker` layer to MeshMap — pulsing red circles
- [ ] **Demo checkpoint:** trigger a simulated spike reading, verify alert appears with correct `$creator`/`$owner` split

### Phase 5 — Live Events + Polish (Day 4, ~4 hours)

- [ ] Add Arkiv Live Events WebSocket for real-time new readings on map
- [ ] Add loading skeletons, error boundaries, empty states for all data-fetching paths
- [ ] Mobile-responsive map sidebar (collapsible on small screens)
- [ ] Write README with setup instructions, `.env` documentation, faucet link, demo link
- [ ] Record 2–3 minute demo video: map → draw bbox → run mesh query → sensor detail → calibration lineage → anomaly alert with `$creator`/`$owner` split

### Phase 6 — CI/CD Deployment (Day 4, ~2 hours)

- [ ] Push to GitHub (public repo)
- [ ] Connect to Vercel — zero-config Next.js deployment
- [ ] Set all environment variables in Vercel dashboard (never commit private key)
- [ ] Verify Vercel Cron runs anomaly scan at scheduled interval (every 2h), or confirm cron-job.org external trigger is firing
- [ ] Submit to `forms.arkiv.network/ethns-arkiv-challenge` with repo link, demo link, wallet address

---

## 8. External Dependencies

| Service | Purpose | Free Tier Limits | Env Variable | Fallback | Consumer |
|---|---|---|---|---|---|
| Arkiv Braga RPC | All reads/writes | Unlimited (testnet GLM) | `NEXT_PUBLIC_RPC_URL` | None | All API routes + publicClient |
| Arkiv Braga Faucet | Fund wallets | Free test GLM, manual | — | Discord request | Dev setup only |
| Arkiv Explorer | Verify entities | Free | — | None | Dev verification only |
| OpenStreetMap tiles | Map rendering | Free, no key, ToS: no heavy commercial use | — | Any free tile provider | MeshMap component |
| Vercel Hosting | Deploy | Hobby: 100 GB BW free | All env vars | Railway.app | Entire app |
| Vercel Cron | Agent trigger | **12 invocations/day max** on Hobby — use `0 */2 * * *` schedule | `CRON_SECRET` | cron-job.org (below) | `POST /api/agent/scan` |
| cron-job.org | External cron trigger (G3 fallback) | Free, unlimited jobs, 1-min minimum interval | — | Vercel Cron at reduced frequency | `POST /api/agent/scan` via HTTP |
| OpenAI API | Alert description enrichment (optional) | $5 free credit | `OPENAI_API_KEY` | Hardcoded template strings | AnomalyDetectionAgent |
| `AGENT_PRIVATE_KEY` | Server wallet for all writes | — | `AGENT_PRIVATE_KEY` | None — critical | All write API routes |
| `CRON_SECRET` | Protect agent scan endpoint | — | `CRON_SECRET` | None | `POST /api/agent/scan` |

---

## 9. Coverage Map

| Blueprint Element | Type | Roadmap Phase | Risk if Missed |
|---|---|---|---|
| `PROJECT_ATTRIBUTE` config (`lib/arkiv.ts`) | Schema | Phase 0 | Critical |
| Braga chain config, faucet | Infra | Phase 0 | Critical |
| `AGENT_PRIVATE_KEY` env var | Infra | Phase 0 | Critical |
| `CRON_SECRET` env var | Infra | Phase 0 | High |
| `leaflet-draw@1.0.4` + `@types/leaflet-draw@1.0.13` *(G1 resolved)* | Infra | Phase 0 | High |
| `@rainbow-me/rainbowkit@2.2.11` *(G5 resolved)* | Infra | Phase 0 | High |
| `SensorDevice` entity + attributes | Schema | Phase 1 | Critical |
| `Reading` entity + denormalised lat/lng | Schema | Phase 1 | Critical |
| `CalibrationRecord` entity | Schema | Phase 1 | High |
| `AnomalyAlert` entity | Schema | Phase 4 | Medium |
| `lat`/`lng` as numeric attributes | Constraint | Phase 1 | Critical |
| `expiresIn` in seconds | Constraint | Phase 1 | High |
| `updateEntity` full-replace semantics | Constraint | Phase 1 | High |
| Denormalised lat/lng on Reading + AnomalyAlert | Schema | Phase 1 | Critical |
| QualityScoreService | Service | Phase 1 | High |
| `GET /api/devices` | Endpoint | Phase 1 | Critical |
| `GET /api/device/[key]` | Endpoint | Phase 1 | Critical |
| `POST /api/device/register` | Endpoint | Phase 1 | Critical |
| `PUT /api/device/[key]` | Endpoint | Phase 3 | Medium |
| `DELETE /api/device/[key]` *(G11 resolved)* | Endpoint | Phase 3 | Low |
| `POST /api/reading/submit` | Endpoint | Phase 1 | Critical |
| `GET /api/readings` | Endpoint | Phase 1 | Critical |
| `GET /api/readings/mesh` *(G8 resolved — was POST)* | Endpoint | Phase 2 | Critical |
| `GET /api/readings/latest` *(G6 resolved — was missing)* | Endpoint | Phase 2 | High |
| `GET /api/calibrations` | Endpoint | Phase 1 | High |
| `POST /api/calibration/add` | Endpoint | Phase 1 | High |
| `GET /api/alerts` | Endpoint | Phase 4 | Medium |
| `GET /api/alerts/recent` *(G7 resolved — was missing)* | Endpoint | Phase 2 | Medium |
| `POST /api/agent/scan` | Endpoint | Phase 4 | Medium |
| `GET /api/auth/nonce` *(G4 resolved)* | Endpoint | Phase 1 | High |
| `GET /api/health` | Endpoint | Phase 6 | Low |
| `GET /api/stats` | Endpoint | Phase 6 | Low |
| Wallet `personal_sign` nonce verification *(G4 resolved)* | Constraint | Phase 1 | High |
| Leaflet SSR fix — `next/dynamic ssr:false` *(G2 resolved)* | Constraint | Phase 2 | High |
| Vercel Cron `0 */2 * * *` schedule *(G3 resolved)* | Infra | Phase 4 | High |
| cron-job.org fallback for 5-min demo scanning *(G3 resolved)* | Infra | Phase 4 | Medium |
| `GET /api/readings/mesh` linkable via searchParams *(G8 resolved)* | Constraint | Phase 2 | Medium |
| Query truncation banner at 200 results *(G10 resolved)* | Feature | Phase 2 | Medium |
| Zustand: `minQualityScore`, `selectedSensorType`, `timeRangeHours` *(G9 resolved)* | State | Phase 2 | Medium |
| RainbowKit `<ConnectButton />` in root layout *(G5 resolved)* | Component | Phase 2 | High |
| CSV export — column spec: timestamp, device_key, owner, lat, lng, value, unit, quality_score, calibration_valid *(G — clarified)* | Feature | Phase 5 | Low |
| MeshMap screen | Screen | Phase 2 | Critical |
| Sensor Detail screen | Screen | Phase 3 | High |
| Owner Dashboard screen | Screen | Phase 3 | High |
| Mesh Query Results screen | Screen | Phase 2 | Critical |
| Alert Feed screen | Screen | Phase 4 | Medium |
| `$owner` / `$creator` split on AnomalyAlert | Constraint | Phase 4 | High |
| `CREATOR_WALLET_ADDRESS` in `lib/arkiv.ts` + `.createdBy()` on all server queries *(H1)* | Constraint | Phase 1 | High |
| `@tanstack/react-query` — `QueryClientProvider` in root layout *(C5)* | Infra | Phase 0 | High |
| `useArkivWalletClient()` hook for direct MetaMask writes *(C4)* | Component | Phase 6 | Low |
| `expiresIn: ExpirationTime.fromDays(3650)` for permanent entities *(C1 — null invalid)* | Constraint | Phase 1 | Critical |
| `subscribeEntityEvents()` polling — NOT WebSocket *(C2)* | Constraint | Phase 5 | High |
| `result.createdEntities[]` shape for `mutateEntities()` *(C3)* | Constraint | Phase 1 | High |
| `desc` import from `@arkiv-network/sdk/query` *(H3)* | Constraint | Phase 2 | High |
| Glob `~` operator unavailable in TS SDK *(H4 — use eq() only)* | Constraint | Phase 1 | Medium |
| GLM cost scales with expiration TTL *(H5 — long-lived entities cost more)* | Constraint | Phase 1 | Medium |
| `AGENT_WALLET_ADDRESS` env var for `.createdBy()` *(H1)* | Infra | Phase 0 | High |
| `.createdBy()` for trusted agent queries | Constraint | Phase 4 | Medium |
| Private key server-side only | Constraint | Phase 0 | Critical |
| Live Events WebSocket | Feature | Phase 5 | Low |
| README + demo video | Deliverable | Phase 6 | Critical |

---

## 10. Gap Resolutions Applied

All 11 gaps identified in the Phase 2 extraction have been resolved and patched into this blueprint:

| Gap | Resolution | Where Applied |
|---|---|---|
| G1 — `leaflet-draw` missing from install | Added `leaflet-draw@1.0.4` + `@types/leaflet-draw@1.0.13` to Phase 0 pnpm command | §2 Tech Stack, §7 Phase 0 |
| G2 — Leaflet SSR crash | `next/dynamic(() => import('./MeshMap'), { ssr: false })` pattern specified | §7 Phase 2 |
| G3 — Vercel Cron 288/day exceeds 12/day Hobby limit | Schedule changed to `0 */2 * * *`; cron-job.org listed as free external fallback | §7 Phase 4, §8 Dependencies |
| G4 — Wallet auth unspecified | `personal_sign` nonce pattern with `viem.verifyMessage` fully specified; `GET /api/auth/nonce` added | §3 Auth Flow, §6 API Spec |
| G5 — `ConnectButton` not a wagmi primitive | `@rainbow-me/rainbowkit@2.2.11` added; `<ConnectButton />` + `RainbowKitProvider` in root layout | §2 Tech Stack, §5 Screen 1, §7 Phase 2 |
| G6 — `GET /api/readings/latest` missing from spec | Endpoint added with batched `Promise.all` pattern | §6 API Spec |
| G7 — `GET /api/alerts/recent` missing from spec | Endpoint added (parametric `hours` arg) | §6 API Spec |
| G8 — Mesh query POST not linkable | Changed to `GET /api/readings/mesh` with bbox as query params; bbox serialised into `/query` URL `searchParams` | §5 Screen 4, §6 API Spec |
| G9 — Zustand missing filter fields | `minQualityScore`, `selectedSensorType`, `timeRangeHours` added to store definition | §3 State Management |
| G10 — Result truncation at 200 not surfaced | `summary.truncated: boolean` added to mesh response; amber banner specified in Screen 4 | §5 Screen 4, §6 API Spec |
| G11 — No device deletion endpoint | `DELETE /api/device/[entityKey]` added using `walletClient.deleteEntity()` | §6 API Spec |

**One remaining product decision:** The nonce store uses an in-memory `Map` (sufficient for hackathon single-instance deployment). If scaling to multiple Vercel instances, replace with Redis or Vercel KV (free tier available) to share nonce state across instances.

---

## 11. Doc Audit Resolutions (v1.2.0)

All 13 issues identified against the full Arkiv documentation package have been patched into this blueprint:

| ID | Issue | Severity | Resolution | Where Applied |
|---|---|---|---|---|
| C1 | `expiresIn: null` not valid — SDK requires positive integer | Critical | Replaced with `ExpirationTime.fromDays(3650)` (~10 years) on SensorDevice, CalibrationRecord | §4 Entity Schema, §6 `/api/calibration/add` |
| C2 | Live Events is HTTP polling not WebSocket — `wss://` URL doesn't exist | Critical | Replaced with `subscribeEntityEvents(handlers, 5000)` polling pattern + correct usage example | §5 Screen 1, §7 Phase 5, Coverage Map |
| C3 | `mutateEntities()` returns `result.createdEntities[]` array, not `{ entityKey }` | Critical | Single `createEntity()` keeps `{ entityKey, txHash }`; batch path documented with correct `result.createdEntities[index]` shape | §6 Reading Endpoints |
| C4 | `useArkivWalletClient()` hook from Arkiv React docs not referenced | Critical | Full hook implementation added using `transport: custom(wagmiWalletClient.transport)` | §3 Auth Flow, §7 Phase 0 |
| C5 | `@tanstack/react-query` missing — Arkiv docs explicitly require it for React data fetching | Critical | Added to tech stack, pnpm install, Phase 0 setup steps, `QueryClientProvider` wrapper | §2, §7 Phase 0 |
| H1 | `.createdBy(CREATOR_WALLET_ADDRESS)` missing — PROJECT_ATTRIBUTE alone insufficient per best practices §12 | High | `CREATOR_WALLET_ADDRESS` added to `lib/arkiv.ts`; `.createdBy()` chained on all server-written entity queries | §4 lib/arkiv.ts, §6 API Spec (3 endpoints), §5 Screen 4 mesh query |
| H2 | `GET /api/readings/latest` used 50 parallel queries — best practices §4 warns against loops | High | Replaced with single query + client-side grouping by `device_key` | §6 Reading Endpoints |
| H3 | `desc` import missing from mesh query code — `desc is not defined` at runtime | High | `import { eq, gt, lt, gte, lte, desc } from "@arkiv-network/sdk/query"` added to code sample | §5 Screen 4 |
| H4 | Glob `~` operator not in TypeScript SDK | High | Note added warning team; eq()-only filtering confirmed for all string attributes | §4 Entity 2 note |
| H5 | Long-TTL entities (10yr) cost significantly more GLM — not flagged | High | GLM cost scaling note added to SensorDevice entity section | §4 Entity 1 |
| L1 | `entity.toText()` method not mentioned | Low | Note added; confirmed all MeshOwn entities use `toJson()` | §4 Entity 2 |
| L2 | `fromBlock` replay parameter not documented | Low | Comment added in live events code sample | §5 Screen 1 |
| L3 | MetaMask chain registration fallback not documented | Low | `wallet_addEthereumChain` params documented as RainbowKit fallback | §7 Phase 2 |
