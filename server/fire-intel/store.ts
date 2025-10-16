import fs from "node:fs/promises";
import path from "node:path";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { db } from "@/firebase";
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

/* -------------------------------------------------------------------------- */
/*                         Local JSON-based persistence                       */
/* -------------------------------------------------------------------------- */

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
  if (storeLoaded) return;
  storeLoaded = true;

  await fs.mkdir(DATA_DIR, { recursive: true }).catch(() => {});

  try {
    const raw = await fs.readFile(KNOWLEDGE_PATH, "utf-8");
    const entries = JSON.parse(raw) as StoredKnowledgeItem[];
    for (const entry of entries) {
      if (entry?.domain && entry?.externalId) {
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
      if (entry?.namespace && entry?.externalId) {
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
  ]).catch((error) => console.warn("Failed to persist fire intelligence stores", error));
}

/* -------------------------------------------------------------------------- */
/*                                Firebase setup                              */
/* -------------------------------------------------------------------------- */

const KNOWLEDGE_COLLECTION = collection(db, "fireIncidentKnowledge");
const VECTOR_COLLECTION = collection(db, "fireIncidentVectors");

function knowledgeDocId(item: KnowledgeItem): string {
  return `${item.domain}__${item.externalId}`;
}

function vectorDocId(item: VectorRecord): string {
  return `${item.namespace}__${item.externalId}`;
}

/* -------------------------------------------------------------------------- */
/*                               CRUD operations                              */
/* -------------------------------------------------------------------------- */

export async function upsertKnowledgeItem(item: KnowledgeItem): Promise<void> {
  await ensureStoreLoaded();

  // Local persistence
  const localKey = knowledgeKey(item.domain, item.externalId);
  const existingLocal = knowledgeStore.get(localKey);
  const now = new Date().toISOString();

  knowledgeStore.set(localKey, {
    ...item,
    tags: item.tags ?? [],
    createdAt: existingLocal?.createdAt ?? now,
    updatedAt: now,
  });
  await persistStores();

  // Firestore persistence
  const docRef = doc(KNOWLEDGE_COLLECTION, knowledgeDocId(item));
  const existingCloud = await getDoc(docRef);
  await setDoc(
    docRef,
    {
      ...item,
      tags: item.tags ?? [],
      updatedAt: now,
      createdAt: existingCloud.exists() ? existingCloud.data()?.createdAt ?? now : now,
    },
    { merge: true }
  );
}

export async function getKnowledgeItem(domain: string, externalId: string) {
  await ensureStoreLoaded();
  const local = knowledgeStore.get(knowledgeKey(domain, externalId));
  if (local) return local;

  const docRef = doc(KNOWLEDGE_COLLECTION, `${domain}__${externalId}`);
  const snapshot = await getDoc(docRef);
  return snapshot.exists() ? snapshot.data() : undefined;
}

export async function upsertVector(item: VectorRecord): Promise<void> {
  await ensureStoreLoaded();

  // Local persistence
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

  // Firestore persistence
  const docRef = doc(VECTOR_COLLECTION, vectorDocId(item));
  const existingCloud = await getDoc(docRef);
  await setDoc(
    docRef,
    {
      ...item,
      metadata: item.metadata ?? {},
      updatedAt: now,
      createdAt: existingCloud.exists() ? existingCloud.data()?.createdAt ?? now : now,
    },
    { merge: true }
  );
}

export async function searchVectors(params: VectorSearchParams): Promise<VectorSearchResult[]> {
  await ensureStoreLoaded();

  const embedding = await createFireIntelEmbedding(params.query);
  const results: VectorSearchResult[] = [];

  // Combine local & cloud search
  const localVectors = Array.from(vectorStore.values()).filter(
    (v) => v.namespace === params.namespace
  );
  for (const record of localVectors) {
    if (!Array.isArray(record.embedding)) continue;
    const similarity = cosineSimilarity(embedding, record.embedding);
    results.push({ ...record, similarity, score: similarity });
  }

  // Firestore vectors
  const vectorQuery = query(VECTOR_COLLECTION, where("namespace", "==", params.namespace));
  const snapshot = await getDocs(vectorQuery);
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as VectorRecord;
    if (!Array.isArray(data.embedding)) return;
    const similarity = cosineSimilarity(embedding, data.embedding);
    results.push({ ...data, similarity, score: similarity });
  });

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, params.k ?? 5);
}
