/*
 * Utility helpers for pulling live environmental intelligence:
 * - Aurora probabilities from NOAA SWPC OVATION: https://services.swpc.noaa.gov/json/ovation_aurora_latest.json
 * - Solar wind conditions from NOAA real-time solar wind feed: https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json
 * - Atmospheric wind from Open-Meteo forecast API: https://open-meteo.com/en/docs
 * - Marine current and wave data from Open-Meteo Marine API: https://open-meteo.com/en/docs/marine-weather-api
 */

import { abortSafe } from "@/lib/abort";

const NOAA_AURORA_URL =
  "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json";
const NOAA_SOLAR_WIND_URL =
  "https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json";
const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";

function toNumber(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normaliseTimestamp(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) return value;
  return undefined;
}

type AuroraSeverity = "quiet" | "active" | "storm";

export interface AuroraForecastResult {
  probability?: number;
  nearestPoint?: { latitude: number; longitude: number; probability: number };
  maxProbability?: number;
  kpIndex?: number;
  observationTime?: string;
  forecastTime?: string;
  severity: AuroraSeverity;
}

export interface SolarWindMetrics {
  speedKmPerSec?: number;
  densityPerCubicCm?: number;
  temperatureKelvin?: number;
  observationTime?: string;
}

export interface WindConditions {
  updatedAt?: string;
  currentSpeed?: number;
  currentDirection?: number;
  hourlySpeeds?: Array<{ time: string; speed: number }>;
}

export interface MarineConditions {
  updatedAt?: string;
  currentSpeed?: number;
  currentDirection?: number;
  waveHeights?: Array<{ time: string; height: number }>;
}

/** Safe defaults so the UI/stream never crashes if feeds fail */
function defaultAuroraForecast(): AuroraForecastResult {
  return {
    probability: undefined,
    nearestPoint: undefined,
    maxProbability: undefined,
    kpIndex: undefined,
    observationTime: undefined,
    forecastTime: undefined,
    severity: "quiet",
  };
}
function defaultSolarWind(): SolarWindMetrics {
  return {
    speedKmPerSec: undefined,
    densityPerCubicCm: undefined,
    temperatureKelvin: undefined,
    observationTime: undefined,
  };
}
function defaultWindConditions(): WindConditions {
  return {
    updatedAt: undefined,
    currentSpeed: undefined,
    currentDirection: undefined,
    hourlySpeeds: [],
  };
}
function defaultMarineConditions(): MarineConditions {
  return {
    updatedAt: undefined,
    currentSpeed: undefined,
    currentDirection: undefined,
    waveHeights: [],
  };
}

interface AuroraPoint {
  latitude: number;
  longitude: number;
  probability: number;
}

function classifyKp(value: number | undefined): AuroraSeverity {
  if (typeof value !== "number" || Number.isNaN(value)) return "quiet";
  if (value >= 5) return "storm";
  if (value >= 4) return "active";
  return "quiet";
}

function extractAuroraPoints(payload: any): AuroraPoint[] {
  const points: AuroraPoint[] = [];

  const pushPoint = (lon: unknown, lat: unknown, probability: unknown) => {
    const latitude = toNumber(lat);
    const longitude = toNumber(lon);
    const prob = toNumber(probability);
    if (
      typeof latitude === "number" &&
      typeof longitude === "number" &&
      typeof prob === "number"
    ) {
      points.push({ latitude, longitude, probability: prob });
    }
  };

  // Common variants seen in OVATION responses
  if (Array.isArray(payload?.coordinates)) {
    for (const entry of payload.coordinates) {
      if (Array.isArray(entry) && entry.length >= 3) {
        pushPoint(entry[0], entry[1], entry[2]);
      }
    }
  }

  if (Array.isArray(payload?.geometry?.coordinates)) {
    for (const entry of payload.geometry.coordinates) {
      if (Array.isArray(entry) && entry.length >= 3) {
        pushPoint(entry[0], entry[1], entry[2]);
      }
    }
  }

  if (Array.isArray(payload?.features)) {
    for (const feature of payload.features) {
      const geometry = feature?.geometry;
      const properties = feature?.properties;

      if (Array.isArray(geometry?.coordinates)) {
        for (const entry of geometry.coordinates) {
          if (Array.isArray(entry) && entry.length >= 3) {
            pushPoint(entry[0], entry[1], entry[2]);
          }
        }
      }

      if (Array.isArray(properties?.Points)) {
        for (const entry of properties.Points) {
          pushPoint(
            entry?.Longitude ?? entry?.lon,
            entry?.Latitude ?? entry?.lat,
            entry?.Probability ?? entry?.probability
          );
        }
      }
    }
  }

  if (Array.isArray(payload?.Points)) {
    for (const entry of payload.Points) {
      pushPoint(
        entry?.Longitude ?? entry?.lon,
        entry?.Latitude ?? entry?.lat,
        entry?.Probability ?? entry?.probability
      );
    }
  }

  return points;
}

function findNearestPoint(
  points: AuroraPoint[],
  latitude: number,
  longitude: number
): AuroraPoint | undefined {
  if (!points.length) return undefined;
  let nearest: AuroraPoint | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const point of points) {
    const distance = Math.hypot(point.latitude - latitude, point.longitude - longitude);
    if (distance < bestDistance) {
      bestDistance = distance;
      nearest = point;
    }
  }
  return nearest;
}

function extractMaxProbability(points: AuroraPoint[]): number | undefined {
  let max = -Infinity;
  for (const point of points) {
    if (typeof point.probability === "number" && point.probability > max) {
      max = point.probability;
    }
  }
  return max === -Infinity ? undefined : max;
}

function extractAuroraMetadata(payload: any) {
  const candidates = [payload?.properties, payload];
  for (const source of candidates) {
    if (!source) continue;

    const observationTime =
      normaliseTimestamp(source?.["Observation Time"]) ||
      normaliseTimestamp(source?.ObservationTime) ||
      normaliseTimestamp(source?.observationTime) ||
      normaliseTimestamp(source?.observation_time) ||
      normaliseTimestamp(source?.timeTag) ||
      normaliseTimestamp(source?.time);

    const forecastTime =
      normaliseTimestamp(source?.["Forecast Time"]) ||
      normaliseTimestamp(source?.ForecastTime) ||
      normaliseTimestamp(source?.forecastTime) ||
      normaliseTimestamp(source?.forecast_time);

    const kpIndex =
      toNumber(source?.Kp) ||
      toNumber(source?.kP) ||
      toNumber(source?.kp) ||
      toNumber(source?.EstimatedKp) ||
      toNumber(source?.estimatedKp);

    if (observationTime || forecastTime || typeof kpIndex === "number") {
      return { observationTime, forecastTime, kpIndex };
    }
  }
  return { observationTime: undefined, forecastTime: undefined, kpIndex: undefined };
}

/**
 * Fetch OVATION aurora grid and return nearest probability + metadata for a lat/lon.
 * Resilient to payload shape differences and network aborts.
 */
export async function fetchAuroraForecast(
  latitude: number,
  longitude: number
): Promise<AuroraForecastResult> {
  const response = await abortSafe(
    fetch(NOAA_AURORA_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
  );
  if (!response) return defaultAuroraForecast();
  if (!response.ok) {
    throw new Error(`Aurora forecast request failed: ${response.status}`);
  }

  const payload = await abortSafe(response.json() as Promise<any>);
  if (!payload) return defaultAuroraForecast();

  const primary = Array.isArray(payload?.features) ? payload.features[0] : payload;
  const points = extractAuroraPoints(primary ?? payload);
  const nearestPoint = findNearestPoint(points, latitude, longitude);
  const maxProbability = extractMaxProbability(points);
  const metadata = extractAuroraMetadata(primary ?? payload);
  const severity = classifyKp(metadata.kpIndex);

  return {
    probability: nearestPoint?.probability,
    nearestPoint: nearestPoint ? { ...nearestPoint } : undefined,
    maxProbability,
    kpIndex: metadata.kpIndex,
    observationTime: metadata.observationTime,
    forecastTime: metadata.forecastTime,
    severity,
  };
}

/**
 * Fetch NOAA real-time solar wind (1-minute) metrics.
 */
export async function fetchSolarWind(): Promise<SolarWindMetrics> {
  const response = await abortSafe(
    fetch(NOAA_SOLAR_WIND_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
  );
  if (!response) return defaultSolarWind();
  if (!response.ok) {
    throw new Error(`Solar wind request failed: ${response.status}`);
  }

  const payload = await abortSafe(response.json() as Promise<any>);
  if (!payload) return defaultSolarWind();

  const records: any[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
    ? payload.data
    : [];
  const latest = records[0] ?? {};

  return {
    speedKmPerSec: toNumber(latest?.proton_speed ?? latest?.speed),
    densityPerCubicCm: toNumber(latest?.proton_density ?? latest?.density),
    temperatureKelvin: toNumber(latest?.proton_temperature ?? latest?.temperature),
    observationTime:
      normaliseTimestamp(latest?.time_tag ?? latest?.timeTag ?? latest?.time) ??
      normaliseTimestamp(payload?.time_tag ?? payload?.time),
  };
}

/**
 * Fetch atmospheric wind (current + next 24h hourly) from Open-Meteo.
 */
export async function fetchWindConditions(
  latitude: number,
  longitude: number
): Promise<WindConditions> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: "wind_speed_10m,wind_direction_10m",
    hourly: "wind_speed_10m",
    timezone: "UTC",
  });

  const response = await abortSafe(
    fetch(`${OPEN_METEO_FORECAST_URL}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
  );
  if (!response) return defaultWindConditions();
  if (!response.ok) {
    throw new Error(`Wind forecast request failed: ${response.status}`);
  }

  const payload = await abortSafe(response.json() as Promise<any>);
  if (!payload) return defaultWindConditions();

  const hourlyTimes: string[] = payload?.hourly?.time ?? [];
  const hourlySpeedsRaw: number[] = payload?.hourly?.wind_speed_10m ?? [];
  const hourlySpeeds: Array<{ time: string; speed: number }> = [];

  if (Array.isArray(hourlyTimes) && Array.isArray(hourlySpeedsRaw)) {
    for (let i = 0; i < Math.min(hourlyTimes.length, hourlySpeedsRaw.length, 24); i++) {
      const time = hourlyTimes[i];
      const speed = toNumber(hourlySpeedsRaw[i]);
      if (typeof time === "string" && typeof speed === "number") {
        hourlySpeeds.push({ time, speed });
      }
    }
  }

  return {
    updatedAt: normaliseTimestamp(payload?.current?.time),
    currentSpeed: toNumber(payload?.current?.wind_speed_10m),
    currentDirection: toNumber(payload?.current?.wind_direction_10m),
    hourlySpeeds,
  };
}

/**
 * Fetch marine currents and wave heights (next 24h) from Open-Meteo Marine.
 */
export async function fetchMarineConditions(
  latitude: number,
  longitude: number
): Promise<MarineConditions> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    hourly: "ocean_current_speed,ocean_current_direction,wave_height",
    timezone: "UTC",
  });

  const response = await abortSafe(
    fetch(`${OPEN_METEO_MARINE_URL}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
  );
  if (!response) return defaultMarineConditions();
  if (!response.ok) {
    throw new Error(`Marine conditions request failed: ${response.status}`);
  }

  const payload = await abortSafe(response.json() as Promise<any>);
  if (!payload) return defaultMarineConditions();

  const times: string[] = payload?.hourly?.time ?? [];
  const speeds: number[] = payload?.hourly?.ocean_current_speed ?? [];
  const directions: number[] = payload?.hourly?.ocean_current_direction ?? [];
  const waveHeights: number[] = payload?.hourly?.wave_height ?? [];

  const currentSpeed = toNumber(speeds[0]);
  const currentDirection = toNumber(directions[0]);
  const updatedAt = normaliseTimestamp(times[0]);

  return {
    updatedAt,
    currentSpeed,
    currentDirection,
    waveHeights: times.slice(0, 24).map((time, index) => ({
      time,
      height: toNumber(waveHeights[index]) ?? 0,
    })),
  };
}