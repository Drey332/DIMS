import fs from "fs/promises";
import path from "path";
import { FireIncident, FireIncidentZ } from "@shared/fire-intel/schema";
import { fireIntelStorage } from "./storage";

export async function ensureFireIncidentSeeds(seedFile?: string): Promise<void> {
  const filePath = seedFile ?? path.join(process.cwd(), "data", "fire-incidents.seed.json");
  
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const arr = JSON.parse(raw) as unknown[];
    const valid: FireIncident[] = [];

    for (const rec of arr) {
      const parsed = FireIncidentZ.safeParse(rec);
      if (!parsed.success) {
        console.error("❌ Invalid fire incident record:", parsed.error.flatten());
        continue;
      }
      valid.push(parsed.data);
    }

    for (const incident of valid) {
      await fireIntelStorage.upsertIncident(incident);
    }

    console.log(`🔥 Fire Intelligence: Loaded ${valid.length} historical incidents (${valid.map(i => i.name).join(", ")})`);
  } catch (error) {
    console.error("❌ Failed to load fire incident seeds:", error);
  }
}

export function toKnowledgeText(incident: FireIncident): string {
  const head = `${incident.name} (${incident.dateUtc}) — ${incident.location}`;
  const facts = [
    `Industry: ${incident.industry}, Phase: ${incident.operationPhase}`,
    `Initiating event: ${incident.initiatingEvent}`,
    `Ignition: ${incident.ignitionSource ?? "unknown"}, Fuel: ${incident.fuel.join(", ")}`,
    `Protection systems: ${JSON.stringify(incident.protectionSystems)}`,
    `Fatalities: ${incident.fatalities}${incident.injuries ? `, Injuries: ${incident.injuries}` : ""}`,
    `Barriers failed: ${incident.barriersFailed.join("; ")}`,
    `Lessons: ${incident.lessons.join("; ")}`
  ].join("\n");
  
  const timeline = incident.timeline.map(t => `- ${t.t}: ${t.event}`).join("\n");
  const sources = incident.sources.map(s => `- ${s.title}: ${s.url}`).join("\n");
  
  return `${head}\n${facts}\nTimeline:\n${timeline}\nSources:\n${sources}`;
}
