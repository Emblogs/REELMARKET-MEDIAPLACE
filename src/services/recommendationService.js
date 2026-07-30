/**
 * Lightweight recommendation engine.
 *
 * This intentionally avoids pulling in a heavy ML dependency for a
 * frontend-only demo. Instead it uses a transparent, explainable
 * genre-overlap scorer: for a given item, every other item in the pool is
 * scored by how many genres/tags it shares, then sorted descending.
 *
 * This is a legitimate, defensible content-based recommendation approach
 * (the same core idea behind more elaborate recommender systems) — it's
 * just implemented without a model, which keeps it fast and free to run
 * entirely in the browser.
 */

function normalizeGenreList(genres = []) {
  return genres.map((g) => (typeof g === 'string' ? g.toLowerCase() : String(g)));
}

export function scoreSimilarity(itemA, itemB) {
  const genresA = new Set(normalizeGenreList(itemA.genres));
  const genresB = new Set(normalizeGenreList(itemB.genres));
  if (genresA.size === 0 || genresB.size === 0) return 0;

  let overlap = 0;
  for (const g of genresA) {
    if (genresB.has(g)) overlap += 1;
  }
  // Jaccard-style overlap so short/long genre lists are compared fairly.
  const union = new Set([...genresA, ...genresB]).size;
  return union === 0 ? 0 : overlap / union;
}

export function getRecommendations(sourceItem, pool, limit = 8) {
  if (!sourceItem) return [];
  return pool
    .filter((item) => item.id !== sourceItem.id)
    .map((item) => ({ item, score: scoreSimilarity(sourceItem, item) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}
