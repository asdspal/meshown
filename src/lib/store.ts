"use client";

import { create } from "zustand";

/**
 * MeshOwn global client state (Zustand).
 *
 * Blueprint §3 — State Management Strategy:
 *   walletAddress, selectedSensorKey, boundingBox, meshQueryResults,
 *   isQuerying, minQualityScore (G9), selectedSensorType (G9), timeRangeHours (G9)
 *
 * Client-only, not persisted. Server state (readings, devices, alerts) is
 * fetched directly from Arkiv via publicClient.buildQuery().
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/** Shape of a single reading result from a mesh query (matches Arkiv Reading entity). */
export interface MeshReading {
  entityKey: string;
  deviceKey: string;
  owner: string;
  lat: number;
  lng: number;
  value: number;
  unit: string;
  qualityScore: number;
  timestamp: number;
  sensorType: string;
  calibrationValid: boolean;
}

export interface MeshStore {
  // ── Map mode ────────────────────────────────────────────
  /** Current map interaction mode — controls draw controls visibility */
  mapMode: "browse" | "query";
  setMapMode: (mode: "browse" | "query") => void;

  // ── Wallet ──────────────────────────────────────────────
  /** Connected wallet address from wagmi useAccount() */
  walletAddress: string | null;
  setWalletAddress: (addr: string | null) => void;

  // ── Selected sensor ─────────────────────────────────────
  /** Arkiv entityKey of the focused sensor (clicked on map) */
  selectedSensorKey: string | null;
  setSelectedSensorKey: (key: string | null) => void;

  // ── Bounding box ────────────────────────────────────────
  /** Researcher's drawn bbox — sw = south-west corner, ne = north-east corner */
  boundingBox: { sw: LatLng; ne: LatLng } | null;
  setBoundingBox: (bbox: { sw: LatLng; ne: LatLng } | null) => void;

  // ── Mesh query state ────────────────────────────────────
  /** Last mesh query result set */
  meshQueryResults: MeshReading[];
  setMeshQueryResults: (results: MeshReading[]) => void;

  /** Loading state for mesh query */
  isQuerying: boolean;
  setIsQuerying: (v: boolean) => void;

  // ── Query filters [G9] ──────────────────────────────────
  /** Minimum quality score filter 0–100 (default 70) */
  minQualityScore: number;
  setMinQualityScore: (v: number) => void;

  /** Sensor type filter (default "all") */
  selectedSensorType: string;
  setSelectedSensorType: (v: string) => void;

  /** Time range in hours: 1 | 6 | 24 (default 24) */
  timeRangeHours: number;
  setTimeRangeHours: (v: number) => void;
}

export const useMeshStore = create<MeshStore>()((set) => ({
  // Map mode
  mapMode: "browse",
  setMapMode: (mode) => set({ mapMode: mode }),

  // Wallet
  walletAddress: null,
  setWalletAddress: (addr) => set({ walletAddress: addr }),

  // Selected sensor
  selectedSensorKey: null,
  setSelectedSensorKey: (key) => set({ selectedSensorKey: key }),

  // Bounding box
  boundingBox: null,
  setBoundingBox: (bbox) => set({ boundingBox: bbox }),

  // Mesh query state
  meshQueryResults: [],
  setMeshQueryResults: (results) => set({ meshQueryResults: results }),
  isQuerying: false,
  setIsQuerying: (v) => set({ isQuerying: v }),

  // Query filters [G9]
  minQualityScore: 70,
  setMinQualityScore: (v) => set({ minQualityScore: v }),
  selectedSensorType: "all",
  setSelectedSensorType: (v) => set({ selectedSensorType: v }),
  timeRangeHours: 24,
  setTimeRangeHours: (v) => set({ timeRangeHours: v }),
}));
