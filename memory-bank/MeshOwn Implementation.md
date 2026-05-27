# MeshOwn — Implementation Plan

## Table of Contents
1. [Project Overview](#project-overview)
2. [Blueprint Coverage Verification](#blueprint-coverage-verification)
3. [Enhanced Testing Philosophy](#enhanced-testing-philosophy)
4. [Milestone 0: Foundation & Validation](#milestone-0-foundation--validation)
5. [Milestone 1: Core Entity Layer](#milestone-1-core-entity-layer)
6. [Milestone 2: Map UI & Mesh Query](#milestone-2-map-ui--mesh-query)
7. [Milestone 3: Sensor Detail & Owner Dashboard](#milestone-3-sensor-detail--owner-dashboard)
8. [Milestone 4: AI Agent, Alerts & Live Events](#milestone-4-ai-agent-alerts--live-events)
9. [Milestone Final: Deployment & Demo](#milestone-final-deployment--demo)
10. [Appendix A: Testing Strategy](#appendix-a-testing-strategy)
11. [Appendix B: Error Handling Protocol](#appendix-b-error-handling-protocol)
12. [Appendix C: Progress Tracking System](#appendix-c-progress-tracking-system)
13. [Appendix D: Deployment Checklist](#appendix-d-deployment-checklist)
14. [Appendix E: Communication Templates](#appendix-e-communication-templates)
15. [Appendix F: Git Workflow & Commit Standards](#appendix-f-git-workflow--commit-standards)
16. [Quick Reference Cards](#quick-reference-cards)

---

## Project Overview
**MeshOwn** is a DePIN sensor data platform where device owners — not platforms — own their telemetry. Sensor readings are stored on Arkiv's tamper-proof, queryable Layer 3 DB-Chain. Researchers and applications query a geographic mesh of sensor data across multiple independent owners in a single on-chain query. Data has transparent provenance, calibration lineage, and quality scores, all on-chain and auditable by anyone.

**Network:** Arkiv Braga Testnet (Chain ID: `60138453102`)
**Version:** 1.2.0

---

## Blueprint Coverage Verification

| Blueprint Element | Type | Assigned Milestone | Status |
|---|---|---|---|
| `PROJECT_ATTRIBUTE` config (`lib/arkiv.ts`) | Schema | M0 | Covered |
| Braga chain config, faucet | Infra | M0 | Covered |
| `AGENT_PRIVATE_KEY` env var | Infra | M0 | Covered |
| `CRON_SECRET` env var | Infra | M0 | Covered |
| `leaflet-draw@1.0.4` + `@types/leaflet-draw@1.0.13` | Infra | M0 | Covered |
| `@rainbow-me/rainbowkit@2.2.11` | Infra | M0 | Covered |
| `SensorDevice` entity + attributes | Schema | M1 | Covered |
| `Reading` entity + denormalised lat/lng | Schema | M1 | Covered |
| `CalibrationRecord` entity | Schema | M1 | Covered |
| `AnomalyAlert` entity | Schema | M4 | Covered |
| `lat`/`lng` as numeric attributes | Constraint | M1 | Covered |
| `expiresIn` in seconds | Constraint | M1 | Covered |
| `updateEntity` full-replace semantics | Constraint | M1 | Covered |
| Denormalised lat/lng on Reading + AnomalyAlert | Schema | M1 | Covered |
| QualityScoreService | Service | M1 | Covered |
| `GET /api/devices` | Endpoint | M1 | Covered |
| `GET /api/device/[key]` | Endpoint | M1 | Covered |
| `POST /api/device/register` | Endpoint | M1 | Covered |
| `PUT /api/device/[key]` | Endpoint | M3 | Covered |
| `DELETE /api/device/[key]` | Endpoint | M3 | Covered |
| `POST /api/reading/submit` | Endpoint | M1 | Covered |
| `GET /api/readings` | Endpoint | M1 | Covered |
| `GET /api/readings/mesh` | Endpoint | M2 | Covered |
| `GET /api/readings/latest` | Endpoint | M2 | Covered |
| `GET /api/calibrations` | Endpoint | M1 | Covered |
| `POST /api/calibration/add` | Endpoint | M1 | Covered |
| `GET /api/alerts` | Endpoint | M4 | Covered |
| `GET /api/alerts/recent` | Endpoint | M2 | Covered |
| `POST /api/agent/scan` | Endpoint | M4 | Covered |
| `GET /api/auth/nonce` | Endpoint | M1 | Covered |
| `GET /api/health` | Endpoint | M-final | Covered |
| `GET /api/stats` | Endpoint | M-final | Covered |
| Wallet `personal_sign` nonce verification | Constraint | M1 | Covered |
| Leaflet SSR fix — `next/dynamic ssr:false` | Constraint | M2 | Covered |
| Vercel Cron `0 */2 * * *` schedule | Infra | M4 | Covered |
| cron-job.org fallback for 5-min demo scanning | Infra | M4 | Covered |
| `GET /api/readings/mesh` linkable via searchParams | Constraint | M2 | Covered |
| Query truncation banner at 200 results | Feature | M2 | Covered |
| Zustand: `minQualityScore`, `selectedSensorType`, `timeRangeHours` | State | M2 | Covered |
| RainbowKit `<ConnectButton />` in root layout | Component | M0 | Covered |
| CSV export — column spec | Feature | M2 | Covered |
| MeshMap screen | Screen | M2 | Covered |
| Sensor Detail screen | Screen | M3 | Covered |
| Owner Dashboard screen | Screen | M3 | Covered |
| Mesh Query Results screen | Screen | M2 | Covered |
| Alert Feed screen | Screen | M4 | Covered |
| `$owner` / `$creator` split on AnomalyAlert | Constraint | M4 | Covered |
| `CREATOR_WALLET_ADDRESS` in `lib/arkiv.ts` + `.createdBy()` | Constraint | M1 | Covered |
| `@tanstack/react-query` — `QueryClientProvider` | Infra | M0 | Covered |
| `useArkivWalletClient()` hook | Component | M-final | Covered |
| `expiresIn: ExpirationTime.fromDays(3650)` for permanent entities | Constraint | M1 | Covered |
| `subscribeEntityEvents()` polling — NOT WebSocket | Constraint | M4 | Covered |
| `result.createdEntities[]` shape for `mutateEntities()` | Constraint | M1 | Covered |
| `desc` import from `@arkiv-network/sdk/query` | Constraint | M2 | Covered |
| Glob `~` operator unavailable in TS SDK | Constraint | M1 | Covered |
| GLM cost scales with expiration TTL | Constraint | M1 | Covered |
| `AGENT_WALLET_ADDRESS` env var for `.createdBy()` | Infra | M0 | Covered |
| `.createdBy()` for trusted agent queries | Constraint | M4 | Covered |
| Private key server-side only | Constraint | M0 | Covered |
| Live Events WebSocket | Feature | M4 | Covered |
| README + demo video | Deliverable | M-final | Covered |

---

## Enhanced Testing Philosophy

To ensure architectural integrity and strict adherence to the Arkiv DB-Chain paradigm, testing for MeshOwn diverges from traditional database-backed applications:

1.  **Arkiv Explorer Verification**: Because all persistent state lives on-chain, the ultimate source of truth for integration testing is the Arkiv Braga Testnet Explorer (`https://explorer.braga.hoodi.arkiv.network`). A passing test must verify entity creation, ownership splits, and attribute values directly on the explorer.
2.  **No Local Database Mocking**: There is no local database. Mocking Arkiv SDK calls is acceptable for isolated unit tests (e.g., Quality Score math), but E2E and Integration tests must execute real transactions against the Braga Testnet to prove SDK compatibility.
3.  **Ownership Split Validation**: Critical architecture decisions (like the `$creator`/`$owner` split on AnomalyAlerts) require explicit verification steps in manual testing protocols to prevent on-chain provenance bugs.
4.  **GLM Cost Awareness**: Tests creating entities must be aware of the GLM cost scaling with TTL (Constraint H5). Test scripts should use funded wallets and avoid creating unnecessary long-lived entities in tight loops.

---

## Milestone 0: Foundation & Validation

## STEP 1: GENERATE MILESTONE OVERVIEW TABLE

| Milestone | Name | Duration | % of Total | Priority | Testing Checkpoints |
|-----------|------|----------|------------|----------|-------------------|
| M0 | Foundation & Validation | 1 Day | 12.5% | Critical | Docker up, DB migrations, API health |
| M1 | Core Entity Layer | 1.5 Days | 18.75% | High | Zod validation, Entity creation, Ownership transfer |
| M2 | Map UI & Mesh Query | 1.5 Days | 18.75% | High | Leaflet renders, BBox draw, Mesh query linkability |
| M3 | Sensor Detail & Owner Dashboard | 1.5 Days | 18.75% | High | Calibration logic, Owner filtering, CRUD operations |
| M4 | AI Agent, Alerts & Live Events | 1 Day | 12.5% | Medium | Anomaly detection, Alert entity split, Polling events |
| M-final | Deployment & Demo | 1.5 Days | 18.75% | Critical | E2E flow, seed data, submission |
| **TOTAL** | | **8 Days** | **100%** | | |

*(Note: "Docker up, DB migrations" in M0 Testing Checkpoints is templated; as per the blueprint, there is no traditional database, so this translates to Arkiv client connection and entity schema verification).*

---

## STEP 2: GENERATE MILESTONE 0 IN FULL DETAIL

─────────────────────────────────────────────────────────────
### Step M.0.1: Scaffold Next.js App & Install Dependencies
**Duration**: 30 minutes
**Objective**: Initialize the Next.js project and install all exact library versions required by the tech stack.
**Risk**: Low - Version mismatches could cause runtime errors later.
**Prerequisites**: Node.js and pnpm installed globally.
**Testing Type**: Manual

#### Blueprint Binding (MANDATORY)
- **Schema used**: None
- **Agent spec**: None
- **Endpoints built**: None
- **External services**: None
- **UI components**: None
- **Constraints applied**: Private key server-side only (implied by Next.js App Router selection)
- **Blueprint section**: Section 2 (Validated Tech Stack), Section 7 (Phase 0)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
Scaffold the Next.js application and install the specified dependencies.

**Key Files/Modules:**
1. `package.json` - Project dependencies with exact versions
2. `next.config.ts` - [GAP: standard Next.js config, specific MeshOwn modifications not detailed in blueprint beyond App Router usage]

**Implementation Approach:**
- Use `pnpm create next-app` with TypeScript, Tailwind, and App Router flags.
- Install core dependencies and dev dependencies using exact versions from Extraction 2.

#### Build Instructions (Atomic Steps)
1. Run `pnpm create next-app meshown --typescript --tailwind --app`
2. Run `pnpm add @arkiv-network/sdk@0.6.8 wagmi@3.6.15 viem@2.50.4 zustand@5.0.13 recharts@3.8.1 leaflet@1.9.4 react-leaflet@5.0.0 leaflet-draw@1.0.4 @rainbow-me/rainbowkit@2.2.11 zod @tanstack/react-query`
3. Run `pnpm add -D @types/leaflet @types/leaflet-draw@1.0.13`

#### Testing Protocol (MANDATORY)
ALL of these must pass before proceeding:

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
pnpm install
# Expected: No dependency resolution errors
```

**Phase 3: Manual Verification**
1. Open `package.json` → Verify all specified versions match Extraction 2 exactly.

#### Deliverables Checklist
- [ ] Next.js app scaffolded with App Router
- [ ] `package.json` updated with exact dependency versions from blueprint
- [ ] Installation completes without errors

#### Definition of Done
✅ Code compiles without errors
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(init): scaffold next-app and install dependencies`

#### Common Issues & Solutions
**Issue**: `leaflet-draw` type definitions not found.
**Solution**: Ensure `@types/leaflet-draw@1.0.13` is installed as a dev dependency.

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M.0.1 - Scaffold Next.js App & Install Dependencies
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 2, 7
- Exact versions: @arkiv-network/sdk@0.6.8, wagmi@3.6.15, viem@2.50.4, zustand@5.0.13, recharts@3.8.1, leaflet@1.9.4, react-leaflet@5.0.0, leaflet-draw@1.0.4, @rainbow-me/rainbowkit@2.2.11, zod, @tanstack/react-query, @types/leaflet, @types/leaflet-draw@1.0.13

BUILD INSTRUCTIONS:
1. pnpm create next-app meshown --typescript --tailwind --app
2. pnpm add @arkiv-network/sdk@0.6.8 wagmi@3.6.15 viem@2.50.4 zustand@5.0.13 recharts@3.8.1 leaflet@1.9.4 react-leaflet@5.0.0 leaflet-draw@1.0.4 @rainbow-me/rainbowkit@2.2.11 zod @tanstack/react-query
3. pnpm add -D @types/leaflet @types/leaflet-draw@1.0.13

TESTING PROTOCOL:
1. pnpm install → Expected: successful installation, no peer dependency errors

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M.0.1: Scaffold Next.js App & Install Dependencies - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Tech Stack (Extraction 2), Phase 0 Infra
**Tests**: Unit ✅ N/A | Integration ✅ N/A
**Issues**: [any + resolution]
**Next Step**: Step M.0.2
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M.0.2: Configure Environment Variables & Chain Constants
**Duration**: 15 minutes
**Objective**: Create the local environment file and expose necessary chain constants for Arkiv Braga Testnet.
**Risk**: High - Exposing private key to browser or misconfiguring chain ID breaks core architecture.
**Prerequisites**: Step M.0.1 complete.
**Testing Type**: Manual

#### Blueprint Binding (MANDATORY)
- **Schema used**: None
- **Agent spec**: None
- **Endpoints built**: None
- **External services**: Arkiv Braga RPC (Chain ID: 60138453102)
- **UI components**: None
- **Constraints applied**: Private key server-side only, AGENT_WALLET_ADDRESS for `.createdBy()`
- **Blueprint section**: Section 2 (Chain), Section 3 (Auth Flow), Section 7 (Phase 0), Section 8 (Dependencies), Section 11 (H1)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
Create `.env.local` with server-only and public variables.

**Key Files/Modules:**
1. `.env.local` - Environment variables
2. `.gitignore` - Ensure `.env.local` is ignored

**Implementation Approach:**
- Add AGENT_PRIVATE_KEY with `NEXT_PUBLIC_` omitted to ensure server-side only.
- Add NEXT_PUBLIC_CHAIN_ID and NEXT_PUBLIC_RPC_URL for browser client configuration.
- Add CRON_SECRET and AGENT_WALLET_ADDRESS.

#### Build Instructions (Atomic Steps)
1. Create `.env.local` in project root.
2. Add variables exactly as specified in Extraction 7 and 8.
3. Verify `.env.local` is in `.gitignore` (Next.js default includes it).

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
N/A
```

**Phase 3: Manual Verification**
1. Inspect `.env.local` → Contains `AGENT_PRIVATE_KEY` (no `NEXT_PUBLIC_` prefix).
2. Inspect `.env.local` → Contains `NEXT_PUBLIC_CHAIN_ID=60138453102`.
3. Inspect `.env.local` → Contains `NEXT_PUBLIC_RPC_URL=https://braga.hoodi.arkiv.network/rpc`.
4. Inspect `.env.local` → Contains `CRON_SECRET`.
5. Inspect `.env.local` → Contains `AGENT_WALLET_ADDRESS`.

#### Deliverables Checklist
- [ ] `.env.local` created with exact variables from blueprint
- [ ] Private key NOT exposed with NEXT_PUBLIC_ prefix

#### Definition of Done
✅ Code compiles without errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(config): add environment variables and chain constants`

#### Common Issues & Solutions
**Issue**: Next.js requires server restart to pick up `.env.local` changes.
**Solution**: Restart the dev server after modifying environment variables.

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M.0.2 - Configure Environment Variables & Chain Constants
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 2, 3, 7, 8, 11
- Exact values: Chain ID 60138453102, RPC https://braga.hoodi.arkiv.network/rpc

BUILD INSTRUCTIONS:
1. Create .env.local
2. Add:
   AGENT_PRIVATE_KEY=0x...
   NEXT_PUBLIC_CHAIN_ID=60138453102
   NEXT_PUBLIC_RPC_URL=https://braga.hoodi.arkiv.network/rpc
   CRON_SECRET=...
   AGENT_WALLET_ADDRESS=0x...

TESTING PROTOCOL:
1. Verify AGENT_PRIVATE_KEY lacks NEXT_PUBLIC_ prefix.

DEFINITION OF DONE:
- [ ] .env.local created with correct variables
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M.0.2: Configure Environment Variables & Chain Constants - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Infra (Braga, Keys, Cron)
**Tests**: Unit ✅ N/A | Integration ✅ N/A
**Issues**: [any + resolution]
**Next Step**: Step M.0.3
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M.0.3: Initialize Arkiv Client & Core Config
**Duration**: 45 minutes
**Objective**: Create the Arkiv public and wallet clients, define the `PROJECT_ATTRIBUTE`, and `CREATOR_WALLET_ADDRESS` constants.
**Risk**: High - Incorrect client setup or missing `CREATOR_WALLET_ADDRESS` will cause all data layer queries to fail later.
**Prerequisites**: Step M.0.2 complete.
**Testing Type**: Integration

#### Blueprint Binding (MANDATORY)
- **Schema used**: `PROJECT_ATTRIBUTE` config
- **Agent spec**: Server-side `WalletClient` using `AGENT_PRIVATE_KEY`
- **Endpoints built**: None
- **External services**: Arkiv Braga RPC
- **UI components**: None
- **Constraints applied**: `CREATOR_WALLET_ADDRESS` in `lib/arkiv.ts` + `.createdBy()` on queries, Private key server-side only, `viem` used for `privateKeyToAccount`
- **Blueprint section**: Section 3 (Data Flow, Auth Flow), Section 4 (PROJECT_ATTRIBUTE), Section 8 (Dependencies), Section 9 (Coverage Map), Section 11 (H1, H3)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
Create `lib/arkiv.ts` containing shared Arkiv configuration and client initialization.

**Key Files/Modules:**
1. `lib/arkiv.ts` - Arkiv clients, PROJECT_ATTRIBUTE, CREATOR_WALLET_ADDRESS
2. `lib/arkiv.test.ts` - [GAP: specific test framework setup not defined in blueprint; standard vitest/jest assumed if testing] -> *Will use standard Next.js compatible testing for manual verification via API route in next step, or simple script.*

**Implementation Approach:**
- Import `createPublicClient`, `createWalletClient`, `buildQuery`, `createEntity`, `updateEntity` from `@arkiv-network/sdk`.
- Import `privateKeyToAccount` from `viem/accounts`.
- Define `PROJECT_ATTRIBUTE` exactly as specified in Extraction 4.
- Define `CREATOR_WALLET_ADDRESS` from `process.env.AGENT_WALLET_ADDRESS`.
- Initialize `publicClient` with Braga chain config.
- Initialize server-side `walletClient` using `AGENT_PRIVATE_KEY`.

#### Build Instructions (Atomic Steps)
1. Create `lib/arkiv.ts`.
2. Define and export `PROJECT_ATTRIBUTE` object: `{ key: "project", value: "meshown-v1" }`.
3. Define and export `CREATOR_WALLET_ADDRESS` string from env var.
4. Define Braga chain object for SDK: `{ id: 60138453102, name: "Arkiv Braga Testnet", nativeCurrency: { name: "Golem", symbol: "GLM", decimals: 18 }, rpcUrls: { default: { http: ["https://braga.hoodi.arkiv.network/rpc"] } } }` [GAP: Exact formatting of nativeCurrency for Arkiv SDK `createPublicClient` is inferred from standard viem/wagmi chain definitions and L3 fallback details, as Extraction 2 only provides raw values].
5. Create and export `publicClient` using `createPublicClient({ chain, transport: http() })`. [GAP: `http` import location assumed from `@arkiv-network/sdk` or `viem` based on standard web3 patterns].
6. Create and export `walletClient` using `privateKeyToAccount` for the server-side wallet.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
pnpm run build
# Expected: Build succeeds with no type errors related to lib/arkiv.ts
```

**Phase 3: Manual Verification**
1. Inspect `lib/arkiv.ts` → Verify `PROJECT_ATTRIBUTE` matches `{ key: "project", value: "meshown-v1" }` exactly.
2. Inspect `lib/arkiv.ts` → Verify `AGENT_PRIVATE_KEY` is not exported to client-accessible code.

#### Deliverables Checklist
- [ ] `lib/arkiv.ts` created
- [ ] `PROJECT_ATTRIBUTE` matches Extraction 4 verbatim
- [ ] `CREATOR_WALLET_ADDRESS` defined
- [ ] Server-side `walletClient` initialized with `AGENT_PRIVATE_KEY`

#### Definition of Done
✅ Code compiles without errors
✅ Integration tests pass
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(core): initialize arkiv clients and project constants`

#### Common Issues & Solutions
**Issue**: `viem` `privateKeyToAccount` requires `0x` prefix on private key.
**Solution**: Ensure `AGENT_PRIVATE_KEY` in `.env.local` starts with `0x`.

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M.0.3 - Initialize Arkiv Client & Core Config
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 3, 4, 8, 9, 11
- Exact schema: PROJECT_ATTRIBUTE = { key: "project", value: "meshown-v1" }
- Exact versions: viem@2.50.4, @arkiv-network/sdk@0.6.8

BUILD INSTRUCTIONS:
1. Create lib/arkiv.ts.
2. Define PROJECT_ATTRIBUTE exactly as { key: "project", value: "meshown-v1" }.
3. Define CREATOR_WALLET_ADDRESS = process.env.AGENT_WALLET_ADDRESS.
4. Define Braga chain config: id 60138453102, RPC https://braga.hoodi.arkiv.network/rpc, nativeCurrency GLM.
5. Initialize publicClient via createPublicClient.
6. Initialize server walletClient via privateKeyToAccount from viem/accounts.

TESTING PROTOCOL:
1. pnpm run build → Expected: success

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M.0.3: Initialize Arkiv Client & Core Config - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Schema (PROJECT_ATTRIBUTE), Infra (CREATOR_WALLET_ADDRESS), Constraint (Private key server-side only)
**Tests**: Unit ✅ N/A | Integration ✅ 1/1
**Issues**: [any + resolution]
**Next Step**: Step M.0.4
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M.0.4: Fund Agent Wallet & Verify Arkiv Connection
**Duration**: 30 minutes
**Objective**: Fund the server-side agent wallet using the Braga faucet and verify that the `publicClient` can query the Arkiv testnet.
**Risk**: Medium - Faucet could be rate-limited or down; RPC could be unreachable.
**Prerequisites**: Step M.0.3 complete, Agent Wallet Address generated/available.
**Testing Type**: Manual

#### Blueprint Binding (MANDATORY)
- **Schema used**: None
- **Agent spec**: None
- **Endpoints built**: None
- **External services**: Arkiv Braga Faucet, Arkiv Braga RPC
- **UI components**: None
- **Constraints applied**: None
- **Blueprint section**: Section 7 (Phase 0), Section 8 (Dependencies)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
A temporary script or API route to execute the health check query from Extraction 7. Update the `.env.local` with the funded wallet's private key/address if not already done.

**Key Files/Modules:**
1. `scripts/check-connection.ts` - [GAP: Script location not defined, using standard convention] Temporary script to test connection.

**Implementation Approach:**
- Navigate to `https://braga.hoodi.arkiv.network/faucet` and paste the `AGENT_WALLET_ADDRESS`.
- Create a simple script using `publicClient.buildQuery()` to verify the connection.

#### Build Instructions (Atomic Steps)
1. Go to `https://braga.hoodi.arkiv.network/faucet`. Paste the agent wallet address. Submit.
2. Create `scripts/check-connection.ts`.
3. Import `publicClient` and `PROJECT_ATTRIBUTE` from `lib/arkiv.ts`. Import `eq` from `@arkiv-network/sdk/query`.
4. Execute: `await publicClient.buildQuery().where(eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value)).limit(1).fetch()`.
5. Run the script using `tsx` or `ts-node`.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
npx tsx scripts/check-connection.ts
# Expected: Query returns successfully (empty array or entities, no RPC connection error)
```

**Phase 3: Manual Verification**
1. Check Arkiv Explorer (`https://explorer.braga.hoodi.arkiv.network`) → Agent wallet shows GLM balance.

#### Deliverables Checklist
- [ ] Agent wallet funded via faucet
- [ ] `check-connection.ts` executes successfully
- [ ] `publicClient` successfully queries Arkiv Braga testnet

#### Definition of Done
✅ Code compiles without errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(infra): add connection check script and verify wallet funding`

#### Common Issues & Solutions
**Issue**: Faucet does not dispense GLM immediately.
**Solution**: Wait 1-2 minutes and check explorer. If still unfunded, use Discord fallback mentioned in Extraction 8.

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M.0.4 - Fund Agent Wallet & Verify Arkiv Connection
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 7, 8
- Exact versions: @arkiv-network/sdk@0.6.8

BUILD INSTRUCTIONS:
1. Fund wallet at https://braga.hoodi.arkiv.network/faucet
2. Create scripts/check-connection.ts.
3. Import publicClient, PROJECT_ATTRIBUTE from lib/arkiv.ts.
4. Import eq from @arkiv-network/sdk/query.
5. Run: publicClient.buildQuery().where(eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value)).limit(1).fetch()
6. Execute script.

TESTING PROTOCOL:
1. Script execution → Expected: no errors, returns array.

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M.0.4: Fund Agent Wallet & Verify Arkiv Connection - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Infra (Braga chain config, faucet)
**Tests**: Unit ✅ N/A | Integration ✅ 1/1
**Issues**: [any + resolution]
**Next Step**: Step M.0.5
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M.0.5: Setup App Providers (Wagmi, RainbowKit, TanStack Query)
**Duration**: 45 minutes
**Objective**: Wrap the Next.js root layout with the necessary client-side providers (`WagmiProvider`, `RainbowKitProvider`, `QueryClientProvider`) and configure the Arkiv Braga chain.
**Risk**: Medium - Incorrect provider nesting or missing chain config in Wagmi will break wallet connections.
**Prerequisites**: Step M.0.1 complete.
**Testing Type**: Manual

#### Blueprint Binding (MANDATORY)
- **Schema used**: None
- **Agent spec**: None
- **Endpoints built**: None
- **External services**: None
- **UI components**: Root Layout, RainbowKit `<ConnectButton />` reference
- **Constraints applied**: `@tanstack/react-query` required for Arkiv React data fetching, RainbowKit config for Braga chain.
- **Blueprint section**: Section 2 (Tech Stack), Section 5 (Screen 1), Section 7 (Phase 2 - RainbowKit config), Section 10 (C4, C5), Section 11 (L3)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
Configure wagmi, RainbowKit, and TanStack Query providers in the root layout.

**Key Files/Modules:**
1. `app/providers.tsx` - [GAP: filename assumed standard pattern] Client component exporting provider wrappers.
2. `app/layout.tsx` - Root layout importing providers.
3. `wagmi.config.ts` - [GAP: filename assumed] Wagmi configuration including Braga chain.

**Implementation Approach:**
- Define Braga chain for Wagmi config using details from Extraction 11 (L3).
- Create a `Providers` component that wraps children with `WagmiProvider`, `RainbowKitProvider`, and `QueryClientProvider`.
- Integrate `Providers` into `app/layout.tsx`.

#### Build Instructions (Atomic Steps)
1. Create `wagmi.config.ts`. Define chain: `id: 60138453102`, `name: 'Arkiv Braga Testnet'`, `nativeCurrency: { name: 'Golem', symbol: 'GLM', decimals: 18 }`, `rpcUrls: { default: { http: ['https://braga.hoodi.arkiv.network/rpc'] } }`.
2. Create `app/providers.tsx` as a Client Component (`"use client"`).
3. Import `WagmiProvider`, `RainbowKitProvider`, `QueryClientProvider`, `QueryClient`.
4. Setup `config` for wagmi using `getDefaultWallets` or standard RainbowKit config pattern with the defined Braga chain. [GAP: specific RainbowKit v2.2.11 `config` instantiation pattern inferred from standard library docs, blueprint just says "RainbowKitProvider + wagmi WagmiProvider in root layout"].
5. Wrap children in `app/providers.tsx`.
6. Modify `app/layout.tsx` to wrap `{children}` with `<Providers>`.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
pnpm run dev
# Expected: Dev server starts without hydration or provider errors.
```

**Phase 3: Manual Verification**
1. Open browser `http://localhost:3000` → Page loads without crashing.
2. [GAP: Cannot fully test ConnectButton until UI is built, but verify no console errors regarding missing providers].

#### Deliverables Checklist
- [ ] `app/providers.tsx` created with `WagmiProvider`, `RainbowKitProvider`, `QueryClientProvider`
- [ ] `app/layout.tsx` updated to use Providers
- [ ] Braga chain configuration defined for Wagmi

#### Definition of Done
✅ Code compiles without errors
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(ui): setup wagmi, rainbowkit, and tanstack query providers`

#### Common Issues & Solutions
**Issue**: Hydration mismatch errors due to Wagmi client-side state.
**Solution**: Ensure `Providers` component is marked `"use client"` and dynamically loaded if necessary, or use standard Next.js App Router wagmi setup patterns.

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M.0.5 - Setup App Providers (Wagmi, RainbowKit, TanStack Query)
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 2, 5, 7, 10, 11
- Exact versions: wagmi@3.6.15, @rainbow-me/rainbowkit@2.2.11, @tanstack/react-query
- Exact chain details (from L3): id 60138453102, name Arkiv Braga Testnet, nativeCurrency Golem/GLM/18, RPC https://braga.hoodi.arkiv.network/rpc

BUILD INSTRUCTIONS:
1. Create wagmi config with Braga chain.
2. Create app/providers.tsx ("use client").
3. Wrap children with WagmiProvider, RainbowKitProvider, QueryClientProvider.
4. Update app/layout.tsx to use Providers.

TESTING PROTOCOL:
1. pnpm run dev → Expected: successful load, no provider errors in console.

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M.0.5: Setup App Providers (Wagmi, RainbowKit, TanStack Query) - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Infra (TanStack, RainbowKit), Component (ConnectButton prep)
**Tests**: Unit ✅ N/A | Integration ✅ N/A
**Issues**: [any + resolution]
**Next Step**: Step M.0.6
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M.0.6: Initialize Git & Push Repository
**Duration**: 15 minutes
**Objective**: Initialize the local git repository and push the initial foundation to a public GitHub repository.
**Risk**: Low - Standard git operations.
**Prerequisites**: Step M.0.1-M.0.5 complete. GitHub account.
**Testing Type**: Manual

#### Blueprint Binding (MANDATORY)
- **Schema used**: None
- **Agent spec**: None
- **Endpoints built**: None
- **External services**: GitHub
- **UI components**: None
- **Constraints applied**: None
- **Blueprint section**: Section 7 (Phase 0)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
Public GitHub repository containing the MeshOwn M0 foundation.

**Key Files/Modules:**
1. `.gitignore` - Ensure `.env.local` and `node_modules` are ignored.

**Implementation Approach:**
- Initialize git, commit all M0 files, and push to a newly created public GitHub repo.

#### Build Instructions (Atomic Steps)
1. `git init`
2. `git add .`
3. `git commit -m "feat(init): milestone 0 foundation and validation"`
4. Create repo on GitHub named `meshown`.
5. `git remote add origin [repo-url]`
6. `git push -u origin main`

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
N/A
```

**Phase 3: Manual Verification**
1. Open GitHub URL → Verify repo is public and code is present.
2. Search repo for `AGENT_PRIVATE_KEY` → Verify no secrets are committed.

#### Deliverables Checklist
- [ ] Git repository initialized
- [ ] Code pushed to public GitHub repository
- [ ] `.env.local` is NOT in commit history

#### Definition of Done
✅ Code compiles without errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(init): milestone 0 foundation and validation`

#### Common Issues & Solutions
**Issue**: Accidentally committed `.env.local`.
**Solution**: Remove from history using `git filter-branch` or BFG Repo Cleaner before pushing.

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M.0.6 - Initialize Git & Push Repository
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 7

BUILD INSTRUCTIONS:
1. git init
2. git add .
3. git commit -m "feat(init): milestone 0 foundation and validation"
4. Create public GitHub repo 'meshown'
5. git remote add origin <url>
6. git push -u origin main

TESTING PROTOCOL:
1. Verify repo is public and contains code.
2. Verify .env.local is not in repo.

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M.0.6: Initialize Git & Push Repository - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Phase 0 Checkpoint
**Tests**: Unit ✅ N/A | Integration ✅ N/A
**Issues**: [any + resolution]
**Next Step**: Step M1.1
```
─────────────────────────────────────────────────────────────

---

## Milestone 1: Core Entity Layer

## STEP 2: GENERATE MILESTONE 1 IN FULL DETAIL

─────────────────────────────────────────────────────────────
### Step M1.1: Define Zod Schemas & Auth Nonce Endpoint
**Duration**: 45 minutes
**Objective**: Create Zod validation schemas for all entity payloads and implement the `GET /api/auth/nonce` endpoint required for wallet signature verification.
**Risk**: Medium - Incorrect nonce TTL or Map implementation could lock users out or allow replay attacks.
**Prerequisites**: Milestone 0 complete.
**Testing Type**: Integration

#### Blueprint Binding (MANDATORY)
- **Schema used**: SensorDevice Payload, Reading Payload, CalibrationRecord Payload (Extraction 4)
- **Agent spec**: None
- **Endpoints built**: `GET /api/auth/nonce`
- **External services**: None
- **UI components**: None
- **Constraints applied**: Wallet `personal_sign` nonce verification (G4), Zod validation
- **Blueprint section**: Section 4 (Arkiv Entity Schema), Section 6 (Utility Endpoints, Auth Flow), Section 10 (G4)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
Zod schemas for the three entity payloads created in this milestone, and the server-side nonce generation endpoint using an in-memory Map.

**Key Files/Modules:**
1. `lib/schemas.ts` - Zod schema definitions
2. `app/api/auth/nonce/route.ts` - Next.js API route for nonce generation
3. `lib/nonce-store.ts` - In-memory Map utility for nonces [GAP: exact file structure for store not defined, inferred standard pattern]

**Implementation Approach:**
- Define Zod objects matching the exact JSON payloads from Extraction 4.
- Implement `GET /api/auth/nonce` to accept an `address` query param, generate a UUID nonce, store it with a 5-minute TTL (`Date.now() + 300_000`), and return it.

#### Build Instructions (Atomic Steps)
1. Create `lib/schemas.ts`. Define and export `SensorDevicePayloadSchema`, `ReadingPayloadSchema`, `CalibrationRecordPayloadSchema` matching Extraction 4 exactly (e.g., `SensorDevicePayloadSchema` has `name`, `description`, `manufacturer`, `firmwareVersion`).
2. Create `lib/nonce-store.ts`. Export an in-memory `Map<string, { nonce: string, expires: number }>` and helper functions `setNonce(address, nonce)` and `getNonce(address)`.
3. Create `app/api/auth/nonce/route.ts`.
4. Implement `GET` handler: extract `address` from `searchParams`, generate UUID nonce using `crypto.randomUUID()`, store via `setNonce`, return `{ nonce: "uuid-..." }`.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
pnpm run build
# Expected: Build succeeds
curl http://localhost:3000/api/auth/nonce?address=0x123
# Expected: { "nonce": "<uuid-string>" }
```

**Phase 3: Manual Verification**
1. Call endpoint twice with the same address → Second call returns a new nonce (overwrites old).
2. Verify `nonce-store.ts` implements the 300,000ms (5 min) TTL logic.

#### Deliverables Checklist
- [ ] `lib/schemas.ts` created with 3 exact payload schemas
- [ ] `app/api/auth/nonce/route.ts` returns UUID nonce
- [ ] In-memory Map stores nonce with 5-minute TTL

#### Definition of Done
✅ Code compiles without errors
✅ Integration tests pass
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(api): add zod schemas and auth nonce endpoint`

#### Common Issues & Solutions
**Issue**: `crypto.randomUUID()` not available in non-secure contexts or older Node versions.
**Solution**: Ensure Node version is >= 19 (standard for Next.js 16) or use `uuid` package. [GAP: Blueprint doesn't specify Node version, assuming modern LTS].

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M1.1 - Define Zod Schemas & Auth Nonce Endpoint
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 4, 6, 10
- Exact schema: SensorDevice (name, description, manufacturer, firmwareVersion), Reading (value, unit, quality_score, calibration_key, raw), CalibrationRecord (offset_value, offset_unit, calibration_method, notes)
- Constraint G4: personal_sign nonce pattern, UUID nonce, 5m TTL

BUILD INSTRUCTIONS:
1. Create lib/schemas.ts with Zod schemas for the 3 payloads.
2. Create lib/nonce-store.ts with in-memory Map and TTL logic (Date.now() + 300_000).
3. Create app/api/auth/nonce/route.ts returning { nonce: crypto.randomUUID() }.

TESTING PROTOCOL:
1. pnpm run build → Expected: success
2. curl /api/auth/nonce?address=0x... → Expected: JSON with nonce

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M1.1: Define Zod Schemas & Auth Nonce Endpoint - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Schema (Entities), Endpoint (Auth Nonce), Constraint (G4)
**Tests**: Unit ✅ N/A | Integration ✅ 1/1
**Issues**: [any + resolution]
**Next Step**: Step M1.2
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M1.2: Implement Auth Verification Utility
**Duration**: 30 minutes
**Objective**: Create a server-side utility function to verify the wallet-signed nonce for POST endpoints.
**Risk**: High - Failure to verify signatures securely compromises all write endpoints.
**Prerequisites**: Step M1.1 complete.
**Testing Type**: Unit

#### Blueprint Binding (MANDATORY)
- **Schema used**: None
- **Agent spec**: None
- **Endpoints built**: None
- **External services**: None
- **UI components**: None
- **Constraints applied**: Wallet `personal_sign` nonce verification (G4), `viem.verifyMessage`
- **Blueprint section**: Section 3 (Auth Flow point 4), Section 10 (G4)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
A helper function that takes `(address, nonce, signature)`, verifies the signature using `viem`, and consumes the nonce.

**Key Files/Modules:**
1. `lib/auth.ts` - Verification utility

**Implementation Approach:**
- Use `viem.verifyMessage({ address, message: nonce, signature })`.
- Check nonce existence and expiration in the `nonce-store`.
- Delete nonce upon successful verification (one-time use).

#### Build Instructions (Atomic Steps)
1. Create `lib/auth.ts`.
2. Import `verifyMessage` from `viem`.
3. Import `getNonce` from `lib/nonce-store`.
4. Export async `verifyWalletAuth(address, nonce, signature)`.
5. Retrieve nonce from store; if missing or expired, throw Error.
6. Call `verifyMessage`; if false, throw Error.
7. Delete nonce from store (consume).
8. Return `true`.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
# Test verifyWalletAuth with mock data (requires test framework setup)
# Expected: Valid mock signature passes, expired/invalid fails. [GAP: Mocking viem verifyMessage requires test config]
```

**Phase 2: Local Integration**
```bash
pnpm run build
# Expected: No type errors in lib/auth.ts
```

**Phase 3: Manual Verification**
1. Inspect `lib/auth.ts` → Confirm `viem.verifyMessage` is called exactly as per Extraction 3 (`address`, `message: nonce`, `signature`).
2. Confirm nonce is deleted after use.

#### Deliverables Checklist
- [ ] `lib/auth.ts` created with `verifyWalletAuth`
- [ ] Nonce expiration check implemented
- [ ] Nonce consumption (deletion) implemented

#### Definition of Done
✅ Code compiles without errors
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(auth): implement wallet signature verification utility`

#### Common Issues & Solutions
**Issue**: `viem.verifyMessage` throws on invalid address checksum.
**Solution**: Ensure address passed from client is correctly checksummed, or handle viem errors gracefully.

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M1.2 - Implement Auth Verification Utility
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 3, 10
- Constraint G4: viem.verifyMessage({ address, message: nonce, signature })

BUILD INSTRUCTIONS:
1. Create lib/auth.ts.
2. Implement verifyWalletAuth(address, nonce, signature).
3. Validate nonce existence and expiry from nonce-store.
4. Call viem.verifyMessage.
5. Delete nonce on success.

TESTING PROTOCOL:
1. pnpm run build → Expected: success

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M1.2: Implement Auth Verification Utility - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Constraint (G4 Wallet Auth)
**Tests**: Unit ✅ N/A | Integration ✅ 1/1
**Issues**: [any + resolution]
**Next Step**: Step M1.3
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M1.3: Implement Device Registration Endpoint
**Duration**: 60 minutes
**Objective**: Create the `POST /api/device/register` endpoint to create `SensorDevice` entities on Arkiv and transfer ownership.
**Risk**: High - Requires server-side wallet signing and ownership transfer; high GLM cost if TTL is set wrong.
**Prerequisites**: Step M1.2 complete.
**Testing Type**: Integration

#### Blueprint Binding (MANDATORY)
- **Schema used**: `SensorDevice` entity + attributes (Extraction 4)
- **Agent spec**: Server-side `WalletClient`
- **Endpoints built**: `POST /api/device/register`
- **External services**: Arkiv Braga RPC
- **UI components**: None
- **Constraints applied**: `.createdBy()`, `expiresIn: ExpirationTime.fromDays(3650)`, `lat`/`lng` numeric, Private key server-side only, `changeOwnership()` pattern, GLM cost scales with TTL (H5)
- **Blueprint section**: Section 4 (Entity 1), Section 6 (Device Endpoints), Section 11 (C1, H1, H5)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
Next.js API Route that validates the payload, creates the entity using the server wallet, and transfers ownership to the user's wallet.

**Key Files/Modules:**
1. `app/api/device/register/route.ts` - API endpoint

**Implementation Approach:**
- Extract `address`, `nonce`, `signature`, and payload from request.
- Verify auth via `verifyWalletAuth`.
- Validate payload via `SensorDevicePayloadSchema`.
- Map payload and request fields to Arkiv attributes (ensuring `lat`/`lng` are numbers).
- Call `walletClient.createEntity` with `expiresIn: ExpirationTime.fromDays(3650)`.
- Call `walletClient.changeOwnership({ entityKey, newOwner: ownerAddress })`.
- Return `{ entityKey, txHash }`.

#### Build Instructions (Atomic Steps)
1. Create `app/api/device/register/route.ts`.
2. Implement `POST` handler.
3. Verify `ownerAddress` matches signed `address` via `verifyWalletAuth`.
4. Validate body against `SensorDevicePayloadSchema` (picking `name`, `description`, `manufacturer`, `firmwareVersion`).
5. Extract `sensor_type`, `lat`, `lng` from body.
6. Construct attributes object: `project`, `entityType: "sensor_device"`, `sensor_type`, `lat` (number), `lng` (number), `status: "active"`, `registered_at: Date.now()` (number).
7. Call `walletClient.createEntity({ payload, attributes, expiresIn: ExpirationTime.fromDays(3650) })`. [GAP: Exact signature of `createEntity` inferred from standard SDK patterns and context].
8. Call `walletClient.changeOwnership({ entityKey: result.entityKey, newOwner: ownerAddress })`. [GAP: Exact signature inferred].
9. Return `{ entityKey: result.entityKey, txHash: result.txHash }`. [GAP: Exact return shape of `createEntity` assumed to have entityKey/txHash based on Phase 1 description].

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
curl -X POST http://localhost:3000/api/device/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","description":"Test","manufacturer":"DIY","firmwareVersion":"1.0","sensor_type":"air_quality","lat":48.85,"lng":2.35,"ownerAddress":"0x...","nonce":"...","signature":"..."}'
# Expected: { "entityKey": "0x...", "txHash": "0x..." }
```

**Phase 3: Manual Verification**
1. Check Arkiv Explorer → Entity created with type `sensor_device`.
2. Verify Entity owner is `ownerAddress`, not the Agent wallet.

#### Deliverables Checklist
- [ ] `app/api/device/register/route.ts` created
- [ ] Auth verification applied
- [ ] Zod validation applied
- [ ] `expiresIn: ExpirationTime.fromDays(3650)` used
- [ ] `changeOwnership` called

#### Definition of Done
✅ Code compiles without errors
✅ Integration tests pass
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(api): implement device registration endpoint`

#### Common Issues & Solutions
**Issue**: `createEntity` fails due to insufficient GLM.
**Solution**: Verify Agent wallet was funded in M0.4. Note H5 constraint (10yr TTL costs more GLM).

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M1.3 - Implement Device Registration Endpoint
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 4, 6, 11
- Exact schema: SensorDevice payload, numeric lat/lng, status "active", registered_at Date.now()
- Exact constraints: fromDays(3650), changeOwnership, G4 auth, H1 createdBy (implicitly via agent wallet), H5 GLM cost

BUILD INSTRUCTIONS:
1. Create app/api/device/register/route.ts.
2. Verify auth.
3. Validate via SensorDevicePayloadSchema.
4. Create entity with attributes: project, entityType sensor_device, sensor_type, lat, lng, status, registered_at. ExpiresIn fromDays(3650).
5. changeOwnership to ownerAddress.
6. Return entityKey, txHash.

TESTING PROTOCOL:
1. POST valid data → Expected: 200 OK with entityKey
2. Check Explorer for correct owner and 10yr TTL.

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M1.3: Implement Device Registration Endpoint - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Schema (SensorDevice), Endpoint (Register), Constraint (C1, H5)
**Tests**: Unit ✅ N/A | Integration ✅ 1/1
**Issues**: [any + resolution]
**Next Step**: Step M1.4
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M1.4: Implement Device Read Endpoints
**Duration**: 45 minutes
**Objective**: Implement `GET /api/devices` (list with optional bbox) and `GET /api/device/[entityKey]` (single fetch).
**Risk**: Low - Standard read operations.
**Prerequisites**: Step M1.3 complete.
**Testing Type**: Integration

#### Blueprint Binding (MANDATORY)
- **Schema used**: `SensorDevice` attributes
- **Agent spec**: None
- **Endpoints built**: `GET /api/devices`, `GET /api/device/[entityKey]`
- **External services**: Arkiv Braga RPC
- **UI components**: None
- **Constraints applied**: `.createdBy(CREATOR_WALLET_ADDRESS)` on queries (H1), `eq()` only for strings (H4), numeric attributes for lat/lng
- **Blueprint section**: Section 6 (Device Endpoints), Section 11 (H1, H4)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
API routes for fetching devices.

**Key Files/Modules:**
1. `app/api/devices/route.ts` - List endpoint
2. `app/api/device/[entityKey]/route.ts` - Detail endpoint

**Implementation Approach:**
- `GET /api/devices`: Use `publicClient.buildQuery()`. Filter by `PROJECT_ATTRIBUTE` and `entityType: "sensor_device"`. Add optional `gt`/`lt` for lat/lng bbox. Chain `.createdBy(CREATOR_WALLET_ADDRESS)`.
- `GET /api/device/[entityKey]`: Use `publicClient.getEntity(entityKey)` then `.toJson()`.

#### Build Instructions (Atomic Steps)
1. Create `app/api/devices/route.ts`.
2. Implement `GET` handler. Parse `lat_min`, `lat_max`, `lng_min`, `lng_max`, `sensor_type`, `limit` from searchParams.
3. Build query: `eq(PROJECT_ATTRIBUTE...)`, `eq("entityType", "sensor_device")`, optional numeric ranges for bbox, optional `eq("sensor_type", ...)`.
4. Chain `.createdBy(CREATOR_WALLET_ADDRESS)`.
5. Chain `.withPayload(true).withAttributes(true).withMetadata(true).limit(limit || 100).fetch()`.
6. Map results to response shape `{ devices: [...], total: ... }`. [GAP: `total` extraction method unspecified; if SDK doesn't return count, might require `.getEntityCount()` or length of array].
7. Create `app/api/device/[entityKey]/route.ts`.
8. Implement `GET` handler. Call `publicClient.getEntity(entityKey)`.
9. Return `entity.toJson()`.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
curl http://localhost:3000/api/devices
# Expected: { "devices": [array of created devices], "total": N }
curl http://localhost:3000/api/device/<entityKey>
# Expected: Full entity JSON
```

**Phase 3: Manual Verification**
1. Verify that devices created in M1.3 are returned.
2. Verify bbox filtering works: `?lat_min=48&lat_max=49&lng_min=2&lng_max=3`.

#### Deliverables Checklist
- [ ] `app/api/devices/route.ts` created with bbox filtering
- [ ] `app/api/device/[entityKey]/route.ts` created
- [ ] `.createdBy(CREATOR_WALLET_ADDRESS)` applied to list query

#### Definition of Done
✅ Code compiles without errors
✅ Integration tests pass
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(api): implement device read endpoints`

#### Common Issues & Solutions
**Issue**: SDK `fetch()` returns entities but no `total` count for the response.
**Solution**: Return `entities.length` as `total` for the MVP, or use a separate count query if SDK supports it efficiently. [GAP: Blueprint assumes `total: 42` in response but SDK pagination details aren't fully explicit].

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M1.4 - Implement Device Read Endpoints
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 6, 11
- Exact schema: SensorDevice attributes
- Constraint H1: createdBy(CREATOR_WALLET_ADDRESS) on queries
- Constraint H4: No glob ~ operator, use eq()

BUILD INSTRUCTIONS:
1. Create app/api/devices/route.ts.
2. Build query with PROJECT_ATTRIBUTE, entityType, optional bbox (gt/lt on numeric lat/lng), optional sensor_type.
3. Add .createdBy(CREATOR_WALLET_ADDRESS).
4. Return { devices, total }.
5. Create app/api/device/[entityKey]/route.ts.
6. Call getEntity and return toJson().

TESTING PROTOCOL:
1. GET /api/devices → Expected: list of devices
2. GET /api/device/[key] → Expected: single device JSON

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M1.4: Implement Device Read Endpoints - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Endpoint (GET devices, GET device), Constraint (H1, H4)
**Tests**: Unit ✅ N/A | Integration ✅ 1/1
**Issues**: [any + resolution]
**Next Step**: Step M1.5
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M1.5: Implement Quality Score Service
**Duration**: 45 minutes
**Objective**: Create the server-side algorithm that calculates the quality score (0-100) for a new reading based on neighbor deviations.
**Risk**: Medium - Incorrect bounding box or deviation math results in bad scores.
**Prerequisites**: Step M1.4 complete (requires `publicClient` query capability).
**Testing Type**: Unit

#### Blueprint Binding (MANDATORY)
- **Schema used**: `Reading` attributes (lat, lng, sensor_type, timestamp, value)
- **Agent spec**: None
- **Endpoints built**: None
- **External services**: Arkiv Braga RPC
- **UI components**: None
- **Constraints applied**: Numeric attributes for `gt`/`lt`, Quality Score Algorithm spec
- **Blueprint section**: Section 6 (Quality Score Algorithm)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
A standalone service function `computeQualityScore` that queries neighboring readings and computes the deviation.

**Key Files/Modules:**
1. `lib/quality-score.ts` - Service function

**Implementation Approach:**
- Implement exact algorithm from Extraction 6.
- Query neighbors within `radiusDeg = 0.05` and last 30 minutes.
- If neighbors < 2, return 75.
- Calculate mean, deviation, and score `Math.max(0, Math.round(100 - deviation * 200))`.

#### Build Instructions (Atomic Steps)
1. Create `lib/quality-score.ts`.
2. Export `async function computeQualityScore(newValue, lat, lng, sensor_type, radiusDeg = 0.05)`.
3. Query `publicClient.buildQuery()` with `PROJECT_ATTRIBUTE`, `entityType: "reading"`, `sensor_type`, numeric `lat`/`lng` ranges (+/- radiusDeg), and `timestamp` > 30 min ago.
4. Limit 20. Fetch with `.withPayload(true)`.
5. Extract `value` from `entity.toJson().value`.
6. If `values.length < 2`, return 75.
7. Compute mean and deviation: `Math.abs(newValue - mean) / (mean || 1)`.
8. Return score.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
# Test with mocked publicClient query
# Expected: deviation 0 -> score 100, deviation 0.5 -> score 0, < 2 neighbors -> 75
```

**Phase 2: Local Integration**
```bash
pnpm run build
# Expected: No type errors
```

**Phase 3: Manual Verification**
1. Inspect math logic → Matches Extraction 6 exactly.

#### Deliverables Checklist
- [ ] `lib/quality-score.ts` created
- [ ] Bounding box query logic matches spec
- [ ] Deviation math matches spec

#### Definition of Done
✅ Code compiles without errors
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(services): implement quality score algorithm`

#### Common Issues & Solutions
**Issue**: Deviation calculation division by zero if mean is 0.
**Solution**: Blueprint specifies `(mean || 1)`. Implement exactly as specified.

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M1.5 - Implement Quality Score Service
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 6
- Exact Algorithm: Query neighbors (radiusDeg 0.05, 30m, limit 20), default 75 if <2, score = max(0, round(100 - deviation * 200))

BUILD INSTRUCTIONS:
1. Create lib/quality-score.ts.
2. Implement computeQualityScore.
3. Query readings in bbox and time range.
4. Implement exact math formula.

TESTING PROTOCOL:
1. pnpm run build → Expected: success

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M1.5: Implement Quality Score Service - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Service (QualityScoreService)
**Tests**: Unit ✅ N/A | Integration ✅ 1/1
**Issues**: [any + resolution]
**Next Step**: Step M1.6
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M1.6: Implement Reading Submission Endpoint
**Duration**: 60 minutes
**Objective**: Create `POST /api/reading/submit` that fetches device data, calculates the quality score, creates a `Reading` entity, and transfers ownership.
**Risk**: High - Complex orchestration of multiple Arkiv calls; denormalization of lat/lng is critical for mesh queries.
**Prerequisites**: Step M1.5 complete.
**Testing Type**: Integration

#### Blueprint Binding (MANDATORY)
- **Schema used**: `Reading` entity + attributes, Denormalised lat/lng
- **Agent spec**: Server-side `WalletClient`
- **Endpoints built**: `POST /api/reading/submit`
- **External services**: Arkiv Braga RPC
- **UI components**: None
- **Constraints applied**: Wallet auth, `expiresIn: ExpirationTime.fromDays(30)`, `lat`/`lng` numeric, `changeOwnership()`
- **Blueprint section**: Section 4 (Entity 2), Section 6 (Reading Endpoints), Section 9 (Denormalised lat/lng)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
API route to submit a reading. Must fetch parent device to get lat/lng/sensor_type, fetch active calibration, compute quality score, create entity, and transfer ownership.

**Key Files/Modules:**
1. `app/api/reading/submit/route.ts` - API endpoint

**Implementation Approach:**
- Verify auth.
- Fetch device via `publicClient.getEntity(deviceKey)`. Extract `lat`, `lng`, `sensor_type`.
- Fetch active calibration: query where `device_key`, `valid_from <= now <= valid_until`. [GAP: exact query method for `valid_from <= now <= valid_until` using SDK operators inferred as `lte("valid_from", now)` and `gte("valid_until", now)`].
- Compute quality score via `computeQualityScore`.
- Create entity with denormalized data. Transfer ownership.

#### Build Instructions (Atomic Steps)
1. Create `app/api/reading/submit/route.ts`.
2. Verify auth.
3. Validate body via `ReadingPayloadSchema` (picking `value`, `unit`, `calibration_key`, `raw`).
4. Extract `deviceKey`, `ownerAddress` from body.
5. Fetch device entity. Extract `lat`, `lng`, `sensor_type` from attributes.
6. Fetch active `CalibrationRecord` using `buildQuery` with `device_key` and valid date ranges.
7. Compute `quality_score` via `computeQualityScore(value, lat, lng, sensor_type)`.
8. Construct payload and attributes: `project`, `entityType: "reading"`, `sensor_type`, `device_key`, `lat` (number), `lng` (number), `value` (number), `quality_score` (number), `timestamp` (number).
9. Call `walletClient.createEntity` with `expiresIn: ExpirationTime.fromDays(30)`.
10. Call `walletClient.changeOwnership`.
11. Return `{ entityKey, txHash, quality_score }`.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
curl -X POST http://localhost:3000/api/reading/submit \
  -d '{"deviceKey":"0x...", "value":23.4, "unit":"ug/m3", "ownerAddress":"0x...", "nonce":"...", "signature":"..."}'
# Expected: { "entityKey": "0x...", "quality_score": 87, "txHash": "0x..." }
```

**Phase 3: Manual Verification**
1. Check Arkiv Explorer → Reading entity has `lat` and `lng` matching its parent device.
2. Verify short TTL (30 days).

#### Deliverables Checklist
- [ ] `app/api/reading/submit/route.ts` created
- [ ] Denormalized `lat`/`lng` copied from parent device
- [ ] `computeQualityScore` integrated
- [ ] Active calibration query implemented

#### Definition of Done
✅ Code compiles without errors
✅ Integration tests pass
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(api): implement reading submission endpoint`

#### Common Issues & Solutions
**Issue**: `buildQuery` for active calibration fails if `valid_from`/`valid_until` are not indexed or numeric.
**Solution**: Blueprint specifies these must be numeric attributes. Ensure they are queried with `lte`/`gte`.

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M1.6 - Implement Reading Submission Endpoint
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 4, 6, 9
- Exact schema: Reading payload + attributes (denormalized lat/lng, numeric value/quality_score/timestamp)
- Exact constraints: expiresIn fromDays(30), changeOwnership, fetch active calibration, compute quality score

BUILD INSTRUCTIONS:
1. Create app/api/reading/submit/route.ts.
2. Verify auth.
3. Fetch parent device for lat/lng/sensor_type.
4. Fetch active calibration.
5. Compute quality score.
6. Create entity with denormalized attributes. ExpiresIn fromDays(30).
7. changeOwnership.
8. Return entityKey, txHash, quality_score.

TESTING PROTOCOL:
1. POST valid data → Expected: 200 OK with quality_score

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M1.6: Implement Reading Submission Endpoint - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Schema (Reading), Endpoint (Submit Reading), Constraint (Denormalization)
**Tests**: Unit ✅ N/A | Integration ✅ 1/1
**Issues**: [any + resolution]
**Next Step**: Step M1.7
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M1.7: Implement Reading & Calibration Endpoints
**Duration**: 60 minutes
**Objective**: Implement the remaining core read endpoints for readings and the POST endpoint for calibration records.
**Risk**: Medium - Calibration involves long TTL (`fromDays(3650)`) and ownership logic.
**Prerequisites**: Step M1.6 complete.
**Testing Type**: Integration

#### Blueprint Binding (MANDATORY)
- **Schema used**: `Reading` attributes, `CalibrationRecord` entity + attributes
- **Agent spec**: Server-side `WalletClient`
- **Endpoints built**: `GET /api/readings`, `POST /api/calibration/add`, `GET /api/calibrations`
- **External services**: Arkiv Braga RPC
- **UI components**: None
- **Constraints applied**: `.createdBy(CREATOR_WALLET_ADDRESS)`, `desc` import from query (H3), numeric attributes, `expiresIn: ExpirationTime.fromDays(3650)` for Calibration
- **Blueprint section**: Section 6 (Reading, Calibration Endpoints), Section 11 (H1, H3, C1)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
Three API routes for fetching readings and managing calibration records.

**Key Files/Modules:**
1. `app/api/readings/route.ts` - GET endpoint
2. `app/api/calibration/add/route.ts` - POST endpoint
3. `app/api/calibrations/route.ts` - GET endpoint

**Implementation Approach:**
- Implement queries using `buildQuery`, sorting with `desc("timestamp", "number")` and `desc("valid_from", "number")`.
- Enforce `.createdBy(CREATOR_WALLET_ADDRESS)` on all server queries per H1.
- Calibration add requires owner auth.

#### Build Instructions (Atomic Steps)
1. Create `app/api/readings/route.ts`. Parse `deviceKey`, `limit`, `since`. Build query with `PROJECT_ATTRIBUTE`, `entityType: "reading"`, `device_key`. Chain `.createdBy(CREATOR_WALLET_ADDRESS)`. Order by `desc("timestamp", "number")`. Return `{ readings: [...], hasMore: bool }`.
2. Create `app/api/calibration/add/route.ts`. Verify auth. Validate via `CalibrationRecordPayloadSchema`. Extract `deviceKey`, `valid_until_ms`. Construct attributes (`project`, `entityType: "calibration_record"`, `device_key`, `calibrated_by: ownerAddress`, `valid_from: Date.now()`, `valid_until: valid_until_ms`). Create entity with `fromDays(3650)`. Return `{ entityKey, txHash }`.
3. Create `app/api/calibrations/route.ts`. Parse `deviceKey`. Build query with `PROJECT_ATTRIBUTE`, `entityType: "calibration_record"`, `device_key`. Chain `.createdBy(CREATOR_WALLET_ADDRESS)`. Order by `desc("valid_from", "number")`. Return `{ calibrations: [...] }`.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
curl http://localhost:3000/api/readings?deviceKey=0x...
# Expected: { "readings": [...] }

curl -X POST http://localhost:3000/api/calibration/add \
  -d '{"deviceKey":"0x...", "offset_value":0.8, "offset_unit":"ug", "calibration_method":"ref", "notes":"ok", "valid_until_ms":1748336000000, "ownerAddress":"0x...", "nonce":"...", "signature":"..."}'
# Expected: { "entityKey": "0x...", "txHash": "0x..." }

curl http://localhost:3000/api/calibrations?deviceKey=0x...
# Expected: { "calibrations": [...] }
```

**Phase 3: Manual Verification**
1. Verify `GET /api/readings` returns data sorted by newest first.
2. Verify calibration created on Explorer has 10yr TTL.

#### Deliverables Checklist
- [ ] `app/api/readings/route.ts` created with `createdBy` and `desc`
- [ ] `app/api/calibration/add/route.ts` created with 10yr TTL
- [ ] `app/api/calibrations/route.ts` created with `createdBy` and `desc`

#### Definition of Done
✅ Code compiles without errors
✅ Integration tests pass
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(api): implement reading and calibration endpoints`

#### Common Issues & Solutions
**Issue**: `desc` is not defined error at runtime.
**Solution**: Ensure `desc` is imported from `@arkiv-network/sdk/query` as specified in H3.

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M1.7 - Implement Reading & Calibration Endpoints
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 6, 11
- Exact schema: CalibrationRecord payload + attributes, Reading query params
- Constraints: createdBy(CREATOR_WALLET_ADDRESS) on GETs, desc import from @arkiv-network/sdk/query, C1 fromDays(3650) for Calibration

BUILD INSTRUCTIONS:
1. Create app/api/readings/route.ts. Query readings by device_key, createdBy, orderBy desc timestamp.
2. Create app/api/calibration/add/route.ts. Auth user, create entity with 10yr TTL.
3. Create app/api/calibrations/route.ts. Query by device_key, createdBy, orderBy desc valid_from.

TESTING PROTOCOL:
1. curl GET endpoints → Expected: JSON arrays
2. curl POST calibration → Expected: entityKey, txHash

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M1.7: Implement Reading & Calibration Endpoints - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Endpoint (GET readings, POST/GET calibrations), Constraint (H1, H3, C1)
**Tests**: Unit ✅ N/A | Integration ✅ 1/1
**Issues**: [any + resolution]
**Next Step**: Step M1.8
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M1.8: Integration Testing & Arkiv Verification
**Duration**: 60 minutes
**Objective**: Perform the manual integration test specified in Phase 1 of the roadmap: Register 3 simulated devices, submit 10 readings each, and verify on Arkiv explorer.
**Risk**: Low - Standard verification.
**Prerequisites**: Step M1.7 complete.
**Testing Type**: Manual E2E

#### Blueprint Binding (MANDATORY)
- **Schema used**: All M1 entities
- **Agent spec**: None
- **Endpoints built**: All M1 endpoints
- **External services**: Arkiv Explorer
- **UI components**: None
- **Constraints applied**: None
- **Blueprint section**: Section 7 (Phase 1 checkpoint)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
No new code. Execute test scripts and verify state.

**Key Files/Modules:**
1. None

**Implementation Approach:**
- Use `curl` or a simple script to hit the local API routes.
- Verify the resulting entities on the Arkiv Explorer.

#### Build Instructions (Atomic Steps)
1. Hit `GET /api/auth/nonce` for test wallet.
2. Sign nonce locally [GAP: requires a script or tool to sign with test private key, e.g., viem script].
3. `POST /api/device/register` 3 times (different lat/lng).
4. `POST /api/reading/submit` 10 times per device (30 total).
5. `POST /api/calibration/add` for 1 device.
6. `GET /api/devices` → Verify 3 devices returned.
7. `GET /api/readings?deviceKey=...` → Verify 10 readings returned.
8. Open `https://explorer.braga.hoodi.arkiv.network` → Search for entities. Verify ownership and attributes.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
# Execute test sequence
# Expected: 200 OK on all requests, correct data returned on GETs
```

**Phase 3: Manual Verification**
1. Arkiv Explorer shows 3 SensorDevices, 30 Readings, 1 CalibrationRecord.
2. Ownership split is correct (Agent creator, Test wallet owner).

#### Deliverables Checklist
- [ ] 3 Devices registered successfully
- [ ] 30 Readings submitted successfully
- [ ] 1 Calibration added successfully
- [ ] State verified on Arkiv Explorer

#### Definition of Done
✅ Code compiles without errors
✅ Integration tests pass
✅ Blueprint binding verified (no invented details)
✅ Git commit: `test(m1): verify entity layer integration with arkiv explorer`

#### Common Issues & Solutions
**Issue**: Nonce signing script fails.
**Solution**: Create a temporary `scripts/sign-nonce.ts` using viem's `walletClient.signMessage` to assist with testing.

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M1.8 - Integration Testing & Arkiv Verification
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 7
- Checkpoint: Register 3 devices, 10 readings each, verify on explorer

BUILD INSTRUCTIONS:
1. Generate nonce and sign for test wallet.
2. POST 3 devices.
3. POST 30 readings.
4. POST 1 calibration.
5. Verify via GET endpoints and Arkiv Explorer.

TESTING PROTOCOL:
1. All POSTs return 200.
2. GETs return correct seeded data.
3. Explorer shows correct ownership.

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M1.8: Integration Testing & Arkiv Verification - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Roadmap Phase 1 Checkpoint
**Tests**: Unit ✅ N/A | Integration ✅ 1/1
**Issues**: [any + resolution]
**Next Step**: Step M2.1
```
─────────────────────────────────────────────────────────────

---

## Milestone 2: Map UI & Mesh Query

## STEP 2: GENERATE MILESTONE 2 IN FULL DETAIL

─────────────────────────────────────────────────────────────
### Step M2.1: Setup Zustand Map State & Sidebar UI
**Duration**: 45 minutes
**Objective**: Update the Zustand store with map-specific state variables and build the static Mesh Map sidebar layout with query controls and wallet connection.
**Risk**: Low - Standard UI and state setup.
**Prerequisites**: Milestone 1 complete.
**Testing Type**: Manual

#### Blueprint Binding (MANDATORY)
- **Schema used**: None
- **Agent spec**: None
- **Endpoints built**: None
- **External services**: None
- **UI components**: MeshMap screen (Screen 1), RainbowKit `<ConnectButton />`
- **Constraints applied**: Zustand: `minQualityScore`, `selectedSensorType`, `timeRangeHours` (G9)
- **Blueprint section**: Section 3 (State Management Strategy), Section 5 (Screen 1), Section 10 (G5, G9)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
Extend the Zustand store and create the floating left sidebar layout for the Mesh Map screen.

**Key Files/Modules:**
1. `lib/store.ts` - [GAP: filename assumed] Zustand store definition
2. `app/page.tsx` - Mesh Map screen container
3. `components/MapSidebar.tsx` - Sidebar client component with controls

**Implementation Approach:**
- Define Zustand state matching Extraction 3 exactly (`walletAddress`, `selectedSensorKey`, `boundingBox`, `meshQueryResults`, `isQuerying`, `minQualityScore`, `selectedSensorType`, `timeRangeHours`).
- Build the 320px floating sidebar UI with Tailwind.
- Integrate RainbowKit `<ConnectButton />` and filter controls (dropdown, slider, time range).

#### Build Instructions (Atomic Steps)
1. Create `lib/store.ts`. Define Zustand store with exact state variables from Extraction 3. `minQualityScore` defaults to 70, `selectedSensorType` to "all", `timeRangeHours` to 24.
2. Modify `app/page.tsx` to render a full-viewport layout.
3. Create `components/MapSidebar.tsx` as a Client Component.
4. Import and render `<ConnectButton />` from RainbowKit.
5. Add "Browse" / "Query" mode toggle state locally. [GAP: mode toggle state location not specified, local state is sufficient for UI].
6. Add `sensor_type` select, Quality score slider (0-100), Time range select (1h/6h/24h) bound to Zustand setters.
7. Render `MapSidebar` in `app/page.tsx`.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
pnpm run dev
# Expected: Sidebar renders with wallet button and controls. No hydration errors.
```

**Phase 3: Manual Verification**
1. Click "Connect Wallet" → MetaMask prompt appears.
2. Drag quality slider → Verify Zustand state updates in devtools (if configured).

#### Deliverables Checklist
- [ ] `lib/store.ts` created with all Extraction 3 variables
- [ ] `components/MapSidebar.tsx` created with filters and ConnectButton
- [ ] `app/page.tsx` updated with sidebar layout

#### Definition of Done
✅ Code compiles without errors
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(ui): add zustand map state and map sidebar layout`

#### Common Issues & Solutions
**Issue**: RainbowKit button throws error if providers are missing.
**Solution**: Ensure M0.5 provider setup is correctly wrapping the layout.

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M2.1 - Setup Zustand Map State & Sidebar UI
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 3, 5, 10
- Exact state: walletAddress, selectedSensorKey, boundingBox, meshQueryResults, isQuerying, minQualityScore (default 70), selectedSensorType (default "all"), timeRangeHours (default 24)
- UI Spec: 320px floating left sidebar, RainbowKit ConnectButton

BUILD INSTRUCTIONS:
1. Create lib/store.ts with exact Zustand state variables.
2. Create components/MapSidebar.tsx with ConnectButton and query controls.
3. Update app/page.tsx to render layout + sidebar.

TESTING PROTOCOL:
1. pnpm run dev → Expected: sidebar renders, wallet connects.

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M2.1: Setup Zustand Map State & Sidebar UI - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: State (Zustand G9), Component (ConnectButton), Screen (MeshMap partial)
**Tests**: Unit ✅ N/A | Integration ✅ N/A
**Issues**: [any + resolution]
**Next Step**: Step M2.2
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M2.2: Implement MeshMap Component with Leaflet SSR Fix
**Duration**: 60 minutes
**Objective**: Create the core `MeshMap` component rendering Leaflet with OpenStreetMap tiles and device markers, strictly using the `next/dynamic` SSR fix.
**Risk**: High - Leaflet relies on `window`; failing the SSR fix crashes the Next.js build.
**Prerequisites**: Step M2.1 complete.
**Testing Type**: Integration

#### Blueprint Binding (MANDATORY)
- **Schema used**: None
- **Agent spec**: None
- **Endpoints built**: None
- **External services**: OpenStreetMap tiles
- **UI components**: MeshMap screen, `SensorMarker`, `SensorPopup`
- **Constraints applied**: Leaflet SSR fix — `next/dynamic ssr:false` (G2)
- **Blueprint section**: Section 5 (Screen 1), Section 7 (Phase 2), Section 10 (G2)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
The `MeshMap` client component wrapped in `next/dynamic`, fetching devices and rendering them on the map.

**Key Files/Modules:**
1. `components/MeshMap.tsx` - Client-only map component
2. `app/page.tsx` - Updated to use dynamic import

**Implementation Approach:**
- Use `next/dynamic(() => import('@/components/MeshMap'), { ssr: false })`.
- Initialize Leaflet map inside `useEffect`.
- Fetch devices from `GET /api/devices` on mount.
- Render markers with popups showing device info.

#### Build Instructions (Atomic Steps)
1. Create `components/MeshMap.tsx`. Add `"use client"` directive.
2. Import `MapContainer`, `TileLayer`, `Marker`, `Popup` from `react-leaflet`.
3. Implement map component rendering `MapContainer` with OpenStreetMap `TileLayer` url `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`. [GAP: exact tile URL inferred from standard OSM usage, blueprint just says "OpenStreetMap tiles"].
4. Fetch `/api/devices` on mount using `@tanstack/react-query` or `useEffect`. [GAP: Extraction 10 C5 mandates react-query, but exact query hook setup isn't detailed; standard `useQuery` inferred].
5. Map device results to `<Marker position={[lat, lng]}><Popup>...</Popup></Marker>`.
6. In `app/page.tsx`, import MeshMap using `const DynamicMeshMap = dynamic(() => import('@/components/MeshMap'), { ssr: false })`.
7. Render `<DynamicMeshMap />` in the main content area next to the sidebar.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
pnpm run dev
# Expected: Map renders in browser without "window is not defined" error.
```

**Phase 3: Manual Verification**
1. Load page → Map tiles load.
2. Markers for devices seeded in M1 appear on map.
3. Click marker → Popup shows device name, status, etc.

#### Deliverables Checklist
- [ ] `components/MeshMap.tsx` created
- [ ] `next/dynamic` SSR fix applied in `app/page.tsx`
- [ ] Device markers and popups render correctly

#### Definition of Done
✅ Code compiles without errors
✅ Integration tests pass
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(ui): implement meshmap component with leaflet ssr fix`

#### Common Issues & Solutions
**Issue**: CSS missing or map tiles broken.
**Solution**: Import `leaflet/dist/leaflet.css` in `MeshMap.tsx` or layout. [GAP: standard Leaflet requirement not explicitly in blueprint, but necessary for rendering].

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M2.2 - Implement MeshMap Component with Leaflet SSR Fix
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 5, 7, 10
- Constraint G2: next/dynamic(() => import('./MeshMap'), { ssr: false })
- Tech: leaflet@1.9.4, react-leaflet@5.0.0

BUILD INSTRUCTIONS:
1. Create components/MeshMap.tsx ("use client").
2. Setup MapContainer and TileLayer.
3. Fetch /api/devices and render Markers/Popups.
4. Update app/page.tsx to use next/dynamic with ssr: false.

TESTING PROTOCOL:
1. pnpm run dev → Expected: Map renders, no SSR crash.

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M2.2: Implement MeshMap Component with Leaflet SSR Fix - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Screen (MeshMap), Constraint (G2 SSR fix)
**Tests**: Unit ✅ N/A | Integration ✅ 1/1
**Issues**: [any + resolution]
**Next Step**: Step M2.3
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M2.3: Implement Bounding Box Draw & Query Trigger
**Duration**: 45 minutes
**Objective**: Integrate `leaflet-draw` to allow researchers to draw a bounding box, save it to Zustand, and trigger navigation to the query results page.
**Risk**: Medium - `leaflet-draw` integration with React can be finicky; requires passing bounds to URL.
**Prerequisites**: Step M2.2 complete.
**Testing Type**: Manual

#### Blueprint Binding (MANDATORY)
- **Schema used**: None
- **Agent spec**: None
- **Endpoints built**: None
- **External services**: None
- **UI components**: `BoundingBoxLayer`
- **Constraints applied**: `leaflet-draw` rectangle tool, serialize bbox to `/query` searchParams (G8)
- **Blueprint section**: Section 5 (Screen 1 - Query mode, Screen 4 URL structure), Section 7 (Phase 2)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
Add `leaflet-draw` controls to the map in "Query" mode. On draw completion, update Zustand and enable the "Run Mesh Query" button which navigates to `/query`.

**Key Files/Modules:**
1. `components/MeshMap.tsx` - Updated with draw controls
2. `components/MapSidebar.tsx` - Updated with Run Query button

**Implementation Approach:**
- Use `react-leaflet`'s custom hook or `useMap` to integrate `leaflet-draw`.
- Listen for `draw:created` event to capture rectangle bounds.
- Store bounds in Zustand (`boundingBox: { sw, ne }`).
- Construct URL `/query?sw_lat=...&sw_lng=...&ne_lat=...&ne_lng=...&sensor_type=...&min_quality=...&hours=...`.
- Navigate using `next/navigation` `router.push()`.

#### Build Instructions (Atomic Steps)
1. In `MeshMap.tsx`, import `leaflet-draw`.
2. Create a `DrawControl` component using `useMap()` to add the rectangle draw handler. [GAP: exact react-leaflet v5 integration pattern for leaflet-draw not specified, standard useMap() effect inferred].
3. When a rectangle is drawn, dispatch bounds to Zustand `boundingBox` as `{ sw: LatLng, ne: LatLng }`.
4. In `MapSidebar.tsx`, check if `boundingBox` is set. If yes, enable "Run Mesh Query" button.
5. On "Run Mesh Query" click, construct the `/query` URL using the Zustand state variables (`boundingBox`, `selectedSensorType`, `minQualityScore`, `timeRangeHours`).
6. Use `useRouter().push(url)` to navigate.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
pnpm run dev
# Expected: Draw tool appears on map. Rectangle can be drawn.
```

**Phase 3: Manual Verification**
1. Switch to "Query" mode → Draw control appears.
2. Draw rectangle → Zustand updates, "Run Mesh Query" enables.
3. Click "Run Mesh Query" → Navigates to `/query?sw_lat=...` with correct parameters.

#### Deliverables Checklist
- [ ] `leaflet-draw` integrated
- [ ] Bounding box state saved to Zustand
- [ ] "Run Mesh Query" button constructs correct URL and navigates

#### Definition of Done
✅ Code compiles without errors
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(ui): implement bounding box draw and query trigger`

#### Common Issues & Solutions
**Issue**: `leaflet-draw` CSS/Icons missing or broken.
**Solution**: Import `leaflet-draw/dist/leaflet.draw.css` and fix icon paths or delete icon references if default images 404. [GAP: standard leaflet-draw gotcha, blueprint doesn't specify CSS imports].

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M2.3 - Implement Bounding Box Draw & Query Trigger
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 5, 7
- Constraint G8: Serialize bbox into /query URL searchParams
- Tech: leaflet-draw@1.0.4

BUILD INSTRUCTIONS:
1. Integrate leaflet-draw into MeshMap.tsx.
2. Update Zustand boundingBox on draw completion.
3. Add "Run Mesh Query" button in MapSidebar.
4. Construct /query URL with bbox, sensor_type, min_quality, hours.
5. Navigate using router.push.

TESTING PROTOCOL:
1. Draw bbox → Click Run Query → Expected: navigates to /query?sw_lat=...

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M2.3: Implement Bounding Box Draw & Query Trigger - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Component (BoundingBoxLayer), Constraint (G8 linkability)
**Tests**: Unit ✅ N/A | Integration ✅ N/A
**Issues**: [any + resolution]
**Next Step**: Step M2.4
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M2.4: Implement Latest Readings & Recent Alerts Endpoints
**Duration**: 45 minutes
**Objective**: Create the `GET /api/readings/latest` and `GET /api/alerts/recent` endpoints required for the MeshMap popups and markers.
**Risk**: Medium - `GET /api/readings/latest` requires the H2 resolution (single query + client-side grouping) instead of parallel loops.
**Prerequisites**: Milestone 1 complete.
**Testing Type**: Integration

#### Blueprint Binding (MANDATORY)
- **Schema used**: `Reading` attributes, `AnomalyAlert` attributes
- **Agent spec**: None
- **Endpoints built**: `GET /api/readings/latest`, `GET /api/alerts/recent`
- **External services**: Arkiv Braga RPC
- **UI components**: None
- **Constraints applied**: `.createdBy(CREATOR_WALLET_ADDRESS)`, single query + grouping (H2), `desc` import (H3), `eq` only strings (H4)
- **Blueprint section**: Section 6 (Reading, Alert Endpoints), Section 10 (G6, G7), Section 11 (H1, H2, H3, H4)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
Two API routes optimized for map rendering.

**Key Files/Modules:**
1. `app/api/readings/latest/route.ts` - Latest readings endpoint
2. `app/api/alerts/recent/route.ts` - Recent alerts endpoint

**Implementation Approach:**
- `GET /api/readings/latest`: Accept `deviceKeys` comma-separated string. Execute *one* `buildQuery` filtering by `PROJECT_ATTRIBUTE`, `entityType: "reading"`, and `device_key` (using `eq` or `in` if SDK supports, else fetch recent and group). *Wait, H2 says "Replaced with single query + client-side grouping by device_key". This implies querying the latest readings generally and grouping.* However, Section 6 G6 says "for each deviceKey... batched in parallel via Promise.all" which contradicts H2. **I will follow H2 resolution as it overrides G6**: Make a single query for readings matching the project, ordered by timestamp desc, limit high (e.g. 200), and group by `device_key` in code to find the latest per device.
- `GET /api/alerts/recent`: Query `anomaly_alert` entities from last `hours` (default 24). Chain `.createdBy()`.

#### Build Instructions (Atomic Steps)
1. Create `app/api/readings/latest/route.ts`.
2. Parse `deviceKeys` from searchParams. [GAP: If we do a single query, deviceKeys param might be ignored or used for filtering if SDK supports `in` clauses. Blueprint H2 just says "single query + client-side grouping by device_key". I will implement: fetch latest 200 readings, group by `device_key`, pick top 1 per key. If `deviceKeys` provided, filter results by that set before returning].
3. Build query: `eq(PROJECT_ATTRIBUTE...)`, `eq("entityType", "reading")`. Chain `.createdBy(CREATOR_WALLET_ADDRESS)`. Order by `desc("timestamp", "number")`. Limit 200. Fetch with payload/attributes.
4. Group `entities` by `device_key` attribute. Pick the first (latest) for each.
5. Return `{ latest: { [deviceKey]: Reading } }`.
6. Create `app/api/alerts/recent/route.ts`.
7. Parse `hours` (default 24), `limit` (default 50).
8. Build query: `eq(PROJECT_ATTRIBUTE...)`, `eq("entityType", "anomaly_alert")`, `gt("timestamp", Date.now() - hours*3600000)`. Chain `.createdBy(CREATOR_WALLET_ADDRESS)`. Order by `desc("timestamp", "number")`. Limit `limit`. Fetch.
9. Return `{ alerts: [...] }`.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
curl http://localhost:3000/api/readings/latest
# Expected: { "latest": { "0xdevice1": {...}, "0xdevice2": {...} } }

curl http://localhost:3000/api/alerts/recent
# Expected: { "alerts": [...] }
```

**Phase 3: Manual Verification**
1. Verify `readings/latest` returns only one reading per device.
2. Verify `alerts/recent` uses `.createdBy()`.

#### Deliverables Checklist
- [ ] `app/api/readings/latest/route.ts` created using H2 single query pattern
- [ ] `app/api/alerts/recent/route.ts` created with `.createdBy()`

#### Definition of Done
✅ Code compiles without errors
✅ Integration tests pass
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(api): implement latest readings and recent alerts endpoints`

#### Common Issues & Solutions
**Issue**: H2 resolution logic (client-side grouping) is inefficient if there are thousands of readings.
**Solution**: This is an accepted hackathon trade-off per H2 to avoid parallel loops which are warned against in SDK best practices §4.

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M2.4 - Implement Latest Readings & Recent Alerts Endpoints
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 6, 10, 11
- Constraints: H2 (single query + client-side grouping for /latest), H1 (.createdBy), H3 (desc import), G6/G7 (endpoint specs)

BUILD INSTRUCTIONS:
1. Create app/api/readings/latest/route.ts.
2. Implement H2 pattern: single buildQuery limit 200, orderBy desc timestamp, group by device_key in code.
3. Create app/api/alerts/recent/route.ts.
4. Implement query for anomaly_alert > timestamp, createdBy, orderBy desc timestamp.

TESTING PROTOCOL:
1. curl /api/readings/latest → Expected: map of deviceKey to latest reading
2. curl /api/alerts/recent → Expected: list of alerts

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M2.4: Implement Latest Readings & Recent Alerts Endpoints - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Endpoint (GET readings/latest, GET alerts/recent), Constraint (H2, H1, H3)
**Tests**: Unit ✅ N/A | Integration ✅ 1/1
**Issues**: [any + resolution]
**Next Step**: Step M2.5
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M2.5: Implement Mesh Query API Endpoint
**Duration**: 60 minutes
**Objective**: Create the flagship `GET /api/readings/mesh` endpoint that executes the bounding-box, multi-owner query.
**Risk**: High - The core value proposition of the app. Complex query building with numeric bounds.
**Prerequisites**: Step M2.4 complete.
**Testing Type**: Integration

#### Blueprint Binding (MANDATORY)
- **Schema used**: `Reading` attributes
- **Agent spec**: None
- **Endpoints built**: `GET /api/readings/mesh`
- **External services**: Arkiv Braga RPC
- **UI components**: None
- **Constraints applied**: Numeric attrs (`gt`/`lt`), `.createdBy(CREATOR_WALLET_ADDRESS)`, `desc` import, linkable GET (G8), truncation at 200 (G10)
- **Blueprint section**: Section 5 (Screen 4 code snippet), Section 6 (Mesh Query Endpoint), Section 10 (G8, G10), Section 11 (H1, H3, H4)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
API route that performs the geographic mesh query on Arkiv.

**Key Files/Modules:**
1. `app/api/readings/mesh/route.ts` - Mesh query endpoint

**Implementation Approach:**
- Parse `sw_lat`, `sw_lng`, `ne_lat`, `ne_lng`, `sensor_type`, `min_quality`, `hours` from searchParams.
- Construct the exact query shown in Extraction 5 (Screen 4 snippet).
- Implement `summary` calculation and `truncated` logic per G10.

#### Build Instructions (Atomic Steps)
1. Create `app/api/readings/mesh/route.ts`.
2. Implement `GET` handler. Parse params.
3. Import `eq, gt, lt, gte, desc` from `@arkiv-network/sdk/query` (H3).
4. Build query exactly as per Extraction 5 snippet: `.where([eq(PROJECT_ATTRIBUTE...), eq("entityType", "reading"), ...sensor_type, gt("lat", sw_lat), lt("lat", ne_lat), gt("lng", sw_lng), lt("lng", ne_lng), gte("quality_score", min_quality), gt("timestamp", Date.now() - hours * 3600000)])`.
5. Chain `.withPayload(true).withAttributes(true).withMetadata(true).orderBy(desc("timestamp", "number")).limit(200).fetch()`.
6. Compute `summary`: `count` (length), `unique_owners` (set of `$owner`), `avg_quality` (average of `quality_score` attributes).
7. Compute `truncated`: `result.entities.length === 200`.
8. Return `{ readings: entities, summary: { count, unique_owners, avg_quality, truncated } }`.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
curl "http://localhost:3000/api/readings/mesh?sw_lat=48.8&sw_lng=2.3&ne_lat=48.9&ne_lng=2.4&min_quality=0&hours=24"
# Expected: { "readings": [...], "summary": { "count": N, "unique_owners": M, "avg_quality": X, "truncated": false } }
```

**Phase 3: Manual Verification**
1. Verify query returns only readings within the bounding box.
2. Verify `truncated` is true if 200 results are returned.

#### Deliverables Checklist
- [ ] `app/api/readings/mesh/route.ts` created
- [ ] Query logic matches Extraction 5 snippet exactly
- [ ] `summary` object returned with `truncated` field

#### Definition of Done
✅ Code compiles without errors
✅ Integration tests pass
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(api): implement mesh query endpoint`

#### Common Issues & Solutions
**Issue**: SDK throws error on `desc("timestamp", "number")`.
**Solution**: Verify `desc` is imported from `@arkiv-network/sdk/query` and second argument specifies numeric type (H3).

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M2.5 - Implement Mesh Query API Endpoint
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 5, 6, 10, 11
- Exact Query: buildQuery().where([eq(PROJ), eq(entityType, reading), ...bbox, gte(quality_score), gt(timestamp)]).limit(200).fetch()
- Constraints: H3 (desc import), G8 (GET request), G10 (truncation flag)

BUILD INSTRUCTIONS:
1. Create app/api/readings/mesh/route.ts.
2. Build query using exact snippet from Section 5.
3. Calculate summary (count, unique_owners, avg_quality).
4. Set truncated boolean based on length === 200.

TESTING PROTOCOL:
1. curl GET with bbox params → Expected: readings array and summary object.

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M2.5: Implement Mesh Query API Endpoint - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Endpoint (GET readings/mesh), Constraint (G8, G10, H1, H3)
**Tests**: Unit ✅ N/A | Integration ✅ 1/1
**Issues**: [any + resolution]
**Next Step**: Step M2.6
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M2.6: Build Mesh Query Results Page
**Duration**: 60 minutes
**Objective**: Create the `/query` page that reads `searchParams`, fetches the mesh endpoint, displays results in a table, and handles the truncation banner and CSV export.
**Risk**: Medium - Client-side CSV generation and table sorting require careful state management.
**Prerequisites**: Step M2.5 complete.
**Testing Type**: Manual

#### Blueprint Binding (MANDATORY)
- **Schema used**: None
- **Agent spec**: None
- **Endpoints built**: None
- **External services**: None
- **UI components**: Mesh Query Results screen (Screen 4)
- **Constraints applied**: Linkable via searchParams (G8), Truncation banner (G10), CSV export spec
- **Blueprint section**: Section 5 (Screen 4), Section 10 (G8, G10)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
The `/query` page with results table, stats, and export functionality.

**Key Files/Modules:**
1. `app/query/page.tsx` - Results page

**Implementation Approach:**
- Read searchParams on mount.
- Fetch `/api/readings/mesh`.
- Render table, stats, truncation banner, and export button.

#### Build Instructions (Atomic Steps)
1. Create `app/query/page.tsx`.
2. Extract `sw_lat`, `sw_lng`, `ne_lat`, `ne_lng`, `sensor_type`, `min_quality`, `hours` from `searchParams`.
3. Fetch mesh endpoint using those params.
4. Render "Query parameters summary banner".
5. Render aggregate stats (count, unique owners, avg quality).
6. If `summary.truncated === true`, render amber warning: "Results capped at 200 — refine your bounding box or increase the quality filter".
7. Render table with columns: timestamp, device name, owner, lat/lng, value, unit, quality score, calibration status. [GAP: calibration status requires cross-referencing calibrations; for MVP, display 'unknown' or fetch inline if possible. Blueprint table says "calibration_valid", likely computed or fetched. I will leave as 'N/A' for now or fetch if data is embedded].
8. Implement CSV Export: On button click, generate `Blob` with columns: `timestamp, device_key, owner, lat, lng, value, unit, quality_score, calibration_valid`. Create download link.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
pnpm run dev
# Navigate to /query?sw_lat=48.8&sw_lng=2.3&ne_lat=48.9&ne_lng=2.4
# Expected: Table renders with M1 seeded data.
```

**Phase 3: Manual Verification**
1. Verify URL parameters match the sidebar selection from M2.3.
2. Click "Export CSV" → File downloads with correct columns.
3. Trigger > 200 results (if possible) → Amber truncation banner appears.

#### Deliverables Checklist
- [ ] `app/query/page.tsx` created
- [ ] Results table rendered
- [ ] Truncation banner implemented
- [ ] CSV export implemented with exact columns

#### Definition of Done
✅ Code compiles without errors
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(ui): build mesh query results page`

#### Common Issues & Solutions
**Issue**: `searchParams` causing client-side re-renders or fetch loops.
**Solution**: Wrap fetch in `useEffect` dependent only on serialized param string, or use React Query's `queryKey` based on searchParams.

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M2.6 - Build Mesh Query Results Page
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 5, 10
- Constraint G8: Reads searchParams to fetch data
- Constraint G10: Truncation banner when capped at 200
- Feature: CSV export (columns: timestamp, device_key, owner, lat, lng, value, unit, quality_score, calibration_valid)

BUILD INSTRUCTIONS:
1. Create app/query/page.tsx.
2. Read URL searchParams.
3. Fetch /api/readings/mesh.
4. Render stats, truncation banner (if truncated), and data table.
5. Add CSV export button generating Blob.

TESTING PROTOCOL:
1. Navigate to /query?... → Expected: data table renders.
2. Click export → Expected: CSV downloads.

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M2.6: Build Mesh Query Results Page - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Screen (Mesh Query Results), Feature (CSV Export), Constraint (G8, G10)
**Tests**: Unit ✅ N/A | Integration ✅ N/A
**Issues**: [any + resolution]
**Next Step**: Step M3.1
```
─────────────────────────────────────────────────────────────

---

## Milestone 3: Sensor Detail & Owner Dashboard

## STEP 2: GENERATE MILESTONE 3 IN FULL DETAIL

─────────────────────────────────────────────────────────────
### Step M3.1: Implement Device Update & Delete Endpoints
**Duration**: 45 minutes
**Objective**: Create the `PUT /api/device/[entityKey]` and `DELETE /api/device/[entityKey]` endpoints for owner management.
**Risk**: Medium - `updateEntity` requires full-replace semantics; delete must strictly verify ownership before executing.
**Prerequisites**: Milestone 2 complete.
**Testing Type**: Integration

#### Blueprint Binding (MANDATORY)
- **Schema used**: `SensorDevice` attributes
- **Agent spec**: Server-side `WalletClient`
- **Endpoints built**: `PUT /api/device/[entityKey]`, `DELETE /api/device/[entityKey]`
- **External services**: Arkiv Braga RPC
- **UI components**: None
- **Constraints applied**: Owner-only auth, `updateEntity` full-replace semantics, G11 (delete leaves readings/calibrations intact)
- **Blueprint section**: Section 6 (Device Endpoints), Section 9 (Coverage Map), Section 10 (G11)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
Two API routes for updating device info and deregistering devices.

**Key Files/Modules:**
1. `app/api/device/[entityKey]/route.ts` - Update existing GET route to handle PUT and DELETE

**Implementation Approach:**
- Extract `entityKey` from URL params.
- For both PUT and DELETE, verify auth signature. Then, fetch the entity to confirm the signer's address matches the `$owner` of the entity.
- For PUT: Merge existing attributes with updates, then call `walletClient.updateEntity` with the full attribute set.
- For DELETE: Call `walletClient.deleteEntity`.

#### Build Instructions (Atomic Steps)
1. Open `app/api/device/[entityKey]/route.ts`.
2. Implement `PUT` handler. Verify auth (`address`, `nonce`, `signature`).
3. Fetch entity via `publicClient.getEntity(entityKey)`. Verify `entity.toJson().$owner === address`. [GAP: exact path to `$owner` in returned JSON assumed standard, likely top level or in metadata].
4. If unauthorized, return 403.
5. Parse body for `name`, `description`, `status`. [GAP: blueprint says "must re-send all existing attributes"]. Fetch current attributes, overwrite changed fields, and pass the complete attributes object to `walletClient.updateEntity({ entityKey, attributes, payload })`. [GAP: exact signature of `updateEntity` inferred].
6. Implement `DELETE` handler. Verify auth and ownership identically to PUT.
7. Call `walletClient.deleteEntity({ entityKey })`.
8. Return `{ txHash }`.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
# PUT
curl -X PUT http://localhost:3000/api/device/0x... \
  -d '{"name":"Updated Name","status":"inactive","address":"0xOwner...","nonce":"...","signature":"..."}'
# Expected: { "txHash": "0x..." }

# DELETE
curl -X DELETE http://localhost:3000/api/device/0x... \
  -d '{"address":"0xOwner...","nonce":"...","signature":"..."}'
# Expected: { "txHash": "0x..." }
```

**Phase 3: Manual Verification**
1. Verify Arkiv Explorer shows updated attributes.
2. Verify deleted device is gone, but its readings still exist (G11).

#### Deliverables Checklist
- [ ] `PUT` handler implemented with full-replace semantics
- [ ] `DELETE` handler implemented
- [ ] Owner-only authorization enforced on both

#### Definition of Done
✅ Code compiles without errors
✅ Integration tests pass
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(api): implement device update and delete endpoints`

#### Common Issues & Solutions
**Issue**: `updateEntity` overwrites and removes lat/lng because they weren't merged.
**Solution**: Explicitly fetch current attributes and spread them: `attributes: { ...currentAttrs, ...updatedAttrs }`.

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M3.1 - Implement Device Update & Delete Endpoints
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 6, 9, 10
- Constraint G11: Delete does not remove associated readings/calibrations
- Constraint: updateEntity full-replace semantics, owner-only auth

BUILD INSTRUCTIONS:
1. Add PUT and DELETE handlers to app/api/device/[entityKey]/route.ts.
2. Verify auth and ownership ($owner === address).
3. PUT: Fetch current attrs, merge updates, call updateEntity.
4. DELETE: Call deleteEntity.
5. Return txHash.

TESTING PROTOCOL:
1. PUT updated status → Expected: 200 OK, attrs updated on explorer
2. DELETE device → Expected: 200 OK, device removed, readings intact

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M3.1: Implement Device Update & Delete Endpoints - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Endpoint (PUT/DELETE device), Constraint (Full-replace, G11)
**Tests**: Unit ✅ N/A | Integration ✅ 1/1
**Issues**: [any + resolution]
**Next Step**: Step M3.2
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M3.2: Build Sensor Detail Page - Sidebar & Info
**Duration**: 60 minutes
**Objective**: Create the `/sensor/[entityKey]` route and build the sidebar with sensor info, calibration status logic, and owner-only controls.
**Risk**: Medium - Calibration validity logic requires comparing timestamps. Owner-only controls need reliable wallet comparison.
**Prerequisites**: Step M3.1 complete.
**Testing Type**: Manual

#### Blueprint Binding (MANDATORY)
- **Schema used**: `SensorDevice` attributes, `CalibrationRecord` attributes
- **Agent spec**: None
- **Endpoints built**: None
- **External services**: None
- **UI components**: Sensor Detail screen (Screen 2 - Sidebar)
- **Constraints applied**: Calibration validity check (`valid_from`, `valid_until`)
- **Blueprint section**: Section 5 (Screen 2)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
The Sensor Detail page layout and its left sidebar.

**Key Files/Modules:**
1. `app/sensor/[entityKey]/page.tsx` - Page component
2. `components/SensorDetailSidebar.tsx` - Sidebar client component

**Implementation Approach:**
- Fetch device and calibrations on the server or client.
- Compute calibration status: Valid, Expiring Soon (<30d), Expired.
- Conditionally render owner controls based on `walletAddress === device.$owner`.

#### Build Instructions (Atomic Steps)
1. Create `app/sensor/[entityKey]/page.tsx`.
2. Fetch device data using `publicClient.getEntity(entityKey)` and calibrations using `/api/calibrations?deviceKey=...`. [GAP: Fetching strategy (server vs client component) not strictly defined; Next.js App Router implies server components for data fetching, but wallet state requires client. I will use a client component wrapper that fetches via API routes].
3. Create `components/SensorDetailSidebar.tsx` as a Client Component.
4. Display Device name, type badge, status, owner wallet (truncated), creator wallet, registration date.
5. Implement Calibration logic: Find the latest calibration where `valid_from <= Date.now()`. If none, status is "Uncalibrated". If `valid_until < Date.now()`, status is "Expired" (Red). If `valid_until < Date.now() + 30 * 24 * 3600 * 1000`, status is "Expiring soon" (Amber). Else "Valid" (Green).
6. Render owner-only controls (Submit Reading, Add Calibration, Edit, Transfer) only if `useAccount()` address matches `$owner`.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
pnpm run dev
# Navigate to /sensor/0x...
# Expected: Sidebar renders with device info and calibration status.
```

**Phase 3: Manual Verification**
1. Connect wallet that owns the device → Verify owner controls appear.
2. Connect different wallet → Verify owner controls are hidden.
3. Verify calibration status colors match spec (Green/Amber/Red).

#### Deliverables Checklist
- [ ] `app/sensor/[entityKey]/page.tsx` created
- [ ] `components/SensorDetailSidebar.tsx` created
- [ ] Calibration validity logic implemented
- [ ] Owner-only controls gated by wallet connection

#### Definition of Done
✅ Code compiles without errors
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(ui): build sensor detail sidebar and calibration logic`

#### Common Issues & Solutions
**Issue**: Calibration timestamps are in milliseconds, logic compares against seconds.
**Solution**: Ensure `Date.now()` output (ms) is compared directly against `valid_until` (ms) as defined in Extraction 4 schema (`1716800000000`).

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M3.2 - Build Sensor Detail Page - Sidebar & Info
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 5
- Schema: SensorDevice attributes, CalibrationRecord valid_from/valid_until (numeric ms)
- UI Spec: Sidebar 280px, owner-only controls, calibration badges (Valid/Expiring/Expired)

BUILD INSTRUCTIONS:
1. Create app/sensor/[entityKey]/page.tsx.
2. Create components/SensorDetailSidebar.tsx.
3. Fetch device and calibrations.
4. Implement calibration validity check (Date.now vs valid_until).
5. Gate owner controls on walletAddress === $owner.

TESTING PROTOCOL:
1. Navigate to sensor page → Expected: sidebar renders, correct calibration badge.

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M3.2: Build Sensor Detail Page - Sidebar & Info - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Screen (Sensor Detail partial), Constraint (Calibration validity)
**Tests**: Unit ✅ N/A | Integration ✅ N/A
**Issues**: [any + resolution]
**Next Step**: Step M3.3
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M3.3: Build Sensor Detail Page - Main Content & Charts
**Duration**: 60 minutes
**Objective**: Build the main content area of the Sensor Detail page, including the reading history line chart, quality score trend, and readings table.
**Risk**: Medium - Recharts integration with time-series data requires correct timestamp formatting.
**Prerequisites**: Step M3.2 complete.
**Testing Type**: Manual

#### Blueprint Binding (MANDATORY)
- **Schema used**: `Reading` attributes
- **Agent spec**: None
- **Endpoints built**: None
- **External services**: None
- **UI components**: Sensor Detail screen (Screen 2 - Main content), Recharts `LineChart`
- **Constraints applied**: None
- **Blueprint section**: Section 2 (Tech Stack - Recharts 3.8.1), Section 5 (Screen 2)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
Main content area with charts and data table.

**Key Files/Modules:**
1. `components/SensorDetailMain.tsx` - Main content client component

**Implementation Approach:**
- Fetch readings for the device.
- Render two Recharts `LineChart`s: one for value, one for quality score.
- Render a data table mapping the readings.

#### Build Instructions (Atomic Steps)
1. Create `components/SensorDetailMain.tsx` as a Client Component.
2. Fetch `/api/readings?deviceKey=[key]&limit=200`.
3. Import `LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer` from `recharts`.
4. Format data for Recharts (map timestamps to JS Dates for axis). [GAP: Recharts date axis configuration inferred standard usage].
5. Render Value chart (X: time, Y: value) and Quality chart (X: time, Y: quality_score).
6. Render HTML/Table component below charts with columns: Timestamp, Value, Unit, Quality Score.
7. Import into `app/sensor/[entityKey]/page.tsx`.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
pnpm run dev
# Navigate to /sensor/0x...
# Expected: Charts render with lines. Table populates.
```

**Phase 3: Manual Verification**
1. Verify X-axis shows time correctly.
2. Verify Y-axis scales to data values.

#### Deliverables Checklist
- [ ] `components/SensorDetailMain.tsx` created
- [ ] Recharts `LineChart` implemented for values and quality scores
- [ ] Readings table implemented

#### Definition of Done
✅ Code compiles without errors
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(ui): build sensor detail charts and table`

#### Common Issues & Solutions
**Issue**: Recharts renders but lines are missing.
**Solution**: Ensure data points are sorted by timestamp ascending and `dataKey` matches the object keys.

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M3.3 - Build Sensor Detail Page - Main Content & Charts
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 2, 5
- Tech: recharts@3.8.1
- UI Spec: Two LineCharts (value, quality), Readings table

BUILD INSTRUCTIONS:
1. Create components/SensorDetailMain.tsx.
2. Fetch readings.
3. Implement two Recharts LineCharts (time on X).
4. Implement Readings table.
5. Import into sensor detail page.

TESTING PROTOCOL:
1. Navigate to sensor page → Expected: charts render correctly with seeded data.

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M3.3: Build Sensor Detail Page - Main Content & Charts - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Screen (Sensor Detail partial), Tech (Recharts)
**Tests**: Unit ✅ N/A | Integration ✅ N/A
**Issues**: [any + resolution]
**Next Step**: Step M3.4
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M3.4: Implement Owner Dashboard - Stats & Device List
**Duration**: 60 minutes
**Objective**: Create the `/dashboard` page layout, including the 4 metric stats cards and the filtered device list table.
**Risk**: Low - Standard dashboard UI and data fetching.
**Prerequisites**: Milestone 2 complete.
**Testing Type**: Manual

#### Blueprint Binding (MANDATORY)
- **Schema used**: None
- **Agent spec**: None
- **Endpoints built**: None
- **External services**: None
- **UI components**: Owner Dashboard screen (Screen 3)
- **Constraints applied**: Queries filtered with `.ownedBy(walletAddress)`
- **Blueprint section**: Section 5 (Screen 3), Section 7 (Phase 3)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
The Owner Dashboard page displaying stats and devices for the connected wallet.

**Key Files/Modules:**
1. `app/dashboard/page.tsx` - Dashboard page component
2. `components/DashboardStats.tsx` - Stats cards component
3. `components/DeviceListTable.tsx` - Table component

**Implementation Approach:**
- Use `useAccount()` from wagmi to get the connected wallet address.
- Fetch devices filtered by ownership.
- Calculate aggregate stats on the client from the returned data or specific endpoint. [GAP: Blueprint specifies 4 metric cards. Fetching all readings just for count/avg quality is heavy. I will use the `/api/stats` endpoint defined in Extraction 6 Utility Endpoints, but it isn't explicitly scheduled until Phase 6. However, using it now saves building throwaway logic. Actually, Section 7 Phase 3 says "Data sources: All queries filtered with .ownedBy(walletAddress) from Zustand". I will query `/api/devices` with owner filter and aggregate readings locally for MVP to stick to Phase 3 scope, or pass owner param to stats endpoint. Let's add a `owner` query param to `/api/stats` to support the dashboard properly. Wait, `/api/stats` is in Extraction 6 but not in the Phase 3 coverage map. I will create a simple client-side aggregation from the devices list to avoid untracked scope creep, or just put placeholder stats if data is too heavy. Best approach: Implement a basic version that queries devices owned by user, and derive stats. For "Total readings", I will omit or just show devices to keep it strictly within mapped features].

#### Build Instructions (Atomic Steps)
1. Create `app/dashboard/page.tsx` as a Client Component.
2. Retrieve `walletAddress` from Zustand/wagmi. Redirect to home if not connected. [GAP: Auth guard pattern not detailed, standard Next.js pattern inferred].
3. Create `components/DashboardStats.tsx`. Pass device data to calculate: Total devices, Average quality (from latest readings), Active alerts (fetch `/api/alerts/recent`).
4. Create `components/DeviceListTable.tsx`. Fetch `/api/devices` (need to add `owner` query param support to the endpoint created in M1.4). [GAP: `GET /api/devices` in Extraction 6 doesn't list `owner` as a query param, but Phase 3 says "All queries filtered with .ownedBy(walletAddress)". I must update the GET /api/devices route to accept an `owner` param and chain `.ownedBy(owner)` if provided].
5. Update `app/api/devices/route.ts` to handle `owner` searchParam.
6. Render stats and table in the dashboard grid layout.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
pnpm run dev
# Connect wallet and navigate to /dashboard
# Expected: Stats render. Table shows only devices owned by connected wallet.
```

**Phase 3: Manual Verification**
1. Verify device list matches ownership.
2. Verify stats reflect the filtered data.

#### Deliverables Checklist
- [ ] `app/dashboard/page.tsx` created
- [ ] `GET /api/devices` updated with `owner` filter
- [ ] Stats cards and Device table rendered

#### Definition of Done
✅ Code compiles without errors
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(ui): implement owner dashboard stats and device list`

#### Common Issues & Solutions
**Issue**: Stats show 0 because client-side aggregation misses async data.
**Solution**: Use `useQuery` `isLoading` states and compute stats inside `useMemo` dependent on successful fetch results.

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M3.4 - Implement Owner Dashboard - Stats & Device List
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 5, 7
- Constraint: Filter queries with .ownedBy(walletAddress)

BUILD INSTRUCTIONS:
1. Update GET /api/devices to accept `owner` param and chain .ownedBy().
2. Create app/dashboard/page.tsx.
3. Create DashboardStats and DeviceListTable components.
4. Fetch devices with owner filter.

TESTING PROTOCOL:
1. Navigate to /dashboard → Expected: only owned devices appear.

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M3.4: Implement Owner Dashboard - Stats & Device List - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Screen (Owner Dashboard partial), Constraint (OwnedBy filter)
**Tests**: Unit ✅ N/A | Integration ✅ N/A
**Issues**: [any + resolution]
**Next Step**: Step M3.5
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M3.5: Implement Owner Dashboard - Action Modals (Register, Submit, Calibrate)
**Duration**: 60 minutes
**Objective**: Build the interactive modals and panels on the dashboard for registering devices, submitting readings, and adding calibrations, utilizing the wallet auth flow.
**Risk**: High - Requires end-to-end implementation of the nonce signing flow on the client side.
**Prerequisites**: Step M3.4 complete.
**Testing Type**: Integration

#### Blueprint Binding (MANDATORY)
- **Schema used**: `SensorDevice`, `Reading`, `CalibrationRecord` payloads
- **Agent spec**: None
- **Endpoints built**: None (Consumes existing POST endpoints)
- **External services**: None
- **UI components**: Owner Dashboard screen (Modals)
- **Constraints applied**: Wallet `personal_sign` nonce verification flow (G4)
- **Blueprint section**: Section 3 (Auth Flow), Section 5 (Screen 3), Section 10 (G4)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
Client-side logic and UI modals to sign messages and submit data to POST endpoints.

**Key Files/Modules:**
1. `components/RegisterDeviceModal.tsx` - Modal
2. `components/SubmitReadingPanel.tsx` - Panel
3. `components/AddCalibrationModal.tsx` - Modal
4. `lib/useWalletAuth.ts` - [GAP: Custom hook for signing flow not in blueprint, inferred to encapsulate the pattern] Custom hook for nonce fetching and signing.

**Implementation Approach:**
- Create a reusable hook or utility function `getAuthSignature(address, walletClient)` that: 1. Fetches nonce. 2. Signs nonce. 3. Returns `{ address, nonce, signature }`.
- Build modals that collect form data, get auth signature, and POST to API routes.

#### Build Instructions (Atomic Steps)
1. Create `lib/useWalletAuth.ts`. Implement `async getAuthSignature()`: `fetch /api/auth/nonce`, `walletClient.signMessage({ message: nonce })`, return payload.
2. Create `components/RegisterDeviceModal.tsx`. Form fields: name, description, sensor_type, lat, lng. On submit, get auth sig, `POST /api/device/register`.
3. Create `components/SubmitReadingPanel.tsx`. Select device, input value/unit. On submit, get auth sig, `POST /api/reading/submit`.
4. Create `components/AddCalibrationModal.tsx`. Select device, offset, method, notes, valid_until. On submit, get auth sig, `POST /api/calibration/add`.
5. Integrate modals into `app/dashboard/page.tsx` triggered by buttons.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
pnpm run dev
# On dashboard, click "Register New Device"
# Expected: MetaMask prompts for signature. Device appears on Arkiv.
```

**Phase 3: Manual Verification**
1. Register a new device → Verify entity appears in device list.
2. Submit a reading for it → Verify reading appears.
3. Add calibration → Verify calibration status updates on sensor detail.

#### Deliverables Checklist
- [ ] `lib/useWalletAuth.ts` created
- [ ] Registration modal functional with signing
- [ ] Reading submission functional with signing
- [ ] Calibration add functional with signing

#### Definition of Done
✅ Code compiles without errors
✅ Integration tests pass
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(ui): implement owner dashboard action modals with auth`

#### Common Issues & Solutions
**Issue**: MetaMask doesn't pop up for signature.
**Solution**: Ensure `walletClient` from wagmi is correctly initialized and `signMessage` is called with the exact nonce string returned by the API.

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M3.5 - Implement Owner Dashboard - Action Modals
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 3, 5, 10
- Constraint G4: Client signs nonce via personal_sign
- Endpoints: POST device, reading, calibration

BUILD INSTRUCTIONS:
1. Create lib/useWalletAuth.ts with getAuthSignature (fetch nonce, sign, return).
2. Create modals for Register, Submit, Calibrate.
3. Integrate getAuthSignature into submit flows.
4. Mount modals in dashboard.

TESTING PROTOCOL:
1. Register device → Expected: MetaMask signs, device created.

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M3.5: Implement Owner Dashboard - Action Modals - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Screen (Owner Dashboard modals), Constraint (G4 Auth flow)
**Tests**: Unit ✅ N/A | Integration ✅ 1/1
**Issues**: [any + resolution]
**Next Step**: Step M4.1
```
─────────────────────────────────────────────────────────────

---

## Milestone 4: AI Agent, Alerts & Live Events

## STEP 2: GENERATE MILESTONE 4 IN FULL DETAIL

─────────────────────────────────────────────────────────────
### Step M4.1: Implement AI Anomaly Scan Endpoint
**Duration**: 60 minutes
**Objective**: Create the `POST /api/agent/scan` endpoint that calculates rolling means, detects 3σ anomalies, and creates `AnomalyAlert` entities with the correct `$creator`/`$owner` split.
**Risk**: High - Incorrect statistical logic or misconfigured ownership split compromises the core AI agent value proposition.
**Prerequisites**: Milestone 3 complete.
**Testing Type**: Integration

#### Blueprint Binding (MANDATORY)
- **Schema used**: `AnomalyAlert` entity + attributes
- **Agent spec**: Server-side `WalletClient` (Agent), Anomaly Detection logic
- **Endpoints built**: `POST /api/agent/scan`
- **External services**: Arkiv Braga RPC
- **UI components**: None
- **Constraints applied**: `$owner` / `$creator` split on AnomalyAlert, `expiresIn: ExpirationTime.fromDays(90)`, `CRON_SECRET` auth, numeric attributes
- **Blueprint section**: Section 4 (Entity 4), Section 6 (Alert Endpoints), Section 9 (Coverage Map)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
API route triggered by cron to scan recent readings and generate anomaly alerts.

**Key Files/Modules:**
1. `app/api/agent/scan/route.ts` - Cron endpoint

**Implementation Approach:**
- Verify `CRON_SECRET` header.
- Fetch all readings from the last 5 minutes.
- Group by `device_key`. For each, fetch the last 20 readings to establish baseline.
- Calculate mean and standard deviation. If new value > 3σ from mean, create `AnomalyAlert`.
- Set `$creator` to Agent wallet (implicit via `walletClient`), `$owner` to the device owner's wallet.
- Set `expiresIn` to 90 days.

#### Build Instructions (Atomic Steps)
1. Create `app/api/agent/scan/route.ts`.
2. Implement `POST` handler. Check `Authorization === Bearer ${process.env.CRON_SECRET}`. If fail, return 401.
3. Fetch recent readings: `publicClient.buildQuery().where([eq(PROJECT_ATTRIBUTE...), eq("entityType", "reading"), gt("timestamp", Date.now() - 5 * 60 * 1000)]).withPayload(true).withAttributes(true).withMetadata(true).fetch()`.
4. Group results by `device_key` attribute.
5. For each device with recent readings:
   a. Fetch the last 20 readings for that device to form baseline. [GAP: Blueprint says "compare against that device's last 20 readings". Query: `.where([..., eq("device_key", key)]).orderBy(desc("timestamp", "number")).limit(20).fetch()`].
   b. Calculate mean and standard deviation of `value` from baseline.
   c. Check if any of the recent readings (from step 3) deviate > 3σ from mean. [GAP: Standard deviation formula not explicitly defined, standard population/sample stddev inferred].
   d. If anomaly detected:
      i. Fetch parent device to get `lat`, `lng`, `sensor_type`, and `$owner`.
      ii. Construct `AnomalyAlert` payload: `anomaly_type: "spike"`, `description: "Value deviated >3σ from baseline"`, `baseline_value: mean`, `observed_value: newValue`, `confidence: 0.91`, `affected_reading_key: readingKey`. [GAP: exact logic for confidence score not defined, using placeholder 0.91 from schema example].
      iii. Construct attributes: `project`, `entityType: "anomaly_alert"`, `device_key`, `sensor_type`, `severity: "high"`, `lat` (number), `lng` (number), `timestamp` (number), `confidence` (number).
      iv. Call `walletClient.createEntity({ payload, attributes, expiresIn: ExpirationTime.fromDays(90) })`.
      v. Call `walletClient.changeOwnership({ entityKey, newOwner: deviceOwnerAddress })`.
6. Return `{ processed: recentReadings.length, alerts_created: alertCount }`.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
curl -X POST http://localhost:3000/api/agent/scan -H "Authorization: Bearer <CRON_SECRET>"
# Expected: { "processed": N, "alerts_created": M }
```

**Phase 3: Manual Verification**
1. Manually submit an extreme reading via `/api/reading/submit`.
2. Trigger scan endpoint.
3. Check Arkiv Explorer → `AnomalyAlert` entity exists. `$creator` is Agent wallet, `$owner` is Device owner wallet.

#### Deliverables Checklist
- [ ] `app/api/agent/scan/route.ts` created
- [ ] `CRON_SECRET` authorization implemented
- [ ] 3σ deviation logic implemented
- [ ] `$owner`/`$creator` split correctly applied via `changeOwnership`
- [ ] `expiresIn: ExpirationTime.fromDays(90)` used

#### Definition of Done
✅ Code compiles without errors
✅ Integration tests pass
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(agent): implement ai anomaly scan endpoint`

#### Common Issues & Solutions
**Issue**: Standard deviation is 0 (constant baseline), causing division by zero.
**Solution**: Add a check: if stddev === 0, deviation is 0 (or handle as anomaly only if newValue !== mean).

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M4.1 - Implement AI Anomaly Scan Endpoint
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 4, 6, 9
- Exact schema: AnomalyAlert payload + attributes
- Constraint: Agent $creator, Owner $owner via changeOwnership, expiresIn fromDays(90), CRON_SECRET auth

BUILD INSTRUCTIONS:
1. Create app/api/agent/scan/route.ts.
2. Verify CRON_SECRET.
3. Fetch last 5m readings.
4. For each, fetch 20 baseline readings, calculate mean/stddev.
5. If >3σ, create AnomalyAlert entity.
6. changeOwnership to device owner.
7. Return counts.

TESTING PROTOCOL:
1. Submit spike reading → run scan → Expected: AnomalyAlert created with correct split.

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M4.1: Implement AI Anomaly Scan Endpoint - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Schema (AnomalyAlert), Endpoint (POST agent/scan), Constraint (Owner/Creator split)
**Tests**: Unit ✅ N/A | Integration ✅ 1/1
**Issues**: [any + resolution]
**Next Step**: Step M4.2
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M4.2: Implement Alert Read Endpoint & Vercel Cron Config
**Duration**: 30 minutes
**Objective**: Create the `GET /api/alerts` endpoint and configure `vercel.json` for the 2-hour cron schedule.
**Risk**: Low - Standard read endpoint and static config.
**Prerequisites**: Step M4.1 complete.
**Testing Type**: Integration

#### Blueprint Binding (MANDATORY)
- **Schema used**: `AnomalyAlert` attributes
- **Agent spec**: None
- **Endpoints built**: `GET /api/alerts`
- **External services**: None
- **UI components**: None
- **Constraints applied**: `.createdBy(CREATOR_WALLET_ADDRESS)`, Vercel Cron `0 */2 * * *` (G3)
- **Blueprint section**: Section 6 (Alert Endpoints), Section 7 (Phase 4), Section 10 (G3)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
API route to fetch alerts with filters and the Vercel cron configuration file.

**Key Files/Modules:**
1. `app/api/alerts/route.ts` - Alert list endpoint
2. `vercel.json` - Cron config

**Implementation Approach:**
- Implement query with optional `deviceKey`, `severity`, and `since` filters.
- Chain `.createdBy()` to ensure only trusted agent alerts are returned.
- Add `vercel.json` with cron path and schedule.

#### Build Instructions (Atomic Steps)
1. Create `app/api/alerts/route.ts`.
2. Implement `GET` handler. Parse `deviceKey`, `severity`, `limit`, `since` from searchParams.
3. Build query: `eq(PROJECT_ATTRIBUTE...)`, `eq("entityType", "anomaly_alert")`, plus optional filters.
4. Chain `.createdBy(CREATOR_WALLET_ADDRESS)`. Order by `desc("timestamp", "number")`.
5. Fetch and return `{ alerts: [...] }`.
6. Create `vercel.json` in project root.
7. Add config: `{ "crons": [{ "path": "/api/agent/scan", "schedule": "0 */2 * * *" }] }`.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
curl http://localhost:3000/api/alerts
# Expected: { "alerts": [...] }
```

**Phase 3: Manual Verification**
1. Verify `vercel.json` is valid JSON.
2. Verify `GET /api/alerts` uses `.createdBy()`.

#### Deliverables Checklist
- [ ] `app/api/alerts/route.ts` created with filters and `.createdBy()`
- [ ] `vercel.json` created with 2-hour cron schedule

#### Definition of Done
✅ Code compiles without errors
✅ Integration tests pass
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(api): implement alerts endpoint and vercel cron config`

#### Common Issues & Solutions
**Issue**: Vercel CLI does not run crons locally.
**Solution**: Use `curl` or cron-job.org for local development testing of the scan endpoint.

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M4.2 - Implement Alert Read Endpoint & Vercel Cron Config
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 6, 7, 10
- Constraint G3: Vercel Hobby 12/day limit, schedule 0 */2 * * *
- Constraint: .createdBy(CREATOR_WALLET_ADDRESS) for trusted queries

BUILD INSTRUCTIONS:
1. Create app/api/alerts/route.ts with filters (deviceKey, severity) and .createdBy().
2. Create vercel.json with crons config for /api/agent/scan.

TESTING PROTOCOL:
1. curl /api/alerts → Expected: list of anomaly alerts

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M4.2: Implement Alert Read Endpoint & Vercel Cron Config - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Endpoint (GET alerts), Infra (Vercel Cron G3)
**Tests**: Unit ✅ N/A | Integration ✅ 1/1
**Issues**: [any + resolution]
**Next Step**: Step M4.3
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M4.3: Build Alert Feed Screen
**Duration**: 45 minutes
**Objective**: Create the `/alerts` page to display a public, tamper-proof log of AI anomalies with severity filters and attribution.
**Risk**: Low - Standard UI list and filter implementation.
**Prerequisites**: Step M4.2 complete.
**Testing Type**: Manual

#### Blueprint Binding (MANDATORY)
- **Schema used**: `AnomalyAlert` payload & attributes
- **Agent spec**: None
- **Endpoints built**: None
- **External services**: None
- **UI components**: Alert Feed screen (Screen 5)
- **Constraints applied**: None
- **Blueprint section**: Section 5 (Screen 5)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
The Alert Feed UI page.

**Key Files/Modules:**
1. `app/alerts/page.tsx` - Alert feed page
2. `components/AlertCard.tsx` - Card component for individual alerts

**Implementation Approach:**
- Fetch `/api/alerts`.
- Render filter bar (severity, sensor_type).
- Map results to `AlertCard` components displaying attribution and severity badges.

#### Build Instructions (Atomic Steps)
1. Create `app/alerts/page.tsx`.
2. Add filter state for `severity` (all/low/medium/high) and `sensor_type`.
3. Fetch `/api/alerts` with filter params.
4. Create `components/AlertCard.tsx`.
5. Render Severity badge (color-coded: low/medium/high).
6. Render Description, Baseline → Observed values, Confidence score.
7. Render Attribution: "Detected by AI Agent `0xagent...`" (`$creator`), "Owned by `0xowner...`" (`$owner`).
8. Add link to `/sensor/[device_key]`.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
pnpm run dev
# Navigate to /alerts
# Expected: List of alerts from M4.1 scan renders with correct attribution.
```

**Phase 3: Manual Verification**
1. Click severity filter → List filters correctly.
2. Verify `$creator` is Agent wallet and `$owner` is Device wallet.

#### Deliverables Checklist
- [ ] `app/alerts/page.tsx` created with filters
- [ ] `components/AlertCard.tsx` created with attribution display
- [ ] Color-coded severity badges implemented

#### Definition of Done
✅ Code compiles without errors
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(ui): build alert feed screen`

#### Common Issues & Solutions
**Issue**: Attribution wallets show full addresses, cluttering UI.
**Solution**: Truncate wallets using standard `0x1234...abcd` pattern.

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M4.3 - Build Alert Feed Screen
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 5
- UI Spec: Single-column feed, filter bar, Alert cards with severity, attribution ($creator/$owner)

BUILD INSTRUCTIONS:
1. Create app/alerts/page.tsx with filter state.
2. Create components/AlertCard.tsx.
3. Fetch /api/alerts.
4. Render severity badge, description, attribution (Agent vs Owner), and link to sensor.

TESTING PROTOCOL:
1. Navigate to /alerts → Expected: alerts list renders, filter works.

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M4.3: Build Alert Feed Screen - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Screen (Alert Feed)
**Tests**: Unit ✅ N/A | Integration ✅ N/A
**Issues**: [any + resolution]
**Next Step**: Step M4.4
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M4.4: Implement Live Events Polling & Anomaly Map Markers
**Duration**: 60 minutes
**Objective**: Replace static device fetching on the MeshMap with Arkiv Live Events polling (C2) and add the pulsing `AnomalyMarker` layer.
**Risk**: Medium - Polling logic must correctly parse event shapes and update Zustand without memory leaks.
**Prerequisites**: Step M4.3 complete.
**Testing Type**: Integration

#### Blueprint Binding (MANDATORY)
- **Schema used**: None
- **Agent spec**: None
- **Endpoints built**: None
- **External services**: Arkiv Braga RPC
- **UI components**: `AnomalyMarker`
- **Constraints applied**: `subscribeEntityEvents()` polling, NOT WebSocket (C2), 5000ms interval
- **Blueprint section**: Section 5 (Screen 1 Real-time code snippet), Section 10 (C2), Section 11 (C2, L2)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
Update `MeshMap` to subscribe to entity events and display anomaly markers.

**Key Files/Modules:**
1. `components/MeshMap.tsx` - Updated with polling and anomaly markers

**Implementation Approach:**
- Use the exact `subscribeEntityEvents` snippet from Extraction 5.
- Dispatch created entities to Zustand or local state.
- Fetch recent alerts and render `AnomalyMarker` (pulsing red circles).

#### Build Instructions (Atomic Steps)
1. Open `components/MeshMap.tsx`.
2. Inside the component, add `useEffect` for Live Events.
3. Implement exact snippet from Extraction 5:
   ```typescript
   const unsubscribe = publicClient.subscribeEntityEvents(
     {
       onEntityCreated: async (event) => {
         const entity = await publicClient.getEntity(event.entityKey)
         const data = entity.toJson()
         if (data.project === PROJECT_ATTRIBUTE.value) {
           // Update local state/Zustand to re-render markers
         }
       },
       onError: (err) => console.error("Live events error:", err),
     },
     5000, // poll every 5 s
   )
   return () => unsubscribe()
   ```
4. Fetch `/api/alerts/recent` on mount to render `AnomalyMarker`s.
5. Create `AnomalyMarker` component: Red circle with CSS pulsing animation. [GAP: CSS animation definition inferred from "pulsing red circles"].
6. Render `AnomalyMarker` at `lat`/`lng` from alert attributes.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
pnpm run dev
# Navigate to /
# Expected: Map loads. Network tab shows polling requests.
```

**Phase 3: Manual Verification**
1. Submit a new reading via Dashboard → Map marker updates within 5-10 seconds.
2. Trigger anomaly scan → Red pulsing marker appears on map at the device location.

#### Deliverables Checklist
- [ ] `subscribeEntityEvents` implemented with 5000ms poll
- [ ] `AnomalyMarker` component created with pulsing CSS
- [ ] Live updates reflect on map without full page reload

#### Definition of Done
✅ Code compiles without errors
✅ Integration tests pass
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(ui): implement live events polling and anomaly markers`

#### Common Issues & Solutions
**Issue**: `subscribeEntityEvents` throws error or doesn't exist in SDK.
**Solution**: Verify `@arkiv-network/sdk@0.6.8` export. C2 explicitly states this function exists and uses HTTP polling, overriding earlier WebSocket assumptions.

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M4.4 - Implement Live Events Polling & Anomaly Map Markers
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 5, 10, 11
- Constraint C2: subscribeEntityEvents() polling every 5000ms, NOT WebSocket
- UI: AnomalyMarker (red pulsing circle)

BUILD INSTRUCTIONS:
1. Update components/MeshMap.tsx.
2. Add useEffect with publicClient.subscribeEntityEvents snippet.
3. Fetch /api/alerts/recent.
4. Create AnomalyMarker with CSS pulse.
5. Render AnomalyMarkers.

TESTING PROTOCOL:
1. Trigger reading submission → Expected: map updates within 5s.
2. Trigger anomaly scan → Expected: red pulsing marker appears.

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M4.4: Implement Live Events Polling & Anomaly Map Markers - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Constraint (C2 Polling), Component (AnomalyMarker), Feature (Live Events)
**Tests**: Unit ✅ N/A | Integration ✅ 1/1
**Issues**: [any + resolution]
**Next Step**: Step M-final.1
```
─────────────────────────────────────────────────────────────

---

## Milestone Final: Deployment & Demo

## STEP 2: GENERATE MILESTONE FINAL IN FULL DETAIL

─────────────────────────────────────────────────────────────
### Step M-final.1: Implement Health & Stats Utility Endpoints
**Duration**: 30 minutes
**Objective**: Create the `GET /api/health` and `GET /api/stats` utility endpoints required for deployment verification and dashboard support.
**Risk**: Low - Simple read queries.
**Prerequisites**: Milestone 4 complete.
**Testing Type**: Integration

#### Blueprint Binding (MANDATORY)
- **Schema used**: None
- **Agent spec**: None
- **Endpoints built**: `GET /api/health`, `GET /api/stats`
- **External services**: Arkiv Braga RPC
- **UI components**: None
- **Constraints applied**: None
- **Blueprint section**: Section 6 (Utility Endpoints)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
Two simple API routes for monitoring and statistics.

**Key Files/Modules:**
1. `app/api/health/route.ts` - Health check endpoint
2. `app/api/stats/route.ts` - Stats endpoint

**Implementation Approach:**
- `/api/health`: Return static JSON with status and network info.
- `/api/stats`: Use `publicClient.buildQuery()...getEntityCount()` for each entity type. [GAP: `getEntityCount()` method mentioned in Extraction 6. Blueprint does not provide exact SDK signature; inferred from method name].

#### Build Instructions (Atomic Steps)
1. Create `app/api/health/route.ts`.
2. Implement `GET` handler returning `{ status: "ok", network: "braga", blockTime: "2s" }`.
3. Create `app/api/stats/route.ts`.
4. Implement `GET` handler.
5. Query counts for each entity type: `publicClient.buildQuery().where([eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value), eq("entityType", "sensor_device")]).getEntityCount()`. Repeat for `reading`, `anomaly_alert`, `calibration_record`. [GAP: Exact chaining of `.getEntityCount()` inferred. May require `.fetch()` and checking a count property if method doesn't exist, but Section 6 explicitly says `getEntityCount()`].
6. Return `{ total_devices, total_readings, total_alerts, total_calibrations }`.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
curl http://localhost:3000/api/health
# Expected: { "status": "ok", "network": "braga", "blockTime": "2s" }

curl http://localhost:3000/api/stats
# Expected: { "total_devices": N, ... }
```

**Phase 3: Manual Verification**
1. Verify `/api/stats` counts match the entities seeded in previous milestones.

#### Deliverables Checklist
- [ ] `app/api/health/route.ts` created
- [ ] `app/api/stats/route.ts` created with entity count queries

#### Definition of Done
✅ Code compiles without errors
✅ Integration tests pass
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(api): implement health and stats endpoints`

#### Common Issues & Solutions
**Issue**: `getEntityCount()` is not a function in SDK.
**Solution**: Fallback to `fetch()` and checking `result.length` or a pagination total property if SDK v0.6.8 doesn't support the count method directly. [GAP: Will implement with `.fetch()` and array length as safe fallback if exact method fails].

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M-final.1 - Implement Health & Stats Utility Endpoints
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 6
- Spec: /health returns ok/braga/2s; /stats returns total counts for 4 entities using getEntityCount()

BUILD INSTRUCTIONS:
1. Create app/api/health/route.ts returning static object.
2. Create app/api/stats/route.ts.
3. Query counts using buildQuery().where(...).getEntityCount() for each entity type.
4. Return totals.

TESTING PROTOCOL:
1. curl /api/health → Expected: 200 OK
2. curl /api/stats → Expected: JSON with numeric totals

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M-final.1: Implement Health & Stats Utility Endpoints - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Endpoint (GET health, GET stats)
**Tests**: Unit ✅ N/A | Integration ✅ 1/1
**Issues**: [any + resolution]
**Next Step**: Step M-final.2
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M-final.2: Implement useArkivWalletClient Hook
**Duration**: 45 minutes
**Objective**: Create the `useArkivWalletClient` hook to enable direct MetaMask-signed writes, bypassing the server ownership transfer where needed.
**Risk**: Medium - Integrating wagmi wallet state with Arkiv SDK transport requires careful configuration.
**Prerequisites**: Milestone 4 complete.
**Testing Type**: Manual

#### Blueprint Binding (MANDATORY)
- **Schema used**: None
- **Agent spec**: Browser-based `WalletClient`
- **Endpoints built**: None
- **External services**: None
- **UI components**: None
- **Constraints applied**: C4 (`useArkivWalletClient()` hook from Arkiv React docs using `transport: custom(wagmiWalletClient.transport)`)
- **Blueprint section**: Section 11 (C4)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
A React hook that bridges wagmi's wallet connection to the Arkiv SDK's `createWalletClient`.

**Key Files/Modules:**
1. `lib/useArkivWalletClient.ts` - Custom hook

**Implementation Approach:**
- Use wagmi's `useWalletClient` to get the browser EIP-1193 provider.
- Initialize Arkiv's `createWalletClient` using `transport: custom(wagmiClient.transport)`.
- Return the Arkiv client instance.

#### Build Instructions (Atomic Steps)
1. Create `lib/useArkivWalletClient.ts`.
2. Import `useWalletClient` from `wagmi` and `createWalletClient` from `@arkiv-network/sdk`.
3. Export `function useArkivWalletClient()`.
4. Inside, call `const { data: wagmiClient } = useWalletClient()`.
5. If `wagmiClient` exists, initialize Arkiv client: `const arkivClient = createWalletClient({ chain: braga, transport: custom(wagmiClient.transport) })`. [GAP: Exact `createWalletClient` arguments inferred from C4 description and standard viem/Arkiv patterns].
6. Return `{ arkivWalletClient: arkivClient, isConnected: !!wagmiClient }`.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
pnpm run build
# Expected: No type errors.
```

**Phase 3: Manual Verification**
1. Connect wallet in UI.
2. Log output of `useArkivWalletClient` to console → Verify it returns an Arkiv client object when connected.

#### Deliverables Checklist
- [ ] `lib/useArkivWalletClient.ts` created
- [ ] Hook utilizes `custom(wagmiWalletClient.transport)`
- [ ] Returns null/undefined when wallet is disconnected

#### Definition of Done
✅ Code compiles without errors
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(hooks): implement useArkivWalletClient hook`

#### Common Issues & Solutions
**Issue**: Type mismatch between wagmi transport and Arkiv `custom` transport.
**Solution**: Ensure viem versions align (both use 2.50.4 implicitly or explicitly).

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M-final.2 - Implement useArkivWalletClient Hook
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 11
- Constraint C4: transport: custom(wagmiWalletClient.transport)

BUILD INSTRUCTIONS:
1. Create lib/useArkivWalletClient.ts.
2. Use wagmi useWalletClient.
3. Initialize Arkiv createWalletClient with custom transport.
4. Return client object.

TESTING PROTOCOL:
1. pnpm run build → Expected: success

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M-final.2: Implement useArkivWalletClient Hook - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Component (useArkivWalletClient C4)
**Tests**: Unit ✅ N/A | Integration ✅ 1/1
**Issues**: [any + resolution]
**Next Step**: Step M-final.3
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M-final.3: Polish UI - Loading States, Error Boundaries, & Mobile Responsiveness
**Duration**: 60 minutes
**Objective**: Add loading skeletons, empty states, error boundaries, and mobile-responsive collapsing to the map sidebar as specified in Phase 5.
**Risk**: Low - UI enhancement.
**Prerequisites**: Step M-final.2 complete.
**Testing Type**: Manual

#### Blueprint Binding (MANDATORY)
- **Schema used**: None
- **Agent spec**: None
- **Endpoints built**: None
- **External services**: None
- **UI components**: General UI/UX
- **Constraints applied**: Mobile-responsive map sidebar (collapsible on small screens)
- **Blueprint section**: Section 7 (Phase 5)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
UI polish components and layout adjustments.

**Key Files/Modules:**
1. `components/ErrorBoundary.tsx` - [GAP: generic error boundary component]
2. `components/LoadingSkeleton.tsx` - [GAP: generic skeleton component]
3. `components/MapSidebar.tsx` - Updated for mobile collapse

**Implementation Approach:**
- Create generic Error Boundary and Loading Skeletons.
- Wrap data-fetching pages/components with them.
- Add a toggle button to `MapSidebar` that hides it on small screens.

#### Build Instructions (Atomic Steps)
1. Create `components/ErrorBoundary.tsx` using standard React error boundary pattern.
2. Create `components/LoadingSkeleton.tsx` with Tailwind pulse animations.
3. Wrap `MeshMap`, `/query`, `/dashboard`, `/alerts` pages/components with Error Boundary and show Skeletons when `isLoading` is true from data fetching hooks.
4. Add empty state components (e.g., "No devices found") when fetch returns empty arrays.
5. Update `components/MapSidebar.tsx`. Add state `isCollapsed`. On screens `< md` (Tailwind), default to collapsed. Add a hamburger button to toggle.
6. Adjust `MeshMap` layout to take full width when sidebar is collapsed.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
pnpm run dev
# Resize browser to mobile width. Expected: Sidebar collapses, toggle appears.
```

**Phase 3: Manual Verification**
1. Throttle network in DevTools → Verify skeletons appear.
2. Force an API error → Verify error boundary catches and displays fallback.

#### Deliverables Checklist
- [ ] Error Boundary implemented and applied
- [ ] Loading Skeletons implemented and applied
- [ ] Empty states implemented
- [ ] Mobile-responsive collapsible sidebar implemented

#### Definition of Done
✅ Code compiles without errors
✅ No linting errors
✅ Blueprint binding verified (no invented details)
✅ Git commit: `feat(ui): add polish, error boundaries, and mobile responsiveness`

#### Common Issues & Solutions
**Issue**: Next.js App Router Server Components do not support standard React Error Boundaries (Client Component only).
**Solution**: Use Next.js `error.tsx` convention for route-level boundaries, or ensure boundaries are in Client Components.

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M-final.3 - Polish UI - Loading States, Error Boundaries, & Mobile Responsiveness
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 7
- Requirement: Loading skeletons, error boundaries, empty states, mobile-responsive sidebar

BUILD INSTRUCTIONS:
1. Create ErrorBoundary and LoadingSkeleton components.
2. Apply to data fetching paths.
3. Add empty state displays.
4. Update MapSidebar with collapse toggle for mobile.

TESTING PROTOCOL:
1. Resize to mobile → Expected: sidebar collapses.
2. Throttle network → Expected: skeletons show.

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M-final.3: Polish UI - Loading States, Error Boundaries, & Mobile Responsiveness - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Feature (Phase 5 Polish)
**Tests**: Unit ✅ N/A | Integration ✅ N/A
**Issues**: [any + resolution]
**Next Step**: Step M-final.4
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M-final.4: Documentation & Demo Preparation
**Duration**: 60 minutes
**Objective**: Write the project README with setup instructions, environment variables, and faucet link, and prepare the demo video script.
**Risk**: Low - Documentation task.
**Prerequisites**: Step M-final.3 complete.
**Testing Type**: Manual

#### Blueprint Binding (MANDATORY)
- **Schema used**: None
- **Agent spec**: None
- **Endpoints built**: None
- **External services**: None
- **UI components**: None
- **Constraints applied**: None
- **Blueprint section**: Section 7 (Phase 5 & 6 - README, .env documentation, demo video)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
Project documentation and demo script.

**Key Files/Modules:**
1. `README.md` - Project documentation
2. `DEMO_SCRIPT.md` - [GAP: optional] Outline for recording

**Implementation Approach:**
- Document setup, env vars, and architecture clearly.
- Outline the 2-3 minute demo flow covering key blueprint features.

#### Build Instructions (Atomic Steps)
1. Rewrite `README.md` (overwrite Next.js default).
2. Add Sections: Project Vision, Tech Stack, Setup (pnpm install, .env.local config with exact variables from Extraction 8), Faucet Link (`https://braga.hoodi.arkiv.network/faucet`), Running Locally, Architecture Diagram (copy from Extraction 3).
3. Create `DEMO_SCRIPT.md`.
4. Outline flow: 1. Map View & Live Events. 2. Draw Bounding Box -> Mesh Query (multi-owner linkability). 3. Sensor Detail -> Calibration Lineage. 4. AI Anomaly Alert -> Owner/Creator split.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
N/A
```

**Phase 3: Manual Verification**
1. Read through README → Verify all required env vars are listed.

#### Deliverables Checklist
- [ ] `README.md` fully documented
- [ ] Demo script prepared

#### Definition of Done
✅ Blueprint binding verified (no invented details)
✅ Git commit: `docs: add readme and demo script`

#### Common Issues & Solutions
**Issue**: README forgets to mention funding the agent wallet.
**Solution**: Add explicit step: "Fund your AGENT_WALLET_ADDRESS using the Braga Faucet before running the app."

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M-final.4 - Documentation & Demo Preparation
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 7
- Requirements: README (setup, .env, faucet link), Demo video plan (map -> query -> detail -> alert)

BUILD INSTRUCTIONS:
1. Write README.md with Setup, Env Vars (AGENT_PRIVATE_KEY, etc), Faucet link.
2. Write DEMO_SCRIPT.md outlining the 2-3 min flow.

TESTING PROTOCOL:
1. Review README → Expected: Complete setup guide present.

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Git commit created

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M-final.4: Documentation & Demo Preparation - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Deliverable (README, Demo Video script)
**Tests**: Unit ✅ N/A | Integration ✅ N/A
**Issues**: [any + resolution]
**Next Step**: Step M-final.5
```
─────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────
### Step M-final.5: Vercel Deployment, Verification & Submission
**Duration**: 60 minutes
**Objective**: Deploy the application to Vercel, configure environment variables, verify the cron job, seed data, record the demo, and submit.
**Risk**: High - Production deployment variables might be missing; Vercel Cron might not trigger.
**Prerequisites**: Step M-final.4 complete.
**Testing Type**: E2E

#### Blueprint Binding (MANDATORY)
- **Schema used**: None
- **Agent spec**: Vercel Cron execution
- **Endpoints built**: None
- **External services**: Vercel, Arkiv Braga RPC, cron-job.org (fallback)
- **UI components**: None
- **Constraints applied**: Zero-config Next.js deployment, Vercel Hobby limits, Private key server-side only
- **Blueprint section**: Section 7 (Phase 6), Section 8 (Dependencies)

⚠️ Any detail NOT traceable to a uploaded blueprint extraction must be flagged as [GAP] rather than assumed.

#### What to Build
No new code. Deployment and configuration.

**Key Files/Modules:**
1. None

**Implementation Approach:**
- Push code to GitHub.
- Connect repo to Vercel.
- Set Environment Variables in Vercel dashboard.
- Deploy. Seed data. Verify Cron. Record. Submit.

#### Build Instructions (Atomic Steps)
1. Push final code to public GitHub repository.
2. Connect repository to Vercel (Hobby tier). Vercel auto-detects Next.js.
3. In Vercel Project Settings > Environment Variables, add: `AGENT_PRIVATE_KEY`, `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_RPC_URL`, `CRON_SECRET`, `AGENT_WALLET_ADDRESS`.
4. Trigger Redeploy in Vercel.
5. Once live, visit the Vercel URL. Connect MetaMask.
6. Seed data: Register 3 devices, submit 10 readings each, add 1 calibration via the UI.
7. Manually trigger `POST /api/agent/scan` using `curl -X POST <VERCEL_URL>/api/agent/scan -H "Authorization: Bearer <CRON_SECRET>"` to generate an anomaly.
8. Verify anomaly appears on map and alert feed.
9. (Optional) Setup cron-job.org to hit the scan endpoint every 5 minutes for the demo if more frequent scanning is desired.
10. Record the 2-3 minute demo video following the script.
11. Submit to `forms.arkiv.network/ethns-arkiv-challenge` with repo link, demo link, wallet address.

#### Testing Protocol (MANDATORY)

**Phase 1: Unit Tests**
```bash
N/A
```

**Phase 2: Local Integration**
```bash
N/A
```

**Phase 3: Manual Verification**
1. Vercel deployment succeeds without build errors.
2. Live URL loads and connects to Arkiv Braga testnet.
3. Seed data and anomaly alert appear on the production URL.
4. Demo video recorded and submission form completed.

#### Deliverables Checklist
- [ ] Application deployed to Vercel
- [ ] Environment variables configured securely (no leaks)
- [ ] Demo data seeded on production
- [ ] Anomaly scan executed successfully on production
- [ ] Demo video recorded
- [ ] Submission form completed

#### Definition of Done
✅ Code compiles without errors
✅ E2E flow verified on production
✅ Blueprint binding verified (no invented details)
✅ Git commit: `chore: final pre-deployment polish`

#### Common Issues & Solutions
**Issue**: Vercel build fails due to missing env vars at build time.
**Solution**: Ensure `NEXT_PUBLIC_*` vars are set in Vercel before deploying.

**Issue**: Vercel Cron silently fails to run or hits 12/day limit.
**Solution**: Use the manual `curl` method for demo prep, and rely on cron-job.org fallback for frequent demo scanning as specified in G3.

#### AI Agent Prompt
```
═══════════════════════════════════════════════════════════════
IMPLEMENTATION TASK: Step M-final.5 - Vercel Deployment, Verification & Submission
═══════════════════════════════════════════════════════════════

CONTEXT (from Blueprint):
- Project: MeshOwn
- Blueprint Section: 7, 8, 10
- Constraints: Vercel zero-config, env vars, cron limits, submission link

BUILD INSTRUCTIONS:
1. Push to GitHub.
2. Connect to Vercel.
3. Set Env Vars (AGENT_PRIVATE_KEY, etc).
4. Deploy.
5. Seed data on production URL.
6. Trigger /api/agent/scan manually.
7. Record Demo Video.
8. Submit to forms.arkiv.network/ethns-arkiv-challenge.

TESTING PROTOCOL:
1. Live URL functional → Expected: Map loads, data seeded, alert visible.

DEFINITION OF DONE:
- [ ] All code written and compiles
- [ ] No blueprint details invented
- [ ] Submission complete

OUTPUT FORMAT:
1. All created/modified files with full content
2. Test results (terminal output)
3. Confirmation all Definition of Done items complete
═══════════════════════════════════════════════════════════════
```

#### Progress Tracking Update
```markdown
### ✅ Step M-final.5: Vercel Deployment, Verification & Submission - COMPLETED
**Date**: [YYYY-MM-DD HH:MM]
**Duration**: [actual time]
**Blueprint Elements Covered**: Infra (Vercel, Cron), Deliverable (Demo, Submission)
**Tests**: Unit ✅ N/A | Integration ✅ N/A | E2E ✅ 1/1
**Issues**: [any + resolution]
**Next Step**: Project Complete
```
─────────────────────────────────────────────────────────────

---

## Appendix A: Testing Strategy

### 1. Unit Testing
- **Scope**: Pure logic functions (e.g., Quality Score calculations, Zod schemas, nonce TTL validation).
- **Tools**: Vitest or Jest.
- **Execution**: Run locally via `pnpm test`. Must not require network connections or wallet funds.

### 2. Integration Testing
- **Scope**: Next.js API Routes interacting with the Arkiv Braga Testnet.
- **Tools**: `curl` scripts, Postman, or TS scripts using `fetch`.
- **Execution**: Requires `AGENT_PRIVATE_KEY` and funded wallet in `.env.local`. Verifies entity creation, query filtering, and ownership transfers.

### 3. End-to-End (E2E) Testing
- **Scope**: Full user flows from UI interaction to on-chain state verification.
- **Tools**: Manual interaction with Next.js dev server, MetaMask, and Arkiv Explorer.
- **Execution**: Manual verification following step-specific checklists.

### 4. Manual/Explorer Verification
- **Scope**: Confirming on-chain state matches application intent.
- **Process**: After write operations, inspect the resulting entity on `https://explorer.braga.hoodi.arkiv.network` to validate attributes, `$owner`, `$creator`, and `expiresIn`.

---

## Appendix B: Error Handling Protocol

### API Route Errors
1.  **Validation Errors (400)**: Return JSON `{ error: "Validation failed", details: [...] }` using Zod's error formatting.
2.  **Auth Errors (401/403)**:
    - Missing/Invalid Nonce: `401 Unauthorized`
    - Invalid Signature: `401 Unauthorized`
    - Mismatched Ownership (e.g., non-owner trying to delete): `403 Forbidden`
3.  **Arkiv RPC Errors (500/502)**: Catch SDK errors. If the Arkiv node is unreachable, return `503 Service Unavailable`. Log the specific SDK error message.
4.  **GLM Funding Errors**: If `createEntity` fails due to insufficient funds, log critical error and return `500 Internal Server Error` with a specific message for the dev team to fund the agent wallet.

### Client-Side Errors
1.  **Error Boundaries**: Wrap major components (`MeshMap`, `Dashboard`) in React Error Boundaries to prevent full page crashes.
2.  **Transaction Rejections**: If a user rejects a MetaMask signature, display a non-intrusive toast notification ("Transaction cancelled") rather than a modal error.
3.  **Query Failures**: Use `@tanstack/react-query`'s `onError` to display toast notifications for data fetching failures.

---

## Appendix C: Progress Tracking System

### `progress.md` File
Maintain a `progress.md` file in the repository root. Update it at the completion of every Step.

**Format:**
```markdown
# MeshOwn Progress

## Milestone 0
- [x] Step M.0.1: Scaffold Next.js App (Completed 2023-10-27)
- [ ] Step M.0.2: Configure Environment Variables

## Current Blockers
- None
```

### Git Commits
Every atomic step completion must result in a Git commit using the standard defined in Appendix F.

---

## Appendix D: Deployment Checklist

Pre-deployment and production environment verification:

- [ ] **Environment Variables**: All vars in `.env.local` are configured in Vercel Project Settings.
  - `AGENT_PRIVATE_KEY` (Server-only)
  - `AGENT_WALLET_ADDRESS`
  - `NEXT_PUBLIC_CHAIN_ID`
  - `NEXT_PUBLIC_RPC_URL`
  - `CRON_SECRET`
- [ ] **Wallet Funding**: `AGENT_WALLET_ADDRESS` holds sufficient testnet GLM for entity creation (consider H5 TTL costs).
- [ ] **Cron Configuration**: `vercel.json` is present and correctly defines the `0 */2 * * *` schedule for `/api/agent/scan`.
- [ ] **Cron Secret**: The `/api/agent/scan` endpoint strictly validates the `Authorization: Bearer <CRON_SECRET>` header.
- [ ] **Build Success**: `pnpm run build` completes with zero errors.
- [ ] **Seed Data**: Production instance has 3 registered devices and historical readings.
- [ ] **Demo Video**: 2-3 minute video recorded and uploaded.
- [ ] **Submission**: Form at `forms.arkiv.network/ethns-arkiv-challenge` submitted with Repo link, Demo link, and Wallet address.

---

## Appendix E: Communication Templates

### Daily Standup / Status Update
```text
**Progress:** Completed Step [X.Y] - [Name]. Entity creation verified on testnet.
**Next:** Starting Step [X.Z] - [Name].
**Blockers:** None / [e.g., Arkiv Braga RPC returning 429 rate limits]
```

### Blocker Report
```text
🚨 **BLOCKER**: Step [X.Y]
**Issue**: [Description, e.g., `createEntity` throws "Insufficient GLM" despite faucet funding]
**Impact**: Cannot proceed with write operations.
**Attempted**: Checked env vars, verified explorer balance.
**Assistance Needed**: Check if agent wallet address matches funded address.
```

---

## Appendix F: Git Workflow & Commit Standards

### Branching Strategy
Given the hackathon timeline (8 Days), a simplified trunk-based workflow is recommended:
- **Main Branch**: `main`
- **Feature Branches**: `feat/m0-foundation`, `feat/m1-entities` (optional, can commit directly to `main` if solo dev, but recommended for clean PR history).

### Commit Message Format
Use Conventional Commits strictly.

**Structure:** `type(scope): description`

**Types:**
- `feat`: A new feature or endpoint.
- `fix`: A bug fix.
- `docs`: Documentation changes.
- `style`: Formatting, missing semi colons.
- `refactor`: Code restructuring without changing behavior.
- `test`: Adding missing tests.
- `chore`: Build process, auxiliary tools, env setup.

**Scopes:**
- `api`: Next.js API routes.
- `ui`: Frontend components.
- `sdk`: Arkiv SDK integration/clients.
- `auth`: Wallet verification logic.
- `agent`: AI Anomaly scan logic.

**Examples:**
- `feat(api): implement POST /api/device/register`
- `fix(ui): resolve leaflet ssr crash with next/dynamic`
- `feat(auth): add nonce generation and verification`
- `chore(init): scaffold next-app and install dependencies`

---

## Quick Reference Cards

### Environment Variables
| Variable | Scope | Example / Value |
|---|---|---|
| `AGENT_PRIVATE_KEY` | Server | `0x...` (Do not expose) |
| `AGENT_WALLET_ADDRESS` | Server | `0x...` |
| `NEXT_PUBLIC_CHAIN_ID` | Client/Server | `60138453102` |
| `NEXT_PUBLIC_RPC_URL` | Client/Server | `https://braga.hoodi.arkiv.network/rpc` |
| `CRON_SECRET` | Server | `<uuid-string>` |

### Arkiv SDK Core Imports
```typescript
import { createPublicClient, createWalletClient, buildQuery, createEntity, updateEntity } from "@arkiv-network/sdk";
import { eq, gt, lt, gte, lte, desc } from "@arkiv-network/sdk/query";
import { ExpirationTime } from "@arkiv-network/sdk"; // Inferred from fromDays usage
```

### Key Architecture Constraints
1. **No `expiresIn: null`**: Use `ExpirationTime.fromDays(3650)` for permanent entities.
2. **No WebSocket**: Use `subscribeEntityEvents(handlers, 5000)` for polling.
3. **No `~` Glob**: Use `eq()` for string attributes in queries.
4. **Strict Server Key**: `AGENT_PRIVATE_KEY` must never be sent to the browser.
5. **Ownership Split**: Agent creates entity -> `changeOwnership` to user.

### Network Endpoints
- **RPC**: `https://braga.hoodi.arkiv.network/rpc`
- **Faucet**: `https://braga.hoodi.arkiv.network/faucet`
- **Explorer**: `https://explorer.braga.hoodi.arkiv.network`
