export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0) {
    throw new Error('Arrays must not be empty');
  }
  if (a.length !== b.length) {
    throw new Error('Arrays must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    throw new Error('Magnitude of vectors cannot be zero');
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
