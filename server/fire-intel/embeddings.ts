import crypto from "node:crypto";
import OpenAI from "openai";

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

function l2Normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((acc, value) => acc + value * value, 0));
  if (norm === 0) {
    return vector;
  }
  return vector.map((value) => value / norm);
}

function fallbackEmbedding(text: string): number[] {
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const dimensions = 256;
  const vector = new Array<number>(dimensions).fill(0);

  for (const token of tokens) {
    const hash = crypto.createHash("sha256").update(token).digest();
    // Use first two bytes for index to provide dispersion
    const index = (hash[0] << 8 | hash[1]) % dimensions;
    vector[index] += 1;
  }

  return l2Normalize(vector);
}

export async function createFireIntelEmbedding(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) {
    return new Array(256).fill(0);
  }

  const client = getOpenAI();
  if (!client) {
    return fallbackEmbedding(trimmed);
  }

  try {
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: trimmed,
    });
    return response.data[0]?.embedding ?? fallbackEmbedding(trimmed);
  } catch (error) {
    console.warn("OpenAI embedding request failed, using fallback vector:", error);
    return fallbackEmbedding(trimmed);
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    const min = Math.min(a.length, b.length);
    return cosineSimilarity(a.slice(0, min), b.slice(0, min));
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i];
    const bv = b[i];
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / Math.sqrt(normA * normB);
}
