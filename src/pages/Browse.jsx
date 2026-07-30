import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PosterCard from '../components/catalog/PosterCard';
import Loader from '../components/ui/Loader';
import Button from '../components/ui/Button';
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

  useEffect(() => {
    setLoading(true);
    setPage(1);
    setHasMore(true);
    fetchByCategory(category, 1)
      .then((result) => {
        setItems(result);
        setHasMore(result.length > 0);
      })
      .finally(() => setLoading(false));
  }, [category]);

  function handleLoadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    fetchByCategory(category, nextPage)
      .then(async (result) => {
        if (result.length === 0) {
          // A single empty response could be a transient rate-limit hiccup
          // rather than truly "no more pages" — try once more before giving up.
          const retry = await fetchByCategory(category, nextPage);
          if (retry.length === 0) {
            setHasMore(false);
            return;
          }
          setItems((prev) => [...prev, ...retry]);
          setPage(nextPage);
          return;
        }
        setItems((prev) => [...prev, ...result]);
        setPage(nextPage);
      })
      .finally(() => setLoadingMore(false));
  }

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
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
              <Button variant="secondary" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
