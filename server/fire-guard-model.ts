import OpenAI from "openai";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/firebase";
import {
  fireGuardHarvester,
  type FireGuardHarvestSnapshot,
  type FireIncidentRecord,
} from "./fire-guard-harvester";

export interface FireGuardPatternInsight {
  name: string;
  description: string;
  supportingExamples: Array<{
    recordId: string;
    source: string;
    eventDate?: string;
    location?: string;
  }>;
  riskScore?: number;
  recommendedActions?: string[];
}

export interface FireGuardModelOutput {
  datasetSummary: {
    incidentsAnalyzed: number;
    timeSpan?: string;
    topSources: Array<{ sourceId: string; count: number }>;
    geographies: Array<{ name: string; count: number }>;
  };
  globalSignals: FireGuardPatternInsight[];
  emergingRisks: FireGuardPatternInsight[];
  barrierInsights: FireGuardPatternInsight[];
  recommendedMitigations: string[];
  rawModelResponse?: unknown;
}

export interface FireGuardModelOptions {
  projectId?: string;
  records?: FireIncidentRecord[];
  snapshot?: FireGuardHarvestSnapshot;
  maxRecords?: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class FireGuardModelService {
  async analyze(options: FireGuardModelOptions = {}): Promise<FireGuardModelOutput> {
    const snapshot = await this.resolveSnapshot(options);
    if (!snapshot || snapshot.records.length === 0) {
      throw new Error("No fire intelligence records available for analysis");
    }

    const records = (options.records ?? snapshot.records).slice(0, options.maxRecords ?? 120);
    const serialized = records.map((record) => ({
      id: record.id,
      source: record.sourceName,
      eventDate: record.eventDate,
      category: record.category,
      summary: record.summary,
      location: record.location?.site ?? record.location?.country,
      severity: record.severity,
      lossEstimateUsd: record.lossEstimateUsd,
      rootCauses: record.rootCauses,
      failedBarriers: record.failedBarriers,
    }));

    const systemPrompt = `You are HydroSafe Fire Guard, a large-scale industrial fire intelligence model. ` +
      `Given curated global incident records, you must surface statistically meaningful ignition patterns, barrier failures, and ` +
      `emerging risks. Respond with valid JSON using the schema: {` +
      `"datasetSummary": {"incidentsAnalyzed": number, "timeSpan": string, "topSources": [{"sourceId": string, "count": number}], "geographies": [{"name": string, "count": number}]},` +
      `"globalSignals": Array<Pattern>, "emergingRisks": Array<Pattern>, "barrierInsights": Array<Pattern>, "recommendedMitigations": string[]}. ` +
      `Each Pattern: {"name": string, "description": string, "supportingExamples": [{"recordId": string, "source": string, "eventDate": string, "location": string}], "riskScore": number, "recommendedActions": string[]}.`;

    const userPrompt = `Fire incident sample (max ${records.length} records):\n\n${JSON.stringify(serialized, null, 2)}\n\n` +
      `Identify the strongest repeating causes, any emerging anomalies from the past 24 months, and which protective barriers failed most often. ` +
      `Where possible, reference supporting record IDs in supportingExamples.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";

    let parsed: FireGuardModelOutput;
    try {
      parsed = JSON.parse(content) as FireGuardModelOutput;
    } catch (error) {
      console.error("Failed to parse Fire Guard model output", error);
      throw new Error("Fire Guard model produced invalid JSON response");
    }

    parsed.rawModelResponse = content;

    await this.persistAnalysis({
      projectId: options.projectId ?? snapshot.projectId,
      snapshotId: snapshot.id,
      result: parsed,
    });

    return parsed;
  }

  private async resolveSnapshot(options: FireGuardModelOptions): Promise<FireGuardHarvestSnapshot | undefined> {
    if (options.snapshot) {
      return options.snapshot;
    }
    if (options.records) {
      return {
        id: randomSnapshotId(),
        createdAt: new Date().toISOString(),
        projectId: options.projectId,
        records: options.records,
        sources: [],
      };
    }
    const latest = await fireGuardHarvester.getLatestSnapshot(options.projectId);
    if (latest) {
      return latest;
    }
    const staticSources = fireGuardHarvester.getStaticSources();
    if (staticSources.length > 0) {
      const records = fireGuardHarvester.getStaticBaselineRecords();
      return {
        id: randomSnapshotId(),
        createdAt: new Date().toISOString(),
        projectId: options.projectId,
        records,
        sources: staticSources.map((source) => ({
          id: source.id,
          name: source.name,
          type: source.type,
          fetched: source.records.length,
          failed: false,
        })),
      };
    }
    return undefined;
  }

  private async persistAnalysis(params: { projectId?: string; snapshotId: string; result: FireGuardModelOutput }) {
    const collectionRef = collection(db, "fireGuardIntelAnalyses");
    await addDoc(collectionRef, {
      projectId: params.projectId,
      snapshotId: params.snapshotId,
      createdAt: new Date().toISOString(),
      result: params.result,
    });
  }
}

function randomSnapshotId() {
  return `ad-hoc-${Math.random().toString(36).slice(2, 10)}`;
}

export const fireGuardModelService = new FireGuardModelService();

