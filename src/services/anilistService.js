/**
 * AniList service (anime + manga) — replaces Jikan.
 *
 * Why the switch: Jikan is an unofficial scraper of MyAnimeList and, while
 * usually fine, occasionally has real server-side outages (502/503/504)
 * that no amount of client-side retrying can work around. AniList is a
 * proper GraphQL API with its own database (not a live scraper), which
 * makes it meaningfully more stable in practice.
 *
 * No API key is needed for public data — every request is just a POST to
 * a single endpoint with a GraphQL query + variables. AniList enforces a
 * rate limit of ~90 requests/minute plus a short-window burst limiter, so
 * (same as the old Jikan setup) requests are funneled through a small
 * queue here to avoid firing bursts, with retry-with-backoff on 429/5xx.
 *
 * Honest limitation carried over from Jikan: AniList's own docs note that
 * in rare cases of severe instability they return a blanket 403 with a
 * message that the API is temporarily disabled entirely. That's on their
 * end, same as Jikan's occasional 504s were — nothing a retry can fix if
 * their whole API is down, only if it's a brief blip.
 */

const ENDPOINT = 'https://graphql.anilist.co';

let queue = Promise.resolve();
const MIN_GAP_MS = 350;

function enqueue(task) {
  const run = queue.then(() => task());
  queue = run.catch(() => {}).then(() => new Promise((r) => setTimeout(r, MIN_GAP_MS)));
  return run;
}

const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const RETRY_DELAYS_MS = [900, 2000];

async function rawQuery(query, variables) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const err = new Error(`AniList request failed: ${res.status}`);
    err.status = res.status;
    // Respect a Retry-After header if AniList sends one on a 429.
    const retryAfter = res.headers.get('Retry-After');
    if (retryAfter) err.retryAfterMs = Number(retryAfter) * 1000;
    throw err;
  }
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`AniList GraphQL error: ${json.errors[0].message}`);
  }
  return json.data;
}

async function safeQuery(query, variables) {
  return enqueue(async () => {
    let lastErr;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        return await rawQuery(query, variables);
      } catch (err) {
        lastErr = err;
        const shouldRetry = RETRYABLE_STATUSES.has(err.status) && attempt < RETRY_DELAYS_MS.length;
        if (!shouldRetry) throw err;
        await new Promise((r) => setTimeout(r, err.retryAfterMs || RETRY_DELAYS_MS[attempt]));
      }
    }
    throw lastErr;
  });
}

function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, '');
}

function normalize(media, category) {
  const isAnime = category === 'anime';
  const start = media.startDate;
  const releaseDate = start?.year
    ? `${start.year}-${String(start.month || 1).padStart(2, '0')}-${String(start.day || 1).padStart(2, '0')}`
    : null;

  const storyStaff = media.staff?.edges
    ?.filter((e) => /story|art|creator|author/i.test(e.role || ''))
    .map((e) => e.node?.name?.full)
    .filter(Boolean) || [];

  return {
    id: `anilist-${category}-${media.id}`,
    sourceId: media.id,
    source: 'anilist',
    category,
    title: media.title?.english || media.title?.romaji || media.title?.native || 'Untitled',
    description: stripHtml(media.description || ''),
    coverImage: media.coverImage?.large || media.coverImage?.medium || null,
    backdropImage: media.bannerImage || media.coverImage?.large || null,
    rating: media.averageScore != null ? media.averageScore / 10 : null,
    releaseDate,
    year: start?.year ? String(start.year) : null,
    genres: media.genres || [],
    genreNames: media.genres || [],
    status: media.status ? media.status.replaceAll('_', ' ') : null,
    // Anime-specific
    episodes: isAnime ? media.episodes || null : null,
    studios: isAnime ? media.studios?.nodes?.map((s) => s.name) || [] : [],
    ageRating: isAnime && media.isAdult ? '18+' : null,
    durationPerEp: isAnime && media.duration ? `${media.duration} min per ep` : null,
    // Manga-specific
    volumes: !isAnime ? media.volumes || null : null,
    chapters: !isAnime ? media.chapters || null : null,
    authors: !isAnime ? storyStaff : [],
  };
}

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  description(asHtml: false)
  coverImage { large medium }
  bannerImage
  averageScore
  startDate { year month day }
  genres
  status
  episodes
  duration
  isAdult
  volumes
  chapters
  studios { nodes { name } }
  staff(perPage: 4) { edges { role node { name { full } } } }
`;

async function fetchTopMedia(type, page = 1) {
  const query = `
    query ($page: Int, $type: MediaType) {
      Page(page: $page, perPage: 20) {
        media(type: $type, sort: POPULARITY_DESC) { ${MEDIA_FIELDS} }
      }
    }
  `;
  const data = await safeQuery(query, { page, type });
  return data.Page.media;
}

async function searchMedia(type, search) {
  const query = `
    query ($search: String, $type: MediaType) {
      Page(page: 1, perPage: 15) {
        media(type: $type, search: $search, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} }
      }
    }
  `;
  const data = await safeQuery(query, { search, type });
  return data.Page.media;
}

async function getMediaById(id, type) {
  const query = `
    query ($id: Int, $type: MediaType) {
      Media(id: $id, type: $type) { ${MEDIA_FIELDS} }
    }
  `;
  const data = await safeQuery(query, { id, type });
  return data.Media;
}

export async function fetchTopAnime(page = 1) {
  try {
    const media = await fetchTopMedia('ANIME', page);
    return media.map((m) => normalize(m, 'anime'));
  } catch (err) {
    console.error('[anilistService] fetchTopAnime failed', err);
    return [];
  }
}

export async function fetchTopManga(page = 1) {
  try {
    const media = await fetchTopMedia('MANGA', page);
    return media.map((m) => normalize(m, 'manga'));
  } catch (err) {
    console.error('[anilistService] fetchTopManga failed', err);
    return [];
  }
}

export async function searchAnime(query) {
  try {
    const media = await searchMedia('ANIME', query);
    return media.map((m) => normalize(m, 'anime'));
  } catch (err) {
    console.error('[anilistService] searchAnime failed', err);
    return [];
  }
}

export async function searchManga(query) {
  try {
    const media = await searchMedia('MANGA', query);
    return media.map((m) => normalize(m, 'manga'));
  } catch (err) {
    console.error('[anilistService] searchManga failed', err);
    return [];
  }
}

export async function getAnimeById(id) {
  try {
    const media = await getMediaById(Number(id), 'ANIME');
    return media ? normalize(media, 'anime') : null;
  } catch (err) {
    console.error('[anilistService] getAnimeById failed', err);
    return null;
  }
}

export async function getMangaById(id) {
  try {
    const media = await getMediaById(Number(id), 'MANGA');
    return media ? normalize(media, 'manga') : null;
  } catch (err) {
    console.error('[anilistService] getMangaById failed', err);
    return null;
  }
}
