import type { Express, Request, Response } from "express";
import { lookupLocationIntel } from "@shared/environment/locationIntel";
import { getEnvContext } from "../env-intel";
import {
  searchVectors,
  getKnowledgeItem,
  type VectorSearchResult,
} from "../fire-intel/store";
import { FIRE_INCIDENT_DOMAIN } from "../fire-intel/ingest";
import type { FireIncident } from "@shared/fire-intel/schema";

export interface MatchRequest {
  query?: string;
  location?: string;
  lat?: number;
  lon?: number;
  whenUtc?: string;
  phase?:
    | "production"
    | "drilling"
    | "completion"
    | "maintenance"
    | "construction"
    | "unknown";
}

export interface BoostContribution {
  reason: string;
  delta: number;
}

export interface IncidentMatch {
  id: string;
  title: string;
  location?: string;
  dateUtc?: string;
  operationPhase?: string;
  lessons: string[];
  officialFindings: string[];
  sources: Array<{ title: string; url: string }>;
  score: number;
  similarity: number;
  boosts: BoostContribution[];
}

export interface IncidentMatchResponse {
  context: { lat: number; lon: number; season: string; whenUtc: string; phase: string };
  matches: IncidentMatch[];
}

type BoostedResult = {
  result: VectorSearchResult;
  metadata: Record<string, any>;
  boostedScore: number;
  contributions: BoostContribution[];
};

function parseNumber(value: unknown): number | undefined {
  const numeric =
    typeof value === "string"
      ? Number.parseFloat(value)
      : typeof value === "number"
        ? value
        : undefined;
  return Number.isFinite(numeric ?? NaN) ? (numeric as number) : undefined;
}

function seasonFrom(lat: number, iso: string): "winter" | "spring" | "summer" | "fall" {
  const date = new Date(iso);
  const month = Number.isNaN(date.getTime()) ? new Date().getUTCMonth() + 1 : date.getUTCMonth() + 1;
  const north = lat >= 0;
  const northSeasons: Record<number, "winter" | "spring" | "summer" | "fall"> = {
    1: "winter",
    2: "winter",
    3: "spring",
    4: "spring",
    5: "spring",
    6: "summer",
    7: "summer",
    8: "summer",
    9: "fall",
    10: "fall",
    11: "fall",
    12: "winter",
  };
  const southSeasons: Record<number, "winter" | "spring" | "summer" | "fall"> = {
    1: "summer",
    2: "summer",
    3: "fall",
    4: "fall",
    5: "fall",
    6: "winter",
    7: "winter",
    8: "winter",
    9: "spring",
    10: "spring",
    11: "spring",
    12: "summer",
  };
  const lookup = north ? northSeasons : southSeasons;
  return lookup[month] ?? "summer";
}

export async function computeIncidentMatches(request: MatchRequest): Promise<IncidentMatchResponse> {
  const locationIntel = lookupLocationIntel(request.location);
  const lat = request.lat ?? locationIntel?.latitude ?? 0;
  const lon = request.lon ?? locationIntel?.longitude ?? 0;
  const whenUtc = request.whenUtc ?? new Date().toISOString();
  const season = seasonFrom(lat, whenUtc);

  let env: any = null;
  try {
    env = await getEnvContext(lat, lon);
  } catch (error) {
    console.warn("Failed to gather environmental context for incident matching", error);
  }

  const vectorResults = await searchVectors({
    namespace: "fire_incident:v0",
    query: request.query ?? "offshore fire explosion lessons barriers",
    k: 8,
  });

  const boosted: BoostedResult[] = vectorResults
    .map((result) => {
      const metadata = (result.metadata ?? {}) as Record<string, any>;
      const baseScore = typeof result.score === "number" ? result.score : 0;
      let boostedScore = baseScore;
      const contributions: BoostContribution[] = [
        { reason: "Semantic similarity", delta: baseScore },
      ];

      if (request.phase && metadata.phase === request.phase) {
        boostedScore += 0.15;
        contributions.push({ reason: "Operation phase alignment", delta: 0.15 });
      }

      const incidentLat = typeof metadata.latitude === "number" ? metadata.latitude : undefined;
      if (incidentLat !== undefined && Number.isFinite(lat)) {
        const latDifference = Math.abs(Math.abs(lat) - Math.abs(incidentLat));
        if (latDifference < 10) {
          boostedScore += 0.1;
          contributions.push({ reason: "Similar latitude band", delta: 0.1 });
        }
      }

      if (typeof lon === "number" && Number.isFinite(lon)) {
        const basinMeta = typeof metadata.basin === "string" ? metadata.basin : undefined;
        if (basinMeta && basinMeta.includes("Atlantic") && Math.abs(lon) < 100) {
          boostedScore += 0.05;
          contributions.push({ reason: "Atlantic basin alignment", delta: 0.05 });
        }
      }

      const metadataSeason = typeof metadata.season === "string" ? metadata.season : undefined;
      if (metadataSeason === season) {
        boostedScore += 0.05;
        contributions.push({ reason: "Seasonal alignment", delta: 0.05 });
      }

      const windSpeed = env?.wind?.currentSpeed ?? env?.marine?.currentSpeed;
      const tags = Array.isArray(metadata.tags) ? metadata.tags : [];
      if (typeof windSpeed === "number" && windSpeed > 12 && tags.includes("explosion")) {
        boostedScore += 0.05;
        contributions.push({ reason: "High wind escalation pattern", delta: 0.05 });
      }

      return { result, metadata, boostedScore, contributions };
    })
    .sort((a, b) => b.boostedScore - a.boostedScore)
    .slice(0, 2);

  const matches: IncidentMatch[] = await Promise.all(
    boosted.map(async ({ result, metadata, boostedScore, contributions }) => {
      const knowledge = await getKnowledgeItem(FIRE_INCIDENT_DOMAIN, result.externalId);
      const payload = (knowledge?.payload ?? metadata) as Partial<FireIncident> & Record<string, any>;

      return {
        id: result.externalId,
        title: knowledge?.title ?? (typeof metadata.title === "string" ? metadata.title : result.externalId),
        location: payload.location ?? metadata.location,
        dateUtc: payload.dateUtc ?? metadata.dateUtc,
        operationPhase: payload.operationPhase ?? metadata.phase,
        lessons: Array.isArray(payload.lessons) ? payload.lessons : metadata.lessons ?? [],
        officialFindings: Array.isArray(payload.officialFindings)
          ? payload.officialFindings
          : metadata.officialFindings ?? [],
        sources: Array.isArray(payload.sources) ? payload.sources : metadata.sources ?? [],
        score: boostedScore,
        similarity: typeof result.score === "number" ? result.score : boostedScore,
        boosts: contributions,
      };
    })
  );

  return {
    context: { lat, lon, season, whenUtc, phase: request.phase ?? "unknown" },
    matches,
  };
}

export function registerIncidentMatchRoute(app: Express): void {
  app.get("/api/incidents/match", async (req: Request, res: Response) => {
    const request: MatchRequest = {
      query: typeof req.query.q === "string" ? req.query.q : undefined,
      location: typeof req.query.location === "string" ? req.query.location : undefined,
      lat: parseNumber(req.query.lat),
      lon: parseNumber(req.query.lon),
      whenUtc: typeof req.query.whenUtc === "string" ? req.query.whenUtc : undefined,
      phase: typeof req.query.phase === "string" ? (req.query.phase as MatchRequest["phase"]) : undefined,
    };

    try {
      const response = await computeIncidentMatches(request);
      res.json(response);
    } catch (error) {
      console.error("Failed to compute incident matches", error);
      res.status(500).json({ message: "Failed to compute incident matches" });
    }
  });
}
