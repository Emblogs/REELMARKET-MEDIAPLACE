import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PosterCard from '../components/catalog/PosterCard';
import Loader from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import { fetchByCategory } from '../services/catalogService';

const CATEGORY_META = {
  movie: { label: 'Movies', eyebrow: 'On the big screen' },
  anime: { label: 'Anime', eyebrow: 'From the studios' },
  manga: { label: 'Manga', eyebrow: 'Panel by panel' },
  comic: { label: 'Comics', eyebrow: 'From the marketplace' },
};

export default function Browse() {
  const { category } = useParams();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const meta = CATEGORY_META[category] || { label: category, eyebrow: 'Browse' };

  const [sentinelNode, setSentinelNode] = useState(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const pageRef = useRef(1);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    pageRef.current = 1;
    setHasMore(true);
    hasMoreRef.current = true;
    fetchByCategory(category, 1)
      .then((result) => {
        setItems(result);
        setHasMore(result.length > 0);
        hasMoreRef.current = result.length > 0;
      })
      .finally(() => setLoading(false));
  }, [category]);

  const loadNext = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    try {
      let result = await fetchByCategory(category, nextPage);
      if (result.length === 0) {
        // A single empty response could be a transient rate-limit hiccup
        // rather than truly "no more pages" — try once more before giving up.
        result = await fetchByCategory(category, nextPage);
      }
      if (result.length === 0) {
        hasMoreRef.current = false;
        setHasMore(false);
      } else {
        setItems((prev) => [...prev, ...result]);
        pageRef.current = nextPage;
        setPage(nextPage);
      }
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [category]);

  // Infinite scroll: load the next page automatically as the person nears
  // the bottom of the grid, instead of requiring a "Load more" click.
  //
  // IMPORTANT: this depends on `sentinelNode` (state), not a plain ref. The
  // sentinel element only exists in the DOM once the first page has loaded,
  // so a plain ref read inside this effect would often be null on the
  // effect's first (and only, given a stable dependency array) run — the
  // observer would then never attach to anything and infinite scroll would
  // silently do nothing. Using a callback ref that stores the node in state
  // means this effect re-runs the moment the element actually mounts.
  useEffect(() => {
    if (!sentinelNode) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadNext();
      },
      { rootMargin: '600px 0px', threshold: 0 }
    );
    observer.observe(sentinelNode);
    return () => observer.disconnect();
  }, [sentinelNode, loadNext]);

  return (
    <div className="container section">
      <div className="pill-tabs" style={{ marginBottom: 20 }}>
        {Object.entries(CATEGORY_META).map(([key, m]) => (
          <Link key={key} to={`/browse/${key}`}>
            <span className={`pill-tab ${key === category ? 'active' : ''}`}>{m.label}</span>
          </Link>
        ))}
      </div>

      <span className="eyebrow">{meta.eyebrow}</span>
      <h1 className="section-title" style={{ marginBottom: 24 }}>{meta.label}</h1>

      {loading && <Loader />}

      {!loading && items.length === 0 && (
        <EmptyState
          title="Nothing to show yet"
          message={
            category === 'comic'
              ? 'Google Books could not be reached right now — this needs no API key, so it should recover on its own. Try refreshing in a moment.'
              : 'This category needs an API key configured in your .env file, or the source is temporarily unreachable.'
          }
        />
      )}

      {!loading && items.length > 0 && (
        <>
          <div className="grid-posters">
            {items.map((item, idx) => (
              <PosterCard key={`${item.id}-${idx}`} item={item} />
            ))}
          </div>

          {hasMore && (
            <div ref={setSentinelNode} style={{ height: 1 }} aria-hidden="true" />
          )}
          {loadingMore && (
            <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
              Loading more…
            </p>
          )}
          {!hasMore && (
            <p style={{ textAlign: 'center', marginTop: 32, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              You've reached the end.
            </p>
          )}
        </>
      )}
    </div>
  );
}
