import { Chunk } from '../types';

export interface ScoredChunk {
  chunk: Chunk;
  score: number;
}

/**
 * Computes BM25-style lexical score for a query against a document text.
 * Handles exact keywords, term frequency, length normalization, and phrase proximity.
 */
export function computeBM25Score(query: string, document: string): number {
  if (!query || !document) return 0;

  const queryTerms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((term) => term.length > 2);

  if (queryTerms.length === 0) return 0;

  const docClean = document.toLowerCase();
  const docTokens = docClean.replace(/[^\w\s]/g, '').split(/\s+/);
  const docLength = docTokens.length;
  const avgDocLength = 250; // Expected average chunk length

  // BM25 parameters
  const k1 = 1.2;
  const b = 0.75;

  let totalScore = 0;

  for (const term of queryTerms) {
    // Count occurrences of term in doc
    let tf = 0;
    let pos = 0;
    while ((pos = docClean.indexOf(term, pos)) !== -1) {
      tf++;
      pos += term.length;
    }

    if (tf > 0) {
      // Saturation function with document length normalization
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1 - b + b * (docLength / avgDocLength));
      totalScore += numerator / Math.max(denominator, 0.001);
    }
  }

  // Exact phrase match bonus
  if (queryTerms.length > 1 && docClean.includes(query.toLowerCase().trim())) {
    totalScore += 2.5;
  }

  return totalScore;
}

/**
 * Reciprocal Rank Fusion (RRF):
 * Fuses ranked results from Dense Vector search and Sparse BM25 lexical search.
 * Formula: RRF_Score = sum( 1 / (k + rank_i) )
 */
export function reciprocalRankFusion(
  vectorRanked: Chunk[],
  bm25Ranked: Chunk[],
  k = 60,
  topK = 10,
): Chunk[] {
  const scores = new Map<string, { chunk: Chunk; rrfScore: number }>();

  const getHash = (c: Chunk) =>
    `${c.metadata.fileId || c.metadata.url || ''}:${c.content.slice(0, 80)}`;

  // Process Vector ranks
  vectorRanked.forEach((chunk, rank) => {
    const key = getHash(chunk);
    const score = 1 / (k + (rank + 1));
    scores.set(key, { chunk, rrfScore: score });
  });

  // Process BM25 ranks
  bm25Ranked.forEach((chunk, rank) => {
    const key = getHash(chunk);
    const score = 1 / (k + (rank + 1));
    if (scores.has(key)) {
      scores.get(key)!.rrfScore += score;
    } else {
      scores.set(key, { chunk, rrfScore: score });
    }
  });

  // Sort by fused score descending
  const sorted = Array.from(scores.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .map((item) => item.chunk);

  return sorted.slice(0, topK);
}
