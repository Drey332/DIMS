export type AuroraSeverityBand = "quiet" | "active" | "storm";

export interface AuroraEnvironmentalContext {
  summary: string;
  observationTime: string | null;
  formattedObservationTime: string | null;
  hemisphericPower: {
    north?: number | null;
    south?: number | null;
    average?: number | null;
    units: "GW";
  };
  estimatedKp: {
    value: number | null;
    severity: AuroraSeverityBand;
    description: string;
  };
  maxProbability?: {
    probability: number;
    latitude: number;
    longitude: number;
  };
  localEstimate?: {
    latitude: number;
    longitude: number;
    probability: number | null;
    intensity?: number | null;
    distanceKm?: number | null;
    summary: string;
  };
  analysis: string[];
  dataSource: {
    name: string;
    attribution: string;
    datasetUrl: string;
    mapUrl: string;
    fallbackUsed: boolean;
    note?: string;
  };
}
