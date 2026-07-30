/**
 * Google Books service (used for the Comics category).
 *
 * Unlike Comic Vine, Google Books' API sends proper CORS headers, so it
 * works directly from the browser with no proxy and no backend needed.
 * An API key is optional for light usage (Google applies a generous free
 * quota to unauthenticated requests); set VITE_GOOGLE_BOOKS_API_KEY in .env
 * if you want a higher rate limit.
 */

const API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY;
const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

function withKey(url) {
  return API_KEY ? `${url}&key=${API_KEY}` : url;
}

// Retry transient errors — rate limiting (429) and "upstream had a bad
// moment" server errors (502/503/504) — before giving up. These are almost
// always brief and clear up within a couple seconds on their own.
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const RETRY_DELAYS_MS = [700, 1600];

function normalize(item) {
  const info = item.volumeInfo || {};
  return {
    id: `googlebooks-${item.id}`,
    sourceId: item.id,
    source: 'googlebooks',
    category: 'comic',
    title: info.title || 'Untitled',
    description: info.description || 'No synopsis available for this title yet.',
    coverImage: info.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
    backdropImage: null,
    rating: info.averageRating || null,
    releaseDate: info.publishedDate || null,
    year: info.publishedDate ? info.publishedDate.slice(0, 4) : null,
    genres: info.categories || [],
    genreNames: info.categories || [],
    authors: info.authors || [],
    publisher: info.publisher || null,
    pageCount: info.pageCount || null,
  };
}

async function rawFetch(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`Google Books request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function safeFetch(url) {
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

export async function fetchPopularComics(page = 1) {
  const startIndex = (page - 1) * 20;

  // Primary query: broad text match on "comics graphic novel" with relevance
  // ordering. This is more reliable than a narrow subject:/orderBy=newest
  // combination, which frequently returns thin or empty result sets.
  try {
    const data = await safeFetch(
      withKey(
        `${BASE_URL}?q=comics+graphic+novel&maxResults=20&startIndex=${startIndex}&printType=books`
      )
    );
    if (data.items?.length > 0) {
      return data.items.map(normalize);
    }
  } catch (err) {
    console.error('[googleBooksService] primary comics query failed, trying fallback', err);
  }

  // Fallback runs whether the primary attempt returned zero results OR threw
  // an error — a failure on the first try should never skip this step.
  try {
    const fallback = await safeFetch(
      withKey(`${BASE_URL}?q=comics&maxResults=20&startIndex=${startIndex}`)
    );
    return (fallback.items || []).map(normalize);
  } catch (err) {
    console.error('[googleBooksService] fallback comics query also failed', err);
    return [];
  }
}

export async function searchComics(query) {
  try {
    const data = await safeFetch(
      withKey(`${BASE_URL}?q=${encodeURIComponent(query + ' comics')}&maxResults=20`)
    );
    if (data.items?.length > 0) return data.items.map(normalize);
  } catch (err) {
    console.error('[googleBooksService] primary comics search failed, trying fallback', err);
  }

  try {
    const fallback = await safeFetch(
      withKey(`${BASE_URL}?q=${encodeURIComponent(query)}&maxResults=20`)
    );
    return (fallback.items || []).map(normalize);
  } catch (err) {
    console.error('[googleBooksService] fallback comics search also failed', err);
    return [];
  }
}

export async function getComicById(googleBooksId) {
  try {
    const data = await safeFetch(withKey(`${BASE_URL}/${googleBooksId}?fields=id,volumeInfo`));
    return data ? normalize(data) : null;
  } catch (err) {
    console.error('[googleBooksService] getComicById failed', err);
    return null;
  }
}
