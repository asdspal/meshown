import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// Entity Payload Schemas — Extraction 4 (Blueprint §4)
// These match the exact JSON payloads stored on Arkiv.
// ─────────────────────────────────────────────────────────────

/**
 * SensorDevice Payload
 * Blueprint §4 — Entity 1: SensorDevice
 * Registers a physical sensor. One entity per device.
 */
export const SensorDevicePayloadSchema = z.object({
  name: z.string().min(1, "Device name is required"),
  description: z.string(),
  manufacturer: z.string(),
  firmwareVersion: z.string(),
});

export type SensorDevicePayload = z.infer<typeof SensorDevicePayloadSchema>;

/**
 * Reading Payload
 * Blueprint §4 — Entity 2: Reading
 * A single sensor measurement. High volume, short TTL.
 */
export const ReadingPayloadSchema = z.object({
  value: z.number(),
  unit: z.string(),
  quality_score: z.number().int().min(0).max(100),
  calibration_key: z.string(),
  raw: z.record(z.string(), z.number()),
});

export type ReadingPayload = z.infer<typeof ReadingPayloadSchema>;

/**
 * CalibrationRecord Payload
 * Blueprint §4 — Entity 3: CalibrationRecord
 * Records sensor calibration events. Permanent provenance.
 */
export const CalibrationRecordPayloadSchema = z.object({
  offset_value: z.number(),
  offset_unit: z.string(),
  calibration_method: z.string(),
  notes: z.string(),
});

export type CalibrationRecordPayload = z.infer<
  typeof CalibrationRecordPayloadSchema
>;
