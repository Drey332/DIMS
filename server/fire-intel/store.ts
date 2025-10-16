import fs from "node:fs/promises";
import path from "node:path";
import { createFireIntelEmbedding, cosineSimilarity } from "./embeddings";

export interface KnowledgeItem {
  domain: string;
  externalId: string;
  title: string;
  payload: unknown;
  tags?: string[];
}

export interface VectorRecord {
  externalId: string;
  namespace: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
  chunk?: string;
}

export interface VectorSearchParams {
  namespace: string;
  query: string;
  k?: number;
}

export interface VectorSearchResult extends VectorRecord {
  similarity: number;
  score: number;
}

type StoredKnowledgeItem = KnowledgeItem & { createdAt: string; updatedAt: string };
type StoredVectorRecord = VectorRecord & { createdAt: string; updatedAt: string };

const DATA_DIR = path.join(process.cwd(), "data");
const KNOWLEDGE_PATH = path.join(DATA_DIR, "fire-intel-knowledge.json");
const VECTOR_PATH = path.join(DATA_DIR, "fire-intel-vectors.json");

const knowledgeStore = new Map<string, StoredKnowledgeItem>();
const vectorStore = new Map<string, StoredVectorRecord>();

let storeLoaded = false;

function knowledgeKey(domain: string, externalId: string) {
  return `${domain}__${externalId}`;
}

async function ensureStoreLoaded(): Promise<void> {
  if (storeLoaded) {
    return;
  }
  storeLoaded = true;

  await fs.mkdir(DATA_DIR, { recursive: true }).catch(() => {});

  try {
    const raw = await fs.readFile(KNOWLEDGE_PATH, "utf-8");
    const entries = JSON.parse(raw) as StoredKnowledgeItem[];
    for (const entry of entries) {
      if (entry && typeof entry.domain === "string" && typeof entry.externalId === "string") {
        knowledgeStore.set(knowledgeKey(entry.domain, entry.externalId), entry);
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("Failed to load fire intelligence knowledge store", error);
    }
  }

  try {
    const raw = await fs.readFile(VECTOR_PATH, "utf-8");
    const entries = JSON.parse(raw) as StoredVectorRecord[];
    for (const entry of entries) {
      if (entry && typeof entry.namespace === "string" && typeof entry.externalId === "string") {
        vectorStore.set(`${entry.namespace}__${entry.externalId}`, entry);
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("Failed to load fire intelligence vector store", error);
    }
  }
}

async function persistStores(): Promise<void> {
  const knowledgeArray = Array.from(knowledgeStore.values());
  const vectorArray = Array.from(vectorStore.values());

  await Promise.all([
    fs.writeFile(KNOWLEDGE_PATH, JSON.stringify(knowledgeArray, null, 2)),
    fs.writeFile(VECTOR_PATH, JSON.stringify(vectorArray, null, 2)),
  ]).catch((error) => {
    console.warn("Failed to persist fire intelligence stores", error);
  });
}

export async function upsertKnowledgeItem(item: KnowledgeItem): Promise<void> {
  await ensureStoreLoaded();

  const key = knowledgeKey(item.domain, item.externalId);
  const existing = knowledgeStore.get(key);
  const now = new Date().toISOString();

  knowledgeStore.set(key, {
    ...item,
    tags: item.tags ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });

  await persistStores();
}

export async function getKnowledgeItem(domain: string, externalId: string) {
  await ensureStoreLoaded();
  return knowledgeStore.get(knowledgeKey(domain, externalId));
}

export async function upsertVector(item: VectorRecord): Promise<void> {
  await ensureStoreLoaded();

  const key = `${item.namespace}__${item.externalId}`;
  const existing = vectorStore.get(key);
  const now = new Date().toISOString();

  vectorStore.set(key, {
    ...item,
    metadata: item.metadata ?? {},
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });

  await persistStores();
}

export async function searchVectors(params: VectorSearchParams): Promise<VectorSearchResult[]> {
  await ensureStoreLoaded();

  const embedding = await createFireIntelEmbedding(params.query);
  const results: VectorSearchResult[] = [];

  for (const record of Array.from(vectorStore.values())) {
    if (record.namespace !== params.namespace) {
      continue;
    }
    if (!Array.isArray(record.embedding)) {
      continue;
    }
    const similarity = cosineSimilarity(embedding, record.embedding);
    results.push({ ...record, similarity, score: similarity });
  }

  results.sort((a, b) => b.similarity - a.similarity);
  const limit = params.k ?? 5;
  return results.slice(0, limit).map((result) => ({ ...result }));
}
