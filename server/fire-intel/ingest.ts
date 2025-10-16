import fs from "node:fs/promises";
import path from "node:path";
import { FireIncidentZ, type FireIncident } from "@shared/fire-intel/schema";
import { toSeason, latBand, basin } from "./geo";
import {
  getKnowledgeItem,
  searchVectors,
  upsertKnowledgeItem,
  upsertVector,
} from "./store";
import { createFireIntelEmbedding } from "./embeddings";

export const FIRE_INCIDENT_DOMAIN = "fire_incident";
const DEFAULT_SEED_PATH = path.join(process.cwd(), "data", "fire-incidents.seed.json");

function toKnowledgeText(incident: FireIncident): string {
  const head = `${incident.name} (${incident.dateUtc}) — ${incident.location}`;
  const facts = [
    `Industry: ${incident.industry}, Phase: ${incident.operationPhase}`,
    `Initiating event: ${incident.initiatingEvent}`,
    `Ignition: ${incident.ignitionSource ?? "unknown"}, Fuel: ${incident.fuel.join(", ")}`,
    `Protection: ${JSON.stringify(incident.protectionSystems)}`,
    `Fatalities: ${incident.fatalities}${incident.injuries ? `, Injuries: ${incident.injuries}` : ""}`,
    `Barriers failed: ${incident.barriersFailed.join("; ")}`,
    `Lessons: ${incident.lessons.join("; ")}`,
  ].join("\n");
  const timeline = incident.timeline
    .map((entry) => `- ${entry.t}: ${entry.event}`)
    .join("\n");
  const sources = incident.sources.map((source) => `- ${source.title}: ${source.url}`).join("\n");

  return `${head}\n${facts}\nTimeline:\n${timeline}\nSources:\n${sources}`;
}

export async function ingestFireIncidents(seedFile: string = DEFAULT_SEED_PATH): Promise<number> {
  const fileContent = await fs.readFile(seedFile, "utf-8");
  const parsed = JSON.parse(fileContent) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Fire incident seed file must contain an array of incidents");
  }

  const incidents: FireIncident[] = [];

  for (const candidate of parsed) {
    const result = FireIncidentZ.safeParse(candidate);
    if (!result.success) {
      console.error("Invalid fire incident record", result.error.flatten());
      continue;
    }
    incidents.push(result.data);
  }

  for (const incident of incidents) {
    await upsertKnowledgeItem({
      domain: FIRE_INCIDENT_DOMAIN,
      externalId: incident.id,
      title: incident.name,
      payload: incident,
      tags: incident.tags,
    });

    const text = toKnowledgeText(incident);
    const embedding = await createFireIntelEmbedding(text);
    const approxLat =
      typeof incident.latitude === "number"
        ? incident.latitude
        : incident.location.includes("North Sea")
          ? 58.45
          : incident.location.includes("Gulf of Mexico")
            ? 28.74
            : 0;
    const approxLon =
      typeof incident.longitude === "number"
        ? incident.longitude
        : incident.location.includes("North Sea")
          ? -1.44
          : incident.location.includes("Gulf of Mexico")
            ? -88.39
            : 0;
    const season = toSeason(incident.dateUtc, approxLat);
    const envMeta = {
      season,
      latBand: latBand(approxLat),
      basin: basin(approxLat, approxLon),
    } as const;

    await upsertVector({
      externalId: incident.id,
      namespace: "fire_incident:v0",
      embedding,
      metadata: {
        title: incident.name,
        phase: incident.operationPhase,
        fatalities: incident.fatalities,
        tags: incident.tags,
        lessons: incident.lessons,
        location: incident.location,
        latitude: approxLat,
        longitude: approxLon,
        officialFindings: incident.officialFindings,
        sources: incident.sources,
        ...envMeta,
      },
      chunk: text,
    });
  }

  return incidents.length;
}

export async function ensureFireIncidentSeeds(seedFile: string = DEFAULT_SEED_PATH): Promise<boolean> {
  try {
    const existing = await getKnowledgeItem(FIRE_INCIDENT_DOMAIN, "PIPER-ALPHA-1988");
    if (existing) {
      return false;
    }
  } catch (error) {
    console.warn("Failed to read existing fire incident knowledge, continuing with ingestion:", error);
  }

  const count = await ingestFireIncidents(seedFile);
  return count > 0;
}

export async function searchFireIncidentContext(question: string, k = 4) {
  return searchVectors({ namespace: "fire_incident:v0", query: question, k });
}
