const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';
const PROFILE_IMG_BASE = 'https://image.tmdb.org/t/p/w185';

/**
 * Normalizes a TMDB movie object into the app's common catalog item shape.
 * Every source service (tmdb/anilist/googleBooks) must return items in this
 * exact shape so the UI never needs to know which API something came from.
 *
 * Fields prefixed with "detail" (cast, runtimeMinutes, trailerKey, etc.) are
 * only populated by getMovieById — list/search results stay light so a grid
 * of 20 posters doesn't trigger 20x the API calls.
 */
function normalize(movie) {
  return {
    id: `tmdb-${movie.id}`,
    sourceId: movie.id,
    source: 'tmdb',
    category: 'movie',
    title: movie.title,
    description: movie.overview,
    coverImage: movie.poster_path ? `${IMG_BASE}${movie.poster_path}` : null,
    backdropImage: movie.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
      : null,
    rating: movie.vote_average,
    releaseDate: movie.release_date,
    year: movie.release_date ? movie.release_date.slice(0, 4) : null,
    genres: movie.genre_ids || movie.genres?.map((g) => g.id) || [],
    genreNames: movie.genres?.map((g) => g.name) || [],
    runtimeMinutes: movie.runtime || null,
    tagline: movie.tagline || null,
    productionCompanies: movie.production_companies?.map((c) => c.name) || [],
    cast: movie.credits?.cast?.slice(0, 8).map((c) => ({
      name: c.name,
      character: c.character,
      photo: c.profile_path ? `${PROFILE_IMG_BASE}${c.profile_path}` : null,
    })) || [],
    director: movie.credits?.crew?.find((c) => c.job === 'Director')?.name || null,
    trailerKey:
      movie.videos?.results?.find((v) => v.site === 'YouTube' && v.type === 'Trailer')?.key ||
      null,
  };
}

// Retry transient errors — rate limiting (429) and brief upstream server
// errors (502/503/504) — before giving up, same pattern used across all
// three catalog services.
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const RETRY_DELAYS_MS = [700, 1600];

async function rawFetch(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`TMDB request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function safeFetch(url) {
  if (!API_KEY) {
    console.warn('[tmdbService] VITE_TMDB_API_KEY is not set — returning empty results.');
    return null;
  }
  let lastErr;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await rawFetch(url);
    } catch (err) {
      lastErr = err;
      const shouldRetry = RETRYABLE_STATUSES.has(err.status) && attempt < RETRY_DELAYS_MS.length;
      if (!shouldRetry) throw err;
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }
  throw lastErr;
}

export async function fetchTrendingMovies(page = 1) {
  try {
    const data = await safeFetch(
      `${BASE_URL}/trending/movie/day?api_key=${API_KEY}&page=${page}`
    );
    return data ? data.results.map(normalize) : [];
  } catch (err) {
    console.error('[tmdbService] fetchTrendingMovies failed', err);
    return [];
  }
}

export async function searchMovies(query, page = 1) {
  try {
    const data = await safeFetch(
      `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&page=${page}`
    );
    return data ? data.results.map(normalize) : [];
  } catch (err) {
    console.error('[tmdbService] searchMovies failed', err);
    return [];
  }
}

/**
 * Fetches full movie detail in one call using TMDB's append_to_response,
 * pulling cast/crew (credits) and a trailer (videos) alongside the base
 * movie record — one request instead of three.
 */
export async function getMovieById(tmdbId) {
  try {
    const data = await safeFetch(
      `${BASE_URL}/movie/${tmdbId}?api_key=${API_KEY}&append_to_response=credits,videos`
    );
    return data ? normalize(data) : null;
  } catch (err) {
    console.error('[tmdbService] getMovieById failed', err);
    return null;
  }
}

export async function fetchByGenrePool(genreId) {
  try {
    const data = await safeFetch(
      `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}`
    );
    return data ? data.results.map(normalize) : [];
  } catch (err) {
    console.error('[tmdbService] fetchByGenrePool failed', err);
    return [];
  }
}
