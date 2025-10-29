export async function createFireIntelEmbedding(text: string): Promise<number[]> {
  const normalized = text.normalize('NFKD');
  const length = Math.max(16, Math.min(64, Math.ceil(normalized.length / 20)));
  const vector: number[] = new Array(length).fill(0);

  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i);
    const index = i % length;
    vector[index] += charCode / 65535;
  }

  return vector;
}
