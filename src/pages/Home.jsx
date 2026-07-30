import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import HeroBanner from '../components/catalog/HeroBanner';
import PosterCard from '../components/catalog/PosterCard';
import Loader from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import { fetchHomeFeed, fetchByCategory } from '../services/catalogService';
import { getActiveBanners } from '../services/bannersService';
import { getRecommendations } from '../services/recommendationService';
import { getOrdersForBuyer } from '../services/ordersService';
import { useAuth } from '../context/AuthContext';
import { shuffleArray } from '../utils/shuffle';
import logoFull from '../assets/logo-full.png';

const REVEAL_CHUNK = 6;

/**
 * A horizontally-scrolling rail that keeps loading more items on its own as
 * the person scrolls toward the end — separate from (and in addition to)
 * the "View all" link, which still takes them to the full paginated Browse
 * page exactly as before.
 *
 * `loadMore()` is supplied by the caller and should resolve to the next
 * batch of items to append, or an empty array when there's nothing left.
 */
function Rail({ title, items: initialItems, viewAllHref, loadMore }) {
  const [items, setItems] = useState(initialItems);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  useEffect(() => {
    setItems(initialItems);
    setHasMore(true);
    hasMoreRef.current = true;
  }, [initialItems]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || !loadMore) return;

    async function loadNext() {
      if (loadingRef.current || !hasMoreRef.current) return;
      loadingRef.current = true;
      setLoadingMore(true);
      try {
        const next = await loadMore();
        if (!next || next.length === 0) {
          hasMoreRef.current = false;
          setHasMore(false);
        } else {
          setItems((prev) => [...prev, ...next]);
        }
      } finally {
        loadingRef.current = false;
        setLoadingMore(false);
      }
    }

    // Using the scrollable rail itself as the intersection root (rather than
    // the viewport) means this correctly fires even when a row doesn't yet
    // have enough items to overflow and scroll at all — it'll keep loading
    // until there's actually more content than fits, at which point normal
    // scroll-triggered loading takes over as the sentinel comes back into view.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadNext();
      },
      { root, rootMargin: '0px 400px 0px 0px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  if (items.length === 0) return null;

  return (
    <section className="section">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
          <div>
            <span className="eyebrow">Now trending</span>
            <h2 className="section-title">{title}</h2>
          </div>
          {viewAllHref && (
            <Link to={viewAllHref} style={{ color: 'var(--accent-tracking)', fontSize: '0.85rem', fontWeight: 600 }}>
              View all →
            </Link>
          )}
        </div>
        <div className="rail-scroll" ref={scrollRef}>
          {items.map((item, idx) => (
            <PosterCard key={`${item.id}-${idx}`} item={item} />
          ))}
          {hasMore && (
            <div ref={sentinelRef} style={{ flexShrink: 0, width: 1, height: 1 }} aria-hidden="true" />
          )}
          {loadingMore && (
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
              Loading more…
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Builds a loadMore() function for a category rail. It first reveals more
 * items from the pool already fetched for the home page (instant, no extra
 * network call), and only once that's exhausted does it reach out for a
 * genuinely new page from the source API — so scrolling a rail feels
 * instant at first and only hits the network once it's actually needed.
 */
function useCategoryLoader(category, fullPool) {
  const stateRef = useRef({ revealIndex: REVEAL_CHUNK, networkPage: 1 });
  const poolRef = useRef(fullPool);
  poolRef.current = fullPool;

  useEffect(() => {
    // Reset the cursor if the underlying pool identity changes (e.g. on a
    // fresh page load with newly shuffled data).
    stateRef.current = { revealIndex: REVEAL_CHUNK, networkPage: 1 };
  }, [fullPool]);

  return useCallback(async () => {
    const s = stateRef.current;
    const pool = poolRef.current;
    if (s.revealIndex < pool.length) {
      const next = pool.slice(s.revealIndex, s.revealIndex + REVEAL_CHUNK);
      s.revealIndex += REVEAL_CHUNK;
      return next;
    }
    s.networkPage += 1;
    return fetchByCategory(category, s.networkPage);
  }, [category]);
}

/**
 * Same idea for the "Recommended for you" rail, except there's no external
 * pagination to fall back to — it just reveals more from the larger
 * locally-computed recommendation list until that's exhausted.
 */
function useLocalLoader(fullList) {
  const stateRef = useRef({ revealIndex: REVEAL_CHUNK });
  const listRef = useRef(fullList);
  listRef.current = fullList;

  useEffect(() => {
    stateRef.current = { revealIndex: REVEAL_CHUNK };
  }, [fullList]);

  return useCallback(async () => {
    const s = stateRef.current;
    const list = listRef.current;
    const next = list.slice(s.revealIndex, s.revealIndex + REVEAL_CHUNK);
    s.revealIndex += REVEAL_CHUNK;
    return next;
  }, []);
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [feed, setFeed] = useState(null);
  const [banners, setBanners] = useState([]);
  const [recommendedPool, setRecommendedPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getActiveBanners().then(setBanners);
    fetchHomeFeed()
      .then(async (result) => {
        const shuffled = {
          movies: shuffleArray(result.movies),
          anime: shuffleArray(result.anime),
          manga: shuffleArray(result.manga),
          comics: shuffleArray(result.comics),
        };
        setFeed(shuffled);

        const pool = [...shuffled.movies, ...shuffled.anime, ...shuffled.manga, ...shuffled.comics];
        if (pool.length === 0) return;

        let anchor = null;
        if (isAuthenticated && user) {
          const orders = await getOrdersForBuyer(user.id);
          const lastOrder = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
          if (lastOrder?.titleSnapshot?.title) {
            anchor = pool.find((p) => p.title === lastOrder.titleSnapshot.title);
          }
        }
        if (!anchor) {
          anchor = [...pool].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
        }
        // Compute a larger recommendation list up front (capped at pool size);
        // the rail only shows 6 at a time and reveals more as you scroll.
        setRecommendedPool(getRecommendations(anchor, pool, pool.length));
      })
      .catch((err) => {
        console.error(err);
        setError('Some catalog sources could not be reached. Showing what is available.');
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, user]);

  const movieLoader = useCategoryLoader('movie', feed?.movies || []);
  const animeLoader = useCategoryLoader('anime', feed?.anime || []);
  const mangaLoader = useCategoryLoader('manga', feed?.manga || []);
  const comicLoader = useCategoryLoader('comic', feed?.comics || []);
  const recommendedLoader = useLocalLoader(recommendedPool);

  return (
    <div>
      <div className="container" style={{ paddingTop: 20 }}>
        <HeroBanner banners={banners} />
      </div>

      {loading && <Loader label="Loading the shelves…" />}

      {!loading && error && (
        <div className="container">
          <p style={{ color: 'var(--warning)', fontSize: '0.85rem', marginTop: 16 }}>{error}</p>
        </div>
      )}

      {!loading && feed && (
        <>
          {recommendedPool.length > 0 && (
            <Rail
              title="Recommended for you"
              items={recommendedPool.slice(0, REVEAL_CHUNK)}
              loadMore={recommendedLoader}
            />
          )}

          <Rail
            title="Movies people are watching"
            items={feed.movies.slice(0, REVEAL_CHUNK)}
            viewAllHref="/browse/movie"
            loadMore={movieLoader}
          />
          <Rail
            title="Top anime right now"
            items={feed.anime.slice(0, REVEAL_CHUNK)}
            viewAllHref="/browse/anime"
            loadMore={animeLoader}
          />
          <Rail
            title="Top manga right now"
            items={feed.manga.slice(0, REVEAL_CHUNK)}
            viewAllHref="/browse/manga"
            loadMore={mangaLoader}
          />
          <Rail
            title="Comics from the marketplace"
            items={feed.comics.slice(0, REVEAL_CHUNK)}
            viewAllHref="/browse/comic"
            loadMore={comicLoader}
          />

          {feed.movies.length + feed.anime.length + feed.manga.length + feed.comics.length === 0 && (
            <div className="container">
              <EmptyState
                title="The catalog is quiet right now"
                message="Add API keys in your .env file to pull live movies, anime, manga and comics — see the README for setup."
              />
            </div>
          )}
        </>
      )}

      <div className="container">
        <div className="sprocket-divider">
          <div className="holes"><span /><span /><span /></div>
        </div>
      </div>

      <section className="section">
        <div className="container sell-with-us-block">
          <div>
            <span className="eyebrow">Sell with us</span>
            <h2 className="section-title">Turn your collection into cash — or a trade</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 560, margin: '12px 0 20px' }}>
              Approved sellers can list movies, anime, manga and comics for sale or trade.
              Every listing is reviewed before it goes live, and every seller carries a visible trust score.
            </p>
            <Link to="/apply-seller">
              <button className="btn btn-outline-cyan btn-lg">Apply to become a seller</button>
            </Link>
          </div>
          <img src={logoFull} alt="" className="sell-with-us-illustration" aria-hidden="true" />
        </div>
      </section>
    </div>
  );
}
