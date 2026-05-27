# MeshOwn

**Own your sensor data.** A DePIN sensor data platform built on [Arkiv](https://arkiv.network) where device owners — not platforms — own their telemetry. Sensor readings are stored on Arkiv's tamper-proof, queryable Layer 3 DB-Chain. Researchers query a geographic mesh of sensor data across multiple independent owners in a single on-chain query — something architecturally impossible with any centralised API.

---

## Project Vision

DePIN sensor data today flows into centralised cloud silos (AWS IoT, Azure IoT Hub). Data quality verification is a black-box algorithm run on someone else's server. Researchers must call N different vendor APIs and merge results themselves.

MeshOwn puts every reading, its quality attestation, and its calibration lineage on a public, queryable, tamper-proof ledger — owned by the humans who deployed the sensors.

### Key Features

- **Interactive Coverage Map** — Leaflet map with real-time device markers and pulsing anomaly alerts
- **Bounding Box Mesh Query** — Draw a rectangle on the map, set quality thresholds, query across multiple independent sensor owners in one on-chain call
- **Sensor Detail Pages** — Time-series charts (Recharts), readings table, calibration lineage tracking
- **Owner Dashboard** — Register devices, submit readings, add calibrations, manage your sensor fleet
- **AI Anomaly Detection** — Automated 3σ statistical scan writes `AnomalyAlert` entities to Arkiv every 2 hours via Vercel Cron
- **Alert Feed** — Filterable feed of anomaly alerts with severity levels, baseline vs. observed values, and confidence scores
- **Wallet-Based Auth** — No JWT, no sessions. `personal_sign` nonce verification (G4 flow)
- **Owner/Creator Split** — Immutable `$creator` (agent wallet) vs. transferable `$owner` (device owner) attribution on every entity

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Blockchain data layer | `@arkiv-network/sdk` | 0.6.8 |
| Chain | Arkiv Braga testnet | Chain ID `60138453102` |
| Frontend framework | Next.js (App Router) | 16.2.6 |
| Wallet connection | wagmi + RainbowKit | 3.6.15 / 2.2.11 |
| Ethereum primitives | viem | 2.50.4 |
| Map rendering | Leaflet + react-leaflet | 1.9.4 / 5.0.0 |
| Map drawing | leaflet-draw | 1.0.4 |
| Charts | Recharts | 3.8.1 |
| Styling | Tailwind CSS | 4.x |
| State management | Zustand | 5.0.13 |
| Schema validation | Zod | 4.x |
| Hosting | Vercel (free tier) | — |
| Package manager | pnpm | — |

**Why no traditional database:** All persistent state lives on Arkiv. The only client-side state is UI ephemera (selected sensor, map viewport, wallet address) managed in Zustand.

---

## Architecture

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
│  /api/reading/submit    │    │    rpcUrl: braga RPC             │
│  /api/agent/scan        │    │  })                              │
│  (hold server wallet)   │    └──────────────────────────────────┘
└──────────┬──────────────┘
           │ walletClient.createEntity()
           ▼
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

### Entity Types

| Entity | TTL | Key Attributes |
|---|---|---|
| `SensorDevice` | 10 years | name, sensor_type, lat, lng, status, manufacturer |
| `Reading` | 30 days | value, unit, quality_score, device_key, timestamp |
| `CalibrationRecord` | 10 years | device_key, offset_value, calibration_method, valid_from, valid_until |
| `AnomalyAlert` | 90 days | device_key, severity, confidence, baseline_value, observed_value |

### API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/health` | Health check with live block number |
| `GET` | `/api/stats` | Entity counts by type |
| `GET` | `/api/auth/nonce` | Generate wallet auth nonce |
| `POST` | `/api/device/register` | Register a new sensor device |
| `GET` | `/api/devices` | List devices (optional bbox, owner, sensor_type filters) |
| `GET` | `/api/device/[entityKey]` | Get single device |
| `PUT` | `/api/device/[entityKey]` | Update device (owner-only) |
| `DELETE` | `/api/device/[entityKey]` | Delete device (owner-only) |
| `POST` | `/api/reading/submit` | Submit a sensor reading |
| `GET` | `/api/readings` | List readings for a device |
| `GET` | `/api/readings/latest` | Latest reading per device |
| `GET` | `/api/readings/mesh` | Bounding-box mesh query (flagship) |
| `POST` | `/api/calibration/add` | Add calibration record |
| `GET` | `/api/calibrations` | List calibrations for a device |
| `GET` | `/api/alerts` | List anomaly alerts |
| `GET` | `/api/alerts/recent` | Recent alerts (last N hours) |
| `POST` | `/api/agent/scan` | AI anomaly scan (cron-triggered) |

---

## Setup

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 8
- **MetaMask** browser extension (or any EIP-1193 wallet)
- **Arkiv Braga testnet** wallet with GLM tokens for gas

### 1. Clone & Install

```bash
git clone <your-repo-url> meshown
cd meshown
pnpm install
```

### 2. Configure Environment Variables

Copy the example and fill in your values:

```bash
cp .env.local.example .env.local
```

Or create `.env.local` manually with the following variables:

```bash
# ── Arkiv Braga Testnet (Public — safe for browser) ──────
NEXT_PUBLIC_CHAIN_ID=60138453102
NEXT_PUBLIC_RPC_URL=https://braga.hoodi.arkiv.network/rpc

# ── WalletConnect (required for RainbowKit) ─────────────
# Get a project ID at https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# ── Server-side only (NO NEXT_PUBLIC_ prefix) ────────────
# Agent wallet private key — used by API routes for write ops.
# Generate: cast wallet new  (from Foundry) or use MetaMask export.
# ⚠️  NEVER expose this to the browser.
AGENT_PRIVATE_KEY=0x_your_agent_private_key

# Agent wallet address — derived from AGENT_PRIVATE_KEY.
# Used for .createdBy() attribution on agent-written entities.
# Must match the address derived from AGENT_PRIVATE_KEY above.
AGENT_WALLET_ADDRESS=0x_your_agent_wallet_address

# Cron secret — protects the /api/agent/scan endpoint.
# Generate: openssl rand -hex 32
CRON_SECRET=your_random_secret_here
```

### 3. Fund the Agent Wallet

> **⚠️ Critical step — the app will not write entities to Arkiv without this.**

Fund your `AGENT_WALLET_ADDRESS` with GLM tokens using the **Braga Faucet**:

🔗 **[https://braga.hoodi.arkiv.network/faucet](https://braga.hoodi.arkiv.network/faucet)**

1. Open the faucet link in your browser
2. Paste your `AGENT_WALLET_ADDRESS` (the one from `.env.local`)
3. Request GLM tokens
4. Verify the balance arrived (the health endpoint will show connectivity)

The agent wallet pays gas for `createEntity()`, `changeOwnership()`, `updateEntity()`, and `deleteEntity()` calls on behalf of the platform.

### 4. Verify Connection

```bash
npx tsx scripts/check-connection.ts
```

This queries the Arkiv Braga RPC and verifies the agent wallet has funds.

---

## Running Locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Pages

| Route | Description |
|---|---|
| `/` | Interactive map with device markers, anomaly alerts, sidebar controls |
| `/query` | Mesh query results table with CSV export |
| `/sensor/[entityKey]` | Sensor detail — charts, readings, calibration lineage |
| `/dashboard` | Owner dashboard — device list, register/submit/calibrate actions |
| `/alerts` | Alert feed with severity and sensor type filters |

### Seed Data

To populate the testnet with sample data for demo purposes:

```bash
npx tsx scripts/integration-test.ts
```

This registers 3 simulated devices, submits 10 readings each (30 total), and adds 1 calibration record.

---

## Deployment

### Vercel

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard (same as `.env.local`)
4. Deploy — Vercel auto-detects Next.js

### Vercel Cron

The [`vercel.json`](vercel.json) configures a cron job to run `/api/agent/scan` every 2 hours. This triggers the AI anomaly detection agent automatically. On Vercel Hobby plan, this uses 12 of the daily cron invocations.

---

## Project Structure

```
meshown/
├── src/
│   ├── app/
│   │   ├── api/                  # 17 API routes
│   │   │   ├── agent/scan/       # AI anomaly scan (cron)
│   │   │   ├── alerts/           # Alert CRUD + recent
│   │   │   ├── auth/nonce/       # Wallet auth nonce
│   │   │   ├── calibration/add/  # Add calibration
│   │   │   ├── calibrations/     # List calibrations
│   │   │   ├── device/           # Register, CRUD by entityKey
│   │   │   ├── devices/          # List devices
│   │   │   ├── health/           # Health check
│   │   │   ├── reading/submit/   # Submit reading
│   │   │   ├── readings/         # List, latest, mesh query
│   │   │   └── stats/            # Entity counts
│   │   ├── alerts/               # Alert feed page
│   │   ├── dashboard/            # Owner dashboard page
│   │   ├── query/                # Mesh query results page
│   │   ├── sensor/[entityKey]/   # Sensor detail page
│   │   ├── globals.css           # Tailwind + anomaly pulse animation
│   │   ├── layout.tsx            # Root layout with Providers
│   │   ├── page.tsx              # Map page (home)
│   │   └── providers.tsx         # wagmi, RainbowKit, TanStack Query
│   ├── components/               # 15 React components
│   ├── config/
│   │   └── wagmi.ts              # Chain config + RainbowKit setup
│   └── lib/
│       ├── arkiv.ts              # Arkiv SDK client singletons
│       ├── auth.ts               # Wallet signature verification
│       ├── nonce-store.ts        # In-memory nonce TTL store
│       ├── quality-score.ts      # 3σ quality score algorithm
│       ├── schemas.ts            # Zod validation schemas
│       ├── store.ts              # Zustand client state
│       ├── useArkivWalletClient.ts  # Browser Arkiv wallet hook
│       └── useWalletAuth.ts      # G4 auth flow hook
├── scripts/
│   ├── check-connection.ts       # Arkiv connectivity verifier
│   └── integration-test.ts       # Seed data + integration tests
├── memory-bank/                  # Blueprint + implementation plan
├── vercel.json                   # Vercel Cron config
└── package.json
```

---

## License

MIT
