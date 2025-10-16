import { z } from "zod";

export const FireIncidentZ = z.object({
  id: z.string(),
  name: z.string(),
  dateUtc: z.string(),
  industry: z.enum([
    "offshore_oil_gas",
    "mining",
    "onshore_oil_gas",
    "refining",
    "other",
  ]),
  location: z.string(),
  operationPhase: z.enum([
    "production",
    "drilling",
    "completion",
    "workover",
    "maintenance",
    "construction",
    "unknown",
  ]),
  initiatingEvent: z.string(),
  ignitionSource: z.string().optional(),
  fuel: z.array(z.string()),
  detection: z.array(z.string()),
  protectionSystems: z
    .object({
      delugeStatus: z
        .enum(["operational", "degraded", "failed", "not_installed"])
        .optional(),
      eStopIsolation: z
        .enum(["effective", "delayed", "failed", "not_attempted"])
        .optional(),
      blowoutPreventer: z
        .enum(["effective", "degraded", "failed", "not_applicable"])
        .optional(),
      fireWater: z
        .enum(["available", "insufficient", "failed", "not_applicable"])
        .optional(),
      alarmsPA: z
        .enum(["effective", "degraded", "failed", "not_applicable"])
        .optional(),
    })
    .partial(),
  humanFactors: z.array(z.string()),
  barriersFailed: z.array(z.string()),
  fatalities: z.number().min(0),
  injuries: z.number().min(0).optional(),
  assetLossUSD_2025: z.number().optional(),
  releaseVolume: z.string().optional(),
  timeline: z.array(z.object({ t: z.string(), event: z.string() })),
  officialFindings: z.array(z.string()),
  sources: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
    })
  ),
  lessons: z.array(z.string()),
  tags: z.array(z.string()),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type FireIncident = z.infer<typeof FireIncidentZ>;
