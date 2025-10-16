import { FireIncident, FireIncidentZ } from "@shared/fire-intel/schema";
import { toSeason, latBand, basin } from "@shared/fire-intel/geo";

interface FireIncidentEnriched extends FireIncident {
  season?: string;
  latBand?: string;
  basin?: string;
}

class FireIntelStorage {
  private incidents: Map<string, FireIncidentEnriched> = new Map();

  async upsertIncident(incident: FireIncident): Promise<void> {
    const validated = FireIncidentZ.parse(incident);
    
    const enriched: FireIncidentEnriched = {
      ...validated,
      season: validated.latitude ? toSeason(validated.dateUtc, validated.latitude) : undefined,
      latBand: validated.latitude ? latBand(validated.latitude) : undefined,
      basin: validated.latitude && validated.longitude ? basin(validated.latitude, validated.longitude) : undefined
    };
    
    this.incidents.set(validated.id, enriched);
  }

  async getIncident(id: string): Promise<FireIncidentEnriched | undefined> {
    return this.incidents.get(id);
  }

  async getAllIncidents(): Promise<FireIncidentEnriched[]> {
    return Array.from(this.incidents.values());
  }

  async searchIncidents(options: {
    phase?: string;
    location?: string;
    tags?: string[];
    limit?: number;
  }): Promise<FireIncidentEnriched[]> {
    let results = Array.from(this.incidents.values());

    if (options.phase) {
      results = results.filter(i => i.operationPhase === options.phase);
    }

    if (options.location) {
      const locationLower = options.location.toLowerCase();
      results = results.filter(i => 
        i.location.toLowerCase().includes(locationLower)
      );
    }

    if (options.tags && options.tags.length > 0) {
      results = results.filter(i => 
        options.tags!.some(tag => i.tags.includes(tag))
      );
    }

    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  async clear(): Promise<void> {
    this.incidents.clear();
  }

  get size(): number {
    return this.incidents.size;
  }
}

export const fireIntelStorage = new FireIntelStorage();
