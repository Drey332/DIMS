import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { collection, addDoc, query, where, orderBy, limit, getDocs, type QueryConstraint } from "firebase/firestore";
import { db } from "@/firebase";
import { FireIncidentZ, type FireIncident } from "@shared/fire-intel/schema";

export interface FireIncidentRecord {
  id: string;
  sourceId: string;
  sourceName: string;
  externalId?: string;
  title: string;
  summary?: string;
  category?: string;
  eventDate?: string;
  location?: {
    country?: string;
    region?: string;
    site?: string;
    latitude?: number;
    longitude?: number;
  };
  environment?: {
    weather?: string;
    temperatureC?: number;
    windSpeedKts?: number;
  };
  rootCauses?: string[];
  failedBarriers?: string[];
  lossEstimateUsd?: number;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  references?: string[];
  tags?: string[];
  raw?: unknown;
}

interface BaseFireIncidentSourceConfig {
  id: string;
  name: string;
  description: string;
}

export interface RemoteFireIncidentSourceConfig extends BaseFireIncidentSourceConfig {
  type: "remote";
  format: "json" | "csv";
  url: string;
  query?: Record<string, string>;
  defaultLimit?: number;
  transform: (payload: unknown) => FireIncidentRecord[];
}

export interface StaticFireIncidentSourceConfig extends BaseFireIncidentSourceConfig {
  type: "static";
  records: FireIncidentRecord[];
}

export type FireIncidentSourceConfig =
  | RemoteFireIncidentSourceConfig
  | StaticFireIncidentSourceConfig;

export interface HarvestOptions {
  sources?: string[];
  limitPerSource?: number;
  includeRaw?: boolean;
  projectId?: string;
}

export interface FireGuardHarvestSnapshot {
  id: string;
  projectId?: string;
  createdAt: string;
  sources: Array<{
    id: string;
    name: string;
    type?: FireIncidentSourceConfig["type"];
    fetched: number;
    failed: boolean;
    error?: string;
  }>;
  records: FireIncidentRecord[];
}

const FIRE_INTEL_SEED_PATH = path.join(process.cwd(), "data", "fire-incidents.seed.json");

function loadSeedIncidents(): FireIncident[] {
  try {
    const raw = fs.readFileSync(FIRE_INTEL_SEED_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("Seed file must contain an array");
    }
    const incidents: FireIncident[] = [];
    for (const candidate of parsed) {
      const result = FireIncidentZ.safeParse(candidate);
      if (result.success) {
        incidents.push(result.data);
      } else {
        console.warn("Skipping invalid fire incident seed", result.error.flatten());
      }
    }
    return incidents;
  } catch (error) {
    console.warn("Failed to load fire intelligence seeds:", error);
    return [];
  }
}

function toHarvesterRecord(incident: FireIncident): FireIncidentRecord {
  const sourceId = "historic_offshore_case_studies";
  const timelineSummary = incident.timeline.map((entry) => `${entry.t}: ${entry.event}`).join(" | ");
  const findings = incident.officialFindings.join(" ");
  const lessons = incident.lessons.join("; ");
  const summary = `${incident.initiatingEvent} ${findings} Lessons: ${lessons}`;
  return {
    id: `${sourceId}_${incident.id.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    sourceId,
    sourceName: "Historic Offshore Case Studies",
    externalId: incident.id,
    title: incident.name,
    summary,
    category: "Catastrophic fire",
    eventDate: incident.dateUtc,
    location: {
      site: incident.location,
    },
    rootCauses: [incident.initiatingEvent],
    failedBarriers: incident.barriersFailed,
    severity: "CRITICAL",
    references: incident.sources.map((source) => source.url),
    tags: incident.tags,
    raw: { incident, timelineSummary },
  } satisfies FireIncidentRecord;
}

const HISTORIC_SAMPLE_RECORDS: FireIncidentRecord[] = loadSeedIncidents().map(toHarvesterRecord);

const DEFAULT_SOURCES: FireIncidentSourceConfig[] = [
  {
    type: "static",
    id: "historic_offshore_case_studies",
    name: "Historic Offshore Benchmarks",
    description:
      "Seed dataset of Piper Alpha (1988) and Deepwater Horizon (2010) incidents for Fire Guard prototyping and validation.",
    records: HISTORIC_SAMPLE_RECORDS,
  },
  {
    type: "remote",
    id: "us_csb",
    name: "US Chemical Safety Board",
    description: "Official investigation updates and completed reports from the U.S. CSB portal.",
    format: "json",
    url: "https://www.csb.gov/assets/1/6/incidents.json",
    defaultLimit: 200,
    transform(payload: unknown) {
      if (!payload || typeof payload !== "object" || !Array.isArray((payload as Record<string, unknown>).incidents)) {
        return [];
      }
      const incidents = (payload as { incidents: Array<Record<string, unknown>> }).incidents;
      return incidents.map((item, index) => {
        const title = String(item.Title ?? item.title ?? "CSB Incident");
        const summary = String(item.Summary ?? item.summary ?? item.Description ?? "");
        const eventDate = String(item.Date ?? item.date ?? item.EventDate ?? "");
        const location = String(item.Location ?? item.location ?? "");
        return {
          id: `us_csb_${item.Id ?? item.id ?? index}`,
          sourceId: "us_csb",
          sourceName: "US Chemical Safety Board",
          externalId: item.Id ? String(item.Id) : undefined,
          title,
          summary,
          eventDate,
          location: location
            ? {
                country: location.split(",").pop()?.trim(),
                site: location,
              }
            : undefined,
          category: String(item.Category ?? item.category ?? "Investigation"),
          references: item.PDF ? [String(item.PDF)] : undefined,
          raw: item,
        } satisfies FireIncidentRecord;
      });
    },
  },
  {
    type: "remote",
    id: "bsee_safety_alerts",
    name: "BSEE Safety Alerts",
    description: "Bureau of Safety and Environmental Enforcement safety alerts with causal narratives.",
    format: "json",
    url: "https://www.bsee.gov/sites/bsee.gov/files/safety-alerts/safety-alerts.json",
    defaultLimit: 200,
    transform(payload: unknown) {
      if (!payload || typeof payload !== "object") {
        return [];
      }
      const alerts = Array.isArray((payload as Record<string, unknown>).alerts)
        ? ((payload as { alerts: Array<Record<string, unknown>> }).alerts)
        : [];
      return alerts.map((item, index) => {
        const summary = Array.isArray(item.summary)
          ? item.summary.map((paragraph) => String(paragraph)).join("\n")
          : String(item.summary ?? "");
        return {
          id: `bsee_${item.id ?? index}`,
          sourceId: "bsee_safety_alerts",
          sourceName: "BSEE Safety Alerts",
          externalId: item.id ? String(item.id) : undefined,
          title: String(item.title ?? "BSEE Safety Alert"),
          summary,
          eventDate: String(item.date ?? ""),
          category: "Safety Alert",
          references: Array.isArray(item.files)
            ? (item.files as Array<{ file: string }>).map((file) => String(file.file))
            : undefined,
          tags: Array.isArray(item.tags) ? (item.tags as Array<unknown>).map((tag) => String(tag)) : undefined,
          raw: item,
        } satisfies FireIncidentRecord;
      });
    },
  },
  {
    type: "remote",
    id: "nfirs_public",
    name: "US NFIRS Public Data Sample",
    description: "Public fire department incident data sample for ignition sources and responses.",
    format: "json",
    url: "https://services7.arcgis.com/T4QMspbfLg3hA1hc/arcgis/rest/services/NFIRS_Fires/FeatureServer/0/query",
    query: {
      where: "1=1",
      outFields: "OBJECTID,STATE,DATE_,INCIDENT_TYPE,PROP_LOSS,DEATHS,INJURIES",
      orderByFields: "DATE_ DESC",
      f: "json",
    },
    defaultLimit: 100,
    transform(payload: unknown) {
      if (!payload || typeof payload !== "object") {
        return [];
      }
      const features = Array.isArray((payload as Record<string, unknown>).features)
        ? ((payload as { features: Array<{ attributes: Record<string, unknown> }> }).features)
        : [];
      return features.map((feature) => {
        const attrs = feature.attributes ?? {};
        const dateValue = attrs.DATE_ ? new Date(Number(attrs.DATE_)).toISOString() : undefined;
        return {
          id: `nfirs_${attrs.OBJECTID ?? randomUUID()}`,
          sourceId: "nfirs_public",
          sourceName: "US NFIRS Public Data Sample",
          externalId: attrs.OBJECTID ? String(attrs.OBJECTID) : undefined,
          title: `NFIRS Incident ${attrs.INCIDENT_TYPE ?? "Unknown"}`,
          category: "NFIRS Incident",
          eventDate: dateValue,
          severity: typeof attrs.PROP_LOSS === "number" && attrs.PROP_LOSS > 100000 ? "HIGH" : undefined,
          lossEstimateUsd: typeof attrs.PROP_LOSS === "number" ? attrs.PROP_LOSS : undefined,
          summary: `Incident type ${attrs.INCIDENT_TYPE ?? "n/a"} with property loss ${attrs.PROP_LOSS ?? 0}.`,
          tags: [String(attrs.STATE ?? "")].filter(Boolean),
          raw: attrs,
        } satisfies FireIncidentRecord;
      });
    },
  },
];

function buildUrl(config: RemoteFireIncidentSourceConfig, limitPerSource?: number): string {
  const url = new URL(config.url);
  const params = new URLSearchParams(config.query);
  if (limitPerSource) {
    if (config.id === "nfirs_public") {
      params.set("resultRecordCount", String(limitPerSource));
    } else {
      params.set("limit", String(limitPerSource));
    }
  } else if (config.defaultLimit) {
    params.set("limit", String(config.defaultLimit));
  }
  if (params.size > 0) {
    params.forEach((value, key) => url.searchParams.set(key, value));
  }
  return url.toString();
}

export class FireGuardHarvester {
  private readonly sources: Map<string, FireIncidentSourceConfig>;

  constructor(sources: FireIncidentSourceConfig[] = DEFAULT_SOURCES) {
    this.sources = new Map(sources.map((source) => [source.id, source] as const));
  }

  listSources() {
    return Array.from(this.sources.values()).map((source) => {
      if (source.type === "static") {
        const { records, ...rest } = source;
        return { ...rest, recordCount: records.length };
      }
      const { transform: _transform, ...rest } = source;
      return rest;
    });
  }

  async harvest(options: HarvestOptions = {}): Promise<FireGuardHarvestSnapshot> {
    const selectedSources = options.sources?.length
      ? options.sources
          .map((id) => this.sources.get(id))
          .filter((source): source is FireIncidentSourceConfig => Boolean(source))
      : Array.from(this.sources.values()).filter((source) => source.type === "static");

    const harvestedRecords: FireIncidentRecord[] = [];
    const sourceStatuses: FireGuardHarvestSnapshot["sources"] = [];

    for (const source of selectedSources) {
      try {
        if (source.type === "static") {
          const limit = options.limitPerSource;
          const limited =
            typeof limit === "number" && Number.isFinite(limit) && limit >= 0
              ? source.records.slice(0, limit)
              : source.records;
          const records = limited.map((record) => ({
            ...record,
            raw: options.includeRaw ? record.raw : undefined,
          }));
          harvestedRecords.push(...records);
          sourceStatuses.push({
            id: source.id,
            name: source.name,
            type: source.type,
            fetched: records.length,
            failed: false,
          });
          continue;
        }

        const url = buildUrl(source, options.limitPerSource ?? source.defaultLimit);
        const response = await fetch(url, { headers: { Accept: "application/json" } });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = source.format === "json" ? await response.json() : await response.text();
        const records = source.transform(payload).map((record) => ({
          ...record,
          raw: options.includeRaw ? record.raw : undefined,
        }));
        harvestedRecords.push(...records);
        sourceStatuses.push({
          id: source.id,
          name: source.name,
          type: source.type,
          fetched: records.length,
          failed: false,
        });
      } catch (error) {
        console.error(`Fire Guard harvester failed for ${source.id}:`, error);
        sourceStatuses.push({
          id: source.id,
          name: source.name,
          type: source.type,
          fetched: 0,
          failed: true,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const deduplicated = this.deduplicate(harvestedRecords);
    const snapshot: FireGuardHarvestSnapshot = {
      id: randomUUID(),
      projectId: options.projectId,
      createdAt: new Date().toISOString(),
      sources: sourceStatuses,
      records: deduplicated,
    };

    await this.persistSnapshot(snapshot);

    return snapshot;
  }

  getStaticSources(): StaticFireIncidentSourceConfig[] {
    return Array.from(this.sources.values()).filter(
      (source): source is StaticFireIncidentSourceConfig => source.type === "static"
    );
  }

  getStaticBaselineRecords(): FireIncidentRecord[] {
    return this.getStaticSources().flatMap((source) => source.records.map((record) => ({ ...record })));
  }

  private deduplicate(records: FireIncidentRecord[]): FireIncidentRecord[] {
    const seen = new Map<string, FireIncidentRecord>();
    for (const record of records) {
      const key = record.externalId ? `${record.sourceId}:${record.externalId}` : record.id;
      if (!seen.has(key)) {
        seen.set(key, record);
      }
    }
    return Array.from(seen.values());
  }

  private async persistSnapshot(snapshot: FireGuardHarvestSnapshot) {
    const collectionRef = collection(db, "fireGuardIntelSnapshots");
    const payload = {
      ...snapshot,
      records: snapshot.records.map((record) => ({
        ...record,
        raw: undefined,
      })),
    };
    await addDoc(collectionRef, payload);
  }

  async getLatestSnapshot(projectId?: string): Promise<FireGuardHarvestSnapshot | undefined> {
    const collectionRef = collection(db, "fireGuardIntelSnapshots");
    const constraints: QueryConstraint[] = [orderBy("createdAt", "desc"), limit(1)];
    if (projectId) {
      constraints.unshift(where("projectId", "==", projectId));
    }
    const snapshotQuery = query(collectionRef, ...constraints);
    const result = await getDocs(snapshotQuery);
    if (result.empty) {
      return undefined;
    }
    const docSnapshot = result.docs[0];
    return docSnapshot.data() as FireGuardHarvestSnapshot;
  }
}

export const fireGuardHarvester = new FireGuardHarvester();

