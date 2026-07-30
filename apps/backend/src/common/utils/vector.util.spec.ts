import { cosineSimilarity } from './vector.util';

describe('cosineSimilarity', () => {
  it('should return ~1 for identical vectors', () => {
    const a = [1, 2, 3];
    const b = [1, 2, 3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 5);
  });

  it('should return ~-1 for opposite vectors', () => {
    const a = [1, 2, 3];
    const b = [-1, -2, -3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 5);
  });

  it('should return ~0 for orthogonal vectors', () => {
    const a = [1, 0];
    const b = [0, 1];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 5);
  });

  it('should throw error if arrays have different lengths', () => {
    const a = [1, 2];
    const b = [1, 2, 3];
    expect(() => cosineSimilarity(a, b)).toThrow(
      'Arrays must have the same length',
    );
  });

  it('should throw error if arrays are empty', () => {
    expect(() => cosineSimilarity([], [])).toThrow('Arrays must not be empty');
  });

  it('should throw error if magnitude is zero', () => {
    const a = [0, 0];
    const b = [1, 1];
    expect(() => cosineSimilarity(a, b)).toThrow(
      'Magnitude of vectors cannot be zero',
    );
  });
});
