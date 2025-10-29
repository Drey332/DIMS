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
  chunk: string;
}

const knowledgeItems = new Map<string, KnowledgeItem>();
const vectorRecords = new Map<string, VectorRecord>();

function knowledgeKey(domain: string, externalId: string): string {
  return `${domain}::${externalId}`;
}

function vectorKey(namespace: string, externalId: string): string {
  return `${namespace}::${externalId}`;
}

export async function upsertKnowledgeItem(item: KnowledgeItem): Promise<void> {
  knowledgeItems.set(knowledgeKey(item.domain, item.externalId), { ...item });
}

export async function getKnowledgeItem(domain: string, externalId: string): Promise<KnowledgeItem | undefined> {
  return knowledgeItems.get(knowledgeKey(domain, externalId));
}

export interface SearchVectorsOptions {
  namespace: string;
  query: string;
  k?: number;
}

export async function searchVectors(options: SearchVectorsOptions): Promise<VectorRecord[]> {
  const records = Array.from(vectorRecords.values()).filter((record) => record.namespace === options.namespace);
  const normalizedQuery = options.query.trim().toLowerCase();

  if (!normalizedQuery) {
    return records.slice(0, options.k ?? records.length);
  }

  return records
    .map((record) => {
      const haystack = `${record.chunk}\n${JSON.stringify(record.metadata ?? {})}`.toLowerCase();
      const score = haystack.includes(normalizedQuery) ? 1 : 0;
      return { record, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, options.k ?? records.length)
    .map((entry) => entry.record);
}

export interface UpsertVectorInput extends VectorRecord {}

export async function upsertVector(entry: UpsertVectorInput): Promise<void> {
  vectorRecords.set(vectorKey(entry.namespace, entry.externalId), { ...entry });
}
