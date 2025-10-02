import { EnvContext, EnvIndicators, RiskLevel } from "@shared/types/env";

const KP_FEED_URL = process.env.KP_FEED_URL ?? "https://services.swpc.noaa.gov/json/rtsw/rtsw_kp_1m.json";
const USGS_FEED_URL =
  process.env.USGS_FEED_URL ?? "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";
const QUAKE_RADIUS_KM = Number.isFinite(Number(process.env.QUAKE_RADIUS_KM))
  ? Number(process.env.QUAKE_RADIUS_KM)
  : 250;
const CACHE_TTL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 7_000;

interface CacheEntry {
  timestamp: number;
  data: EnvContext;
}

interface QuakeFeature {
  mag: number | null;
  lat: number;
  lon: number;
  time: number;
}

const cache = new Map<string, CacheEntry>();

export const FALLBACK_INDICATORS: EnvIndicators = {
  kp_index: null,
  quakes_24h_count: 0,
  strongest_quake_mag: null,
};

export async function getEnvContext(lat: number, lon: number): Promise<EnvContext> {
  const key = cacheKey(lat, lon);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  let snapshot: IndicatorSnapshot | null = null;
  try {
    snapshot = await gatherIndicators(lat, lon, QUAKE_RADIUS_KM);
  } catch (error) {
    console.warn("Failed to gather indicators, using fallback sample", error);
    snapshot = { indicators: { ...FALLBACK_INDICATORS }, feedErrors: ["system"] };
  }

  const context = buildContextFromSnapshot(lat, lon, snapshot);
  cache.set(key, { timestamp: now, data: context });
  return context;
}

export interface IndicatorSnapshot {
  indicators: EnvIndicators;
  feedErrors: string[];
}

export async function gatherIndicators(
  lat: number,
  lon: number,
  radiusKm: number
): Promise<IndicatorSnapshot> {
  const [kpResult, quakeResult] = await Promise.all([
    fetchKpIndex(),
    fetchQuakes(lat, lon, radiusKm),
  ]);

  const magnitudes = quakeResult.quakes
    .map((quake) => quake.mag)
    .filter((mag): mag is number => typeof mag === "number" && Number.isFinite(mag));
  const strongest = magnitudes.length ? Math.max(...magnitudes) : null;

  return {
    indicators: {
      kp_index: kpResult.value,
      quakes_24h_count: quakeResult.quakes.length,
      strongest_quake_mag: strongest,
    },
    feedErrors: [
      ...(kpResult.healthy ? [] : ["kp"]),
      ...(quakeResult.healthy ? [] : ["usgs"]),
    ],
  };
}

export function buildContextFromSnapshot(
  lat: number,
  lon: number,
  snapshot: IndicatorSnapshot | null
): EnvContext {
  let stale = false;
  const ruleHits: string[] = [];
  let indicators: EnvIndicators = { ...FALLBACK_INDICATORS };

  if (snapshot) {
    indicators = snapshot.indicators;
    if (snapshot.feedErrors.length > 0) {
      stale = true;
      for (const feed of snapshot.feedErrors) {
        if (feed === "kp") {
          ruleHits.push("feed.kp.unavailable");
        } else if (feed === "usgs") {
          ruleHits.push("feed.usgs.unavailable");
        } else {
          ruleHits.push(`feed.${feed}.unavailable`);
        }
      }
    }
  } else {
    stale = true;
    ruleHits.push("system.fallback");
  }

  if (!snapshot || snapshot.feedErrors.includes("system")) {
    indicators = { ...FALLBACK_INDICATORS };
  }

  return buildEnvContext(lat, lon, indicators, {
    stale,
    additionalRuleHits: ruleHits.length > 0 ? ruleHits : undefined,
  });
}

export async function fetchKpIndex(): Promise<{ value: number | null; healthy: boolean }> {
  try {
    const response = await timedFetch(KP_FEED_URL);
    if (!response?.ok) {
      return { value: null, healthy: false };
    }

    const rawText = await response.text();
    const data = JSON.parse(rawText);

    if (Array.isArray(data)) {
      if (data.length === 0) return { value: null, healthy: true };

      const candidate = data.find((row) => typeof row === "object" && row !== null && "kp_index" in row);
      if (candidate && typeof (candidate as any).kp_index !== "undefined") {
        const value = Number.parseFloat(String((candidate as any).kp_index));
        return { value: Number.isFinite(value) ? value : null, healthy: true };
      }

      const lastRow = [...data].reverse().find((row) => Array.isArray(row) && row.length > 1);
      if (lastRow) {
        const value = Number.parseFloat(String(lastRow[1]));
        return { value: Number.isFinite(value) ? value : null, healthy: true };
      }
    }

    if (data && typeof data === "object") {
      const kp = (data as any).kp ?? (data as any).kp_index ?? (data as any).estimated_kp;
      if (typeof kp === "number") {
        return { value: kp, healthy: true };
      }
      if (typeof kp === "string") {
        const value = Number.parseFloat(kp);
        return { value: Number.isFinite(value) ? value : null, healthy: true };
      }
    }
  } catch (error) {
    console.warn("Failed to fetch Kp index", error);
  }
  return { value: null, healthy: false };
}

export async function fetchQuakes(
  lat: number,
  lon: number,
  radiusKm: number
): Promise<{ quakes: QuakeFeature[]; healthy: boolean }> {
  try {
    const response = await timedFetch(USGS_FEED_URL);
    if (!response?.ok) {
      return { quakes: [], healthy: false };
    }

    const geojson = await response.json();
    const features = Array.isArray(geojson?.features) ? geojson.features : [];
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    const quakes = features
      .map((feature: any) => {
        const coordinates = feature?.geometry?.coordinates;
        const properties = feature?.properties;
        const quake: QuakeFeature = {
          mag: typeof properties?.mag === "number" ? properties.mag : null,
          lat: Number(coordinates?.[1]),
          lon: Number(coordinates?.[0]),
          time: Number(properties?.time),
        };
        return quake;
      })
      .filter((quake: QuakeFeature) =>
        Number.isFinite(quake.lat) &&
        Number.isFinite(quake.lon) &&
        Number.isFinite(quake.time) &&
        quake.time >= cutoff &&
        haversineKm(lat, lon, quake.lat, quake.lon) <= radiusKm
      );
    return { quakes, healthy: true };
  } catch (error) {
    console.warn("Failed to fetch earthquake feed", error);
  }

  return { quakes: [], healthy: false };
}

export function buildEnvContext(
  lat: number,
  lon: number,
  indicators: EnvIndicators,
  options: { stale?: boolean; additionalRuleHits?: string[] } = {}
): EnvContext {
  const evaluation = evaluateIndicators(indicators);
  const ruleHits = new Set<string>(evaluation.rule_hits);
  if (options.additionalRuleHits) {
    for (const hit of options.additionalRuleHits) {
      ruleHits.add(hit);
    }
  }

  if (options.stale) {
    evaluation.protective_measures = Array.from(
      new Set([
        ...evaluation.protective_measures,
        "Upstream feeds unavailable; treat this intelligence as stale until refreshed.",
      ])
    );
    if (!ruleHits.has("system.stale")) {
      ruleHits.add("system.stale");
    }
  }

  const erpNoteLines: string[] = [
    `**Risk:** ${evaluation.risk_level.toUpperCase()}`,
    `**Indicators:** Kp=${indicators.kp_index ?? "n/a"} | quakes_24h=${indicators.quakes_24h_count}` +
      (indicators.strongest_quake_mag != null ? ` (max M ${indicators.strongest_quake_mag.toFixed(1)})` : ""),
  ];

  if (options.stale) {
    erpNoteLines.push("**Data status:** Operating on cached context (feeds offline)");
  }

  if (evaluation.key_risks.length > 0) {
    erpNoteLines.push("**Key risk factors**", ...evaluation.key_risks.map((risk) => `- ${risk}`));
  }
  if (evaluation.protective_measures.length > 0) {
    erpNoteLines.push(
      "**Protective measures to emphasize**",
      ...evaluation.protective_measures.map((measure) => `- ${measure}`)
    );
  }

  return {
    lat,
    lon,
    fetched_at: new Date().toISOString(),
    indicators,
    risk_level: evaluation.risk_level,
    key_risks: evaluation.key_risks,
    protective_measures: evaluation.protective_measures,
    erp_note_md: erpNoteLines.join("\n\n"),
    stale: options.stale ? true : undefined,
    rule_hits: ruleHits.size > 0 ? Array.from(ruleHits) : undefined,
  };
}

export function evaluateIndicators(
  indicators: EnvIndicators
): Pick<EnvContext, "risk_level" | "key_risks" | "protective_measures"> & { rule_hits: string[] } {
  let risk: RiskLevel = "low";
  const risks = new Set<string>();
  const measures = new Set<string>();
  const ruleHits = new Set<string>();

  const escalate = (level: RiskLevel) => {
    if (rank(level) > rank(risk)) {
      risk = level;
    }
  };

  if (indicators.kp_index != null) {
    if (indicators.kp_index >= 7) {
      escalate("high");
      risks.add("Severe geomagnetic storm likely (Kp ≥ 7)");
      measures.add("Shift to hardened comms paths and verify GNSS redundancy before precision tasks.");
      measures.add("Delay dynamic positioning or saturation diving operations until conditions ease if feasible.");
      ruleHits.add("kp.severe");
    } else if (indicators.kp_index >= 5) {
      escalate("medium");
      risks.add("Active geomagnetic conditions impacting GNSS/comm links (Kp ≥ 5)");
      measures.add("Check GNSS-dependent procedures and confirm backup navigation/communications paths.");
      ruleHits.add("kp.active");
    }
  } else {
    measures.add("Kp feed unavailable: run comms self-test and GNSS reasonableness checks.");
    ruleHits.add("kp.feed_missing");
  }

  if (indicators.strongest_quake_mag != null) {
    if (indicators.strongest_quake_mag >= 6.5) {
      escalate("high");
      risks.add("Recent strong regional earthquake (M ≥ 6.5)");
      measures.add("Re-verify moorings, lift plans, and critical barriers for seismic displacement.");
      measures.add("Brief crew on aftershock and evacuation triggers.");
      ruleHits.add("quake.strong");
    } else if (indicators.strongest_quake_mag >= 5.0) {
      escalate("medium");
      risks.add("Recent moderate regional earthquake (M ≥ 5.0)");
      measures.add("Conduct structural walkdowns and review aftershock contingencies with supervisors.");
      ruleHits.add("quake.moderate");
    }
  }

  if (indicators.quakes_24h_count >= 3) {
    escalate("medium");
    risks.add("Elevated seismic swarm near site (3+ events ≥ M4.5)");
    measures.add("Confirm muster plans and check critical spares for quake-induced failures.");
    ruleHits.add("quake.swarm");
  }

  if (indicators.quakes_24h_count > 0) {
    measures.add("Re-check moorings/lift plans and brief aftershock muster/egress routes with crews.");
    ruleHits.add("quake.any");
  }

  return {
    risk_level: risk,
    key_risks: Array.from(risks),
    protective_measures: Array.from(measures),
    rule_hits: Array.from(ruleHits),
  };
}

function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

async function timedFetch(url: string): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "HydroSafe Env Intel/1.0 (+https://hydrosafe.example)",
        Accept: "application/json",
      },
    });
    clearTimeout(timer);
    return response;
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      console.warn(`Fetch aborted for ${url}`);
    } else {
      console.warn(`Fetch failed for ${url}`, error);
    }
    return null;
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function rank(level: RiskLevel): number {
  switch (level) {
    case "high":
      return 2;
    case "medium":
      return 1;
    default:
      return 0;
  }
}
