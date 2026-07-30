import * as tmdb from './tmdbService';
import * as anilist from './anilistService';
import * as googleBooks from './googleBooksService';
import { getApprovedListingsForTitle } from './listingsService';

/**
 * catalogService is the single entry point pages should use to browse
 * "titles" (the content itself, e.g. a movie or a manga) regardless of
 * which external API it came from. It never returns raw TMDB/AniList/Google
 * Books shapes — everything is normalized by the individual source services.
 */

export async function fetchByCategory(category, page = 1) {
  switch (category) {
    case 'movie':
      return tmdb.fetchTrendingMovies(page);
    case 'anime':
      return anilist.fetchTopAnime(page);
    case 'manga':
      return anilist.fetchTopManga(page);
    case 'comic':
      return googleBooks.fetchPopularComics(page);
    default:
      return [];
  }
}

export async function fetchHomeFeed() {
  const [movies, anime, manga, comics] = await Promise.all([
    tmdb.fetchTrendingMovies(),
    anilist.fetchTopAnime(),
    anilist.fetchTopManga(),
    googleBooks.fetchPopularComics(),
  ]);
  return { movies, anime, manga, comics };
}

export async function searchAll(query) {
  if (!query?.trim()) return [];
  const [movies, anime, manga, comics] = await Promise.all([
    tmdb.searchMovies(query),
    anilist.searchAnime(query),
    anilist.searchManga(query),
    googleBooks.searchComics(query),
  ]);
  return [...movies, ...anime, ...manga, ...comics];
}

export async function getTitleById(compositeId) {
  // compositeId format: "<source>-<category?>-<sourceId>" as produced by normalize()
  const [source] = compositeId.split('-');
  if (source === 'tmdb') {
    const sourceId = compositeId.replace('tmdb-', '');
    return tmdb.getMovieById(sourceId);
  }
  if (source === 'anilist') {
    const rest = compositeId.replace('anilist-', '');
    const [category, sourceId] = rest.split('-');
    return category === 'anime' ? anilist.getAnimeById(sourceId) : anilist.getMangaById(sourceId);
  }
  if (source === 'googlebooks') {
    const sourceId = compositeId.replace('googlebooks-', '');
    return googleBooks.getComicById(sourceId);
  }
  return null;
}

/**
 * Attaches marketplace listings (seller offers, curated admin/staff items)
 * to a catalog title, so a single title page can show "who's selling this".
 */
export async function getListingsForTitle(compositeId) {
  return getApprovedListingsForTitle(compositeId);
}
