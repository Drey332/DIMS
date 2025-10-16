import { fireIntelStorage } from "./storage";
import { toSeason, basin } from "@shared/fire-intel/geo";
import { lookupLocationIntel } from "@shared/environment/locationIntel";

interface MatchContext {
  query?: string;
  location?: string;
  lat?: number;
  lon?: number;
  whenUtc?: string;
  phase?: "production" | "drilling" | "completion" | "workover" | "maintenance" | "construction" | "unknown";
  environmentalContext?: any;
}

interface MatchedIncident {
  id: string;
  title: string;
  location?: string;
  dateUtc?: string;
  operationPhase?: string;
  lessons: string[];
  officialFindings: string[];
  sources: Array<{ title: string; url: string }>;
  score: number;
  matchReasons: string[];
}

export async function computeIncidentMatches(context: MatchContext): Promise<{
  context: {
    lat: number;
    lon: number;
    season: string;
    whenUtc: string;
    phase: string;
  };
  matches: MatchedIncident[];
}> {
  const locIntel = lookupLocationIntel(context.location);
  const lat = context.lat ?? locIntel?.latitude ?? 0;
  const lon = context.lon ?? locIntel?.longitude ?? 0;
  const when = context.whenUtc ?? new Date().toISOString();
  const season = toSeason(when, lat);
  const phase = context.phase ?? "unknown";

  const allIncidents = await fireIntelStorage.getAllIncidents();
  
  const scored = allIncidents.map(incident => {
    let score = 0.5; // Base similarity score
    const reasons: string[] = [];

    // Phase matching (strong signal)
    if (phase && incident.operationPhase === phase) {
      score += 0.20;
      reasons.push(`Same operation phase: ${phase}`);
    }

    // Geographic proximity
    if (incident.latitude && incident.longitude) {
      const latDiff = Math.abs(lat - incident.latitude);
      const lonDiff = Math.abs(lon - incident.longitude);
      
      if (latDiff < 10 && lonDiff < 10) {
        score += 0.15;
        reasons.push("Geographic proximity");
      }
    }

    // Seasonal matching
    if (incident.season === season) {
      score += 0.10;
      reasons.push(`Same season: ${season}`);
    }

    // Basin matching (computed from coordinates)
    if (incident.basin && locIntel?.latitude && locIntel?.longitude) {
      const currentBasin = basin(locIntel.latitude, locIntel.longitude);
      if (incident.basin === currentBasin) {
        score += 0.08;
        reasons.push("Same ocean basin");
      }
    }

    // Query text matching (simple keyword matching)
    if (context.query) {
      const queryLower = context.query.toLowerCase();
      const incidentText = `${incident.name} ${incident.lessons.join(" ")} ${incident.tags.join(" ")}`.toLowerCase();
      
      if (incidentText.includes(queryLower)) {
        score += 0.15;
        reasons.push("Query keyword match");
      }

      // Check for specific keywords
      const keywords = ["fire", "explosion", "blowout", "gas", "oil", "deluge"];
      for (const keyword of keywords) {
        if (queryLower.includes(keyword) && incidentText.includes(keyword)) {
          score += 0.05;
          reasons.push(`Keyword: ${keyword}`);
          break;
        }
      }
    }

    // Environmental context boosts
    if (context.environmentalContext) {
      const env = context.environmentalContext;
      
      // High wind conditions
      if (env.wind?.currentSpeed && env.wind.currentSpeed > 12) {
        if (incident.tags.includes("explosion")) {
          score += 0.05;
          reasons.push("High wind + explosion risk");
        }
      }

      // Severe weather
      if (env.marine?.waveHeights?.[0]?.height && env.marine.waveHeights[0].height > 3) {
        if (incident.tags.includes("evacuation")) {
          score += 0.05;
          reasons.push("Rough seas + evacuation scenario");
        }
      }
    }

    return {
      incident,
      score,
      reasons
    };
  });

  // Sort by score and take top 2
  const topMatches = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(({ incident, score, reasons }) => ({
      id: incident.id,
      title: incident.name,
      location: incident.location,
      dateUtc: incident.dateUtc,
      operationPhase: incident.operationPhase,
      lessons: incident.lessons || [],
      officialFindings: incident.officialFindings || [],
      sources: incident.sources || [],
      score,
      matchReasons: reasons
    }));

  return {
    context: {
      lat,
      lon,
      season,
      whenUtc: when,
      phase
    },
    matches: topMatches
  };
}
