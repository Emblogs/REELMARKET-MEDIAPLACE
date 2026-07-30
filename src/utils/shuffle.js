/**
 * Fisher-Yates shuffle — returns a new shuffled array, doesn't mutate the input.
 * Used to make home page rails feel fresh on every reload, since the
 * underlying trending data from TMDB/AniList only updates once every so often
 * (e.g. TMDB's "trending/day" is the same list all day) — shuffling the
 * display order gives a sense of movement without needing new API data.
 */
export function shuffleArray(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
