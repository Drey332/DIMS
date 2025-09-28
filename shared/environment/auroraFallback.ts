export interface AuroraFallbackDatum {
  latitude: number;
  longitude: number;
  probability: number;
  intensity?: number;
}

export interface AuroraFallbackDataset {
  forecastTime: string;
  hemispherePower: {
    north: number;
    south: number;
  };
  estimatedKp: number;
  points: AuroraFallbackDatum[];
  metadata: {
    note: string;
    source: string;
  };
}

export const auroraFallbackDataset: AuroraFallbackDataset = {
  forecastTime: "2023-09-12T18:00:00Z",
  hemispherePower: {
    north: 37.5,
    south: 28.9,
  },
  estimatedKp: 5.3,
  points: [
    { latitude: 66.0, longitude: -40.0, probability: 78, intensity: 0.82 },
    { latitude: 64.0, longitude: -20.0, probability: 71, intensity: 0.77 },
    { latitude: 61.0, longitude: -100.0, probability: 64, intensity: 0.65 },
    { latitude: 40.793, longitude: -77.863, probability: 14, intensity: 0.18 },
  ],
  metadata: {
    note: "Approximate archival snapshot aligned with the Earth Nullschool aurora overlay for 2023-09-12 18:00Z.",
    source: "NOAA SWPC OVATION Aurora Forecast (via earth.nullschool.net)",
  },
};
