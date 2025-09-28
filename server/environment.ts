import { auroraFallbackDataset, type AuroraFallbackDataset, type AuroraFallbackDatum } from "@shared/environment/auroraFallback";
import { DEFAULT_OPERATION_COORDINATES } from "@shared/environment/locationIntel";
import { type AuroraEnvironmentalContext, type AuroraSeverityBand } from "@shared/environment/types";

const NOAA_OVATION_URL = "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json";

function buildAuroraMapUrl(latitude: number, longitude: number): string {
  const safeLatitude = Number.isFinite(latitude) ? latitude : DEFAULT_OPERATION_COORDINATES.latitude;
  const safeLongitude = Number.isFinite(longitude) ? longitude : DEFAULT_OPERATION_COORDINATES.longitude;

  const latString = safeLatitude.toFixed(3);
  const lonString = safeLongitude.toFixed(3);

  return `https://earth.nullschool.net/#current/space/primary/waves/anim=off/overlay=aurora/orthographic/loc=${lonString},${latString}`;
}

interface FetchAuroraOptions {
  latitude?: number;
  longitude?: number;
  timeoutMs?: number;
}

export async function getAuroraEnvironmentalContext(options: FetchAuroraOptions = {}): Promise<AuroraEnvironmentalContext> {
  const {
    latitude = DEFAULT_OPERATION_COORDINATES.latitude,
    longitude = DEFAULT_OPERATION_COORDINATES.longitude,
    timeoutMs = 8000,
  } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let payload: any | null = null;
  let fallbackUsed = false;

  try {
    const response = await fetch(NOAA_OVATION_URL, {
      signal: controller.signal,
      headers: {
        "User-Agent": "HydroSafe/1.0 (environmental-context)",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Aurora forecast request failed: ${response.status} ${response.statusText}`);
    }

    payload = await response.json();
  } catch (error) {
    console.error("Failed to retrieve live aurora data, using fallback dataset:", error);
    payload = buildPayloadFromFallback(auroraFallbackDataset);
    fallbackUsed = true;
  } finally {
    clearTimeout(timeout);
  }

  const observationTime = extractObservationTime(payload);
  const formattedObservationTime = observationTime ? formatTimestamp(observationTime) : null;

  const hemispherePower = extractHemispherePower(payload) ?? {};
  const northPower = sanitiseNumber(hemispherePower.north ?? hemispherePower.North);
  const southPower = sanitiseNumber(hemispherePower.south ?? hemispherePower.South);
  const averagePower = computeAveragePower(northPower, southPower);

  const estimatedKpValue = deriveKpIndex(payload, auroraFallbackDataset.estimatedKp, averagePower);
  const severity = classifySeverity(estimatedKpValue);
  const kpDescription = describeSeverity(severity);

  const points = extractPoints(payload);
  const maxProbability = findMaxProbability(points);
  const localEstimate = buildLocalEstimate(points, latitude, longitude);

  const summary = buildSummary({
    severity,
    estimatedKpValue,
    formattedObservationTime,
    fallbackUsed,
  });

  const analysis = buildAnalysis({
    severity,
    estimatedKpValue,
    localEstimate,
    averagePower,
    fallbackUsed,
  });

  const mapCenterLatitude = localEstimate?.latitude ?? latitude;
  const mapCenterLongitude = localEstimate?.longitude ?? longitude;
  const mapUrl = buildAuroraMapUrl(mapCenterLatitude, mapCenterLongitude);

  return {
    summary,
    observationTime,
    formattedObservationTime,
    hemisphericPower: {
      north: northPower,
      south: southPower,
      average: averagePower,
      units: "GW",
    },
    estimatedKp: {
      value: estimatedKpValue,
      severity,
      description: kpDescription,
    },
    maxProbability: maxProbability ?? undefined,
    localEstimate: localEstimate ?? undefined,
    analysis,
    dataSource: {
      name: "NOAA SWPC OVATION Aurora Forecast",
      attribution: "Visualized via earth.nullschool.net aurora overlay",
      datasetUrl: NOAA_OVATION_URL,
      mapUrl,
      fallbackUsed,
      note: fallbackUsed ? auroraFallbackDataset.metadata.note : undefined,
    },
  };
}

function buildPayloadFromFallback(dataset: AuroraFallbackDataset) {
  return {
    ForecastTime: dataset.forecastTime,
    HemispherePower: {
      North: dataset.hemispherePower.north,
      South: dataset.hemispherePower.south,
    },
    EstimatedKp: dataset.estimatedKp,
    Points: dataset.points.map((point) => ({
      Latitude: point.latitude,
      Longitude: point.longitude,
      Probability: point.probability,
      Intensity: point.intensity,
    })),
    Metadata: dataset.metadata,
  };
}

function extractObservationTime(payload: any): string | null {
  const candidates = [
    payload?.ForecastTime,
    payload?.forecastTime,
    payload?.ObservationTime,
    payload?.observationTime,
    payload?.observation_time,
    payload?.time,
    payload?.timestamp,
    payload?.Time,
    payload?.Metadata?.time,
  ];

  for (const candidate of candidates) {
    const parsed = parseTimestamp(candidate);
    if (parsed) return parsed;
  }
  return null;
}

function formatTimestamp(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return `${date.toUTCString().replace(" GMT", " UTC")}`;
}

function parseTimestamp(value: any): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const timestamp = value > 1e12 ? value : value * 1000;
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed);
      return parseTimestamp(numeric);
    }

    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
}

function extractHemispherePower(payload: any): Record<string, number> | null {
  const candidates = [
    payload?.HemispherePower,
    payload?.hemispherePower,
    payload?.HemPower,
    payload?.Hemisphere,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      return candidate;
    }
  }
  return null;
}

function sanitiseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number(value.toFixed(1));
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return Number(parsed.toFixed(1));
    }
  }
  return null;
}

function computeAveragePower(north: number | null, south: number | null): number | null {
  if (typeof north === "number" && typeof south === "number") {
    return Number(((north + south) / 2).toFixed(1));
  }
  if (typeof north === "number") return north;
  if (typeof south === "number") return south;
  return null;
}

function deriveKpIndex(payload: any, fallbackKp: number, averagePower: number | null): number | null {
  const candidates = [
    payload?.Kp,
    payload?.KP,
    payload?.kp,
    payload?.KpIndex,
    payload?.kpIndex,
    payload?.EstimatedKp,
    payload?.estimatedKp,
  ];

  for (const candidate of candidates) {
    const value = sanitiseNumber(candidate);
    if (value !== null) return clampKp(value);
  }

  if (averagePower !== null) {
    const derived = Number(((averagePower / 20) * 3).toFixed(1));
    return clampKp(derived);
  }

  return clampKp(fallbackKp);
}

function clampKp(value: number | null): number | null {
  if (value === null) return null;
  const clamped = Math.min(9, Math.max(0, value));
  return Number(clamped.toFixed(1));
}

function classifySeverity(kp: number | null): AuroraSeverityBand {
  if (kp === null) return "quiet";
  if (kp >= 6) return "storm";
  if (kp >= 4) return "active";
  return "quiet";
}

function describeSeverity(severity: AuroraSeverityBand): string {
  switch (severity) {
    case "storm":
      return "Geomagnetic storm-level activity. Expect significant auroral oval expansion and potential GNSS/HF comms impacts.";
    case "active":
      return "Active geomagnetic conditions. Aurora visible at lower latitudes with moderate space weather considerations.";
    default:
      return "Quiet geomagnetic conditions. Aurora confined to higher latitudes with minimal operational impact.";
  }
}

function extractPoints(payload: any): AuroraFallbackDatum[] {
  const results: AuroraFallbackDatum[] = [];

  const pushPoint = (lat: number | null, lon: number | null, probability: number | null, intensity?: number | null) => {
    if (lat === null || lon === null || probability === null) return;
    results.push({
      latitude: Number(lat.toFixed(3)),
      longitude: Number(lon.toFixed(3)),
      probability: Number(Math.max(0, Math.min(100, probability)).toFixed(1)),
      intensity: intensity !== undefined && intensity !== null && Number.isFinite(intensity)
        ? Number(intensity.toFixed(2))
        : undefined,
    });
  };

  const parsePointObject = (value: any) => {
    if (!value || typeof value !== "object") return;
    const lat = sanitiseNumber(value.lat ?? value.latitude ?? value.Latitude ?? value.y ?? value.Y);
    const lon = sanitiseNumber(value.lon ?? value.longitude ?? value.Longitude ?? value.x ?? value.X);
    const probability = sanitiseNumber(value.probability ?? value.Probability ?? value.value ?? value.intensity ?? value.Intensity);
    const intensity = sanitiseNumber(value.intensity ?? value.Intensity ?? value.power);
    pushPoint(lat, lon, probability, intensity);
  };

  const parseArray = (arr: any[]) => {
    for (const item of arr) {
      if (Array.isArray(item)) {
        const [lon, lat, probability, intensity] = item;
        pushPoint(sanitiseNumber(lat), sanitiseNumber(lon), sanitiseNumber(probability), sanitiseNumber(intensity));
      } else {
        parsePointObject(item);
      }
    }
  };

  const candidates = [
    payload?.Points,
    payload?.points,
    payload?.Coordinates,
    payload?.coordinates,
    payload?.Data,
    payload?.data,
    payload?.grid,
    payload?.Grid,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      parseArray(candidate);
    }
  }

  const features = payload?.features;
  if (Array.isArray(features)) {
    for (const feature of features) {
      const coords = feature?.geometry?.coordinates;
      const properties = feature?.properties;
      if (Array.isArray(coords)) {
        if (coords.length >= 2) {
          const lon = sanitiseNumber(coords[0]);
          const lat = sanitiseNumber(coords[1]);
          const probability = sanitiseNumber(coords[2] ?? properties?.probability ?? properties?.Probability);
          const intensity = sanitiseNumber(properties?.intensity ?? properties?.Intensity);
          pushPoint(lat, lon, probability, intensity);
        }
      } else if (typeof coords === "object" && coords) {
        const lon = sanitiseNumber(coords.lon ?? coords.longitude);
        const lat = sanitiseNumber(coords.lat ?? coords.latitude);
        const probability = sanitiseNumber(properties?.probability ?? properties?.Probability ?? coords.probability);
        pushPoint(lat, lon, probability);
      }
    }
  }

  return results;
}

function findMaxProbability(points: AuroraFallbackDatum[]): { probability: number; latitude: number; longitude: number } | null {
  if (!points.length) return null;
  let maxPoint = points[0];
  for (const point of points) {
    if (point.probability > maxPoint.probability) {
      maxPoint = point;
    }
  }
  return {
    probability: Number(maxPoint.probability.toFixed(1)),
    latitude: Number(maxPoint.latitude.toFixed(3)),
    longitude: Number(maxPoint.longitude.toFixed(3)),
  };
}

function buildLocalEstimate(points: AuroraFallbackDatum[], latitude: number, longitude: number) {
  if (!points.length) return null;

  let nearest: AuroraFallbackDatum | null = null;
  let shortestDistance = Number.POSITIVE_INFINITY;

  for (const point of points) {
    const distance = haversineDistance(latitude, longitude, point.latitude, point.longitude);
    if (distance < shortestDistance) {
      nearest = point;
      shortestDistance = distance;
    }
  }

  if (!nearest) return null;

  const summary = createLocalSummary(nearest, shortestDistance);

  return {
    latitude: nearest.latitude,
    longitude: nearest.longitude,
    probability: nearest.probability,
    intensity: nearest.intensity,
    distanceKm: Number(shortestDistance.toFixed(0)),
    summary,
  };
}

function createLocalSummary(point: AuroraFallbackDatum, distanceKm: number): string {
  const probabilityText = point.probability >= 40
    ? "elevated aurora probability"
    : point.probability >= 20
      ? "low-to-moderate aurora probability"
      : "minimal auroral probability";

  const distanceText = distanceKm <= 100
    ? "at the target location"
    : distanceKm <= 400
      ? `within ~${Math.round(distanceKm)} km`
      : `approximately ${Math.round(distanceKm)} km away`;

  return `${probabilityText} ${distanceText}`;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface SummaryInput {
  severity: AuroraSeverityBand;
  estimatedKpValue: number | null;
  formattedObservationTime: string | null;
  fallbackUsed: boolean;
}

function buildSummary({ severity, estimatedKpValue, formattedObservationTime, fallbackUsed }: SummaryInput): string {
  const kpText = estimatedKpValue !== null ? `estimated Kp index ${estimatedKpValue.toFixed(1)}` : "an unavailable Kp estimate";
  const timingText = formattedObservationTime ? `for ${formattedObservationTime}` : "for the latest forecast run";
  const severityText = severity === "storm"
    ? "storm-level auroral activity"
    : severity === "active"
      ? "active geomagnetic conditions"
      : "quiet geomagnetic background";

  const qualifier = fallbackUsed ? "Archived snapshot" : "Live forecast";
  return `${qualifier} ${timingText} indicates ${severityText} (${kpText}).`;
}

interface AnalysisInput {
  severity: AuroraSeverityBand;
  estimatedKpValue: number | null;
  localEstimate: ReturnType<typeof buildLocalEstimate>;
  averagePower: number | null;
  fallbackUsed: boolean;
}

function buildAnalysis({ severity, estimatedKpValue, localEstimate, averagePower, fallbackUsed }: AnalysisInput): string[] {
  const analysis: string[] = [];

  switch (severity) {
    case "storm":
      analysis.push("Expect significant geomagnetic disturbances. Plan for potential HF comms degradation, GNSS noise, and heightened space weather alerts.");
      break;
    case "active":
      analysis.push("Moderate geomagnetic activity could introduce intermittent navigation and communications noise—consider precautionary monitoring.");
      break;
    default:
      analysis.push("Geomagnetic background is quiet; minimal direct impact to offshore operations expected.");
      break;
  }

  if (typeof averagePower === "number") {
    analysis.push(`Average hemispheric power near ${averagePower.toFixed(1)} GW signals ${severity === "quiet" ? "limited" : "meaningful"} auroral oval expansion.`);
  }

  if (localEstimate) {
    analysis.push(`Nearest model node reports ${localEstimate.probability?.toFixed(1) ?? "--"}% probability ${localEstimate.summary}.`);
  }

  if (fallbackUsed) {
    analysis.push("Using archived NOAA OVATION data (Sep 12 2023 18:00 UTC) because the live feed was unreachable.");
  } else {
    analysis.push("Data pulled directly from NOAA SWPC OVATION, matching the Earth Nullschool aurora overlay.");
  }

  return analysis;
}
