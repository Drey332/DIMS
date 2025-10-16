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

const KNOWLEDGE_COLLECTION = collection(db, "fireIncidentKnowledge");
const VECTOR_COLLECTION = collection(db, "fireIncidentVectors");

function knowledgeDocId(item: KnowledgeItem): string {
  return `${item.domain}__${item.externalId}`;
}

function vectorDocId(item: VectorRecord): string {
  return `${item.namespace}__${item.externalId}`;
}

export async function upsertKnowledgeItem(item: KnowledgeItem): Promise<void> {
  const docRef = doc(KNOWLEDGE_COLLECTION, knowledgeDocId(item));
  const existing = await getDoc(docRef);
  const now = new Date().toISOString();

  await setDoc(
    docRef,
    {
      domain: item.domain,
      externalId: item.externalId,
      title: item.title,
      payload: item.payload,
      tags: item.tags ?? [],
      updatedAt: now,
      createdAt: existing.exists() ? existing.data()?.createdAt ?? now : now,
    },
    { merge: true }
  );
}

export async function getKnowledgeItem(domain: string, externalId: string) {
  const docRef = doc(KNOWLEDGE_COLLECTION, `${domain}__${externalId}`);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) {
    return undefined;
  }
  return snapshot.data();
}

export async function upsertVector(item: VectorRecord): Promise<void> {
  const docRef = doc(VECTOR_COLLECTION, vectorDocId(item));
  const existing = await getDoc(docRef);
  const now = new Date().toISOString();

  await setDoc(
    docRef,
    {
      externalId: item.externalId,
      namespace: item.namespace,
      embedding: item.embedding,
      metadata: item.metadata ?? {},
      chunk: item.chunk,
      updatedAt: now,
      createdAt: existing.exists() ? existing.data()?.createdAt ?? now : now,
    },
    { merge: true }
  );
}

export async function searchVectors(params: VectorSearchParams): Promise<VectorSearchResult[]> {
  const embedding = await createFireIntelEmbedding(params.query);
  const vectorQuery = query(VECTOR_COLLECTION, where("namespace", "==", params.namespace));
  const snapshot = await getDocs(vectorQuery);

  const results: VectorSearchResult[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as VectorRecord & { createdAt?: string; updatedAt?: string };
    if (!Array.isArray(data.embedding)) {
      return;
    }
    const similarity = cosineSimilarity(embedding, data.embedding);
    results.push({ ...data, similarity, score: similarity });
  });

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, params.k ?? 5);
}
