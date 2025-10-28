import fs from "fs/promises";
import path from "path";
import { storage } from "../storage";
import type { InsertFireIncident } from "@shared/schema";

export async function seedFireIncidents(): Promise<void> {
  try {
    const filePath = path.join(process.cwd(), "data", "fire-incidents.seed.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const incidents = JSON.parse(raw) as any[];

    console.log(`🔥 Loading ${incidents.length} fire incidents into PostgreSQL...`);

    for (const incident of incidents) {
      // Transform the data to match PostgreSQL schema
      const fireIncident: InsertFireIncident = {
        id: incident.id,
        name: incident.name,
        dateUtc: new Date(incident.dateUtc),
        industry: incident.industry,
        location: incident.location,
        latitude: incident.latitude?.toString(),
        longitude: incident.longitude?.toString(),
        operationPhase: incident.operationPhase,
        initiatingEvent: incident.initiatingEvent,
        ignitionSource: incident.ignitionSource,
        fuel: incident.fuel,
        detection: incident.detection,
        protectionSystems: incident.protectionSystems,
        humanFactors: incident.humanFactors,
        barriersFailed: incident.barriersFailed,
        fatalities: incident.fatalities,
        injuries: incident.injuries,
        assetLossUSD: incident.assetLossUSD_2025,
        releaseVolume: incident.releaseVolume,
        timeline: incident.timeline,
        officialFindings: incident.officialFindings,
        sources: incident.sources,
        lessons: incident.lessons,
        tags: incident.tags,
      };

      await storage.createFireIncident(fireIncident);
      console.log(`  ✓ Loaded: ${incident.name}`);
    }

    console.log(`🔥 Fire Intelligence: Successfully loaded ${incidents.length} historical incidents into PostgreSQL`);
  } catch (error) {
    console.error("❌ Failed to seed fire incidents:", error);
    throw error;
  }
}
