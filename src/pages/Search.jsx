import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PosterCard from '../components/catalog/PosterCard';
import Loader from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import { searchAll } from '../services/catalogService';

export default function Search() {
  const [params] = useSearchParams();
  const query = params.get('q') || '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    searchAll(query)
      .then(setResults)
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="container section">
      <span className="eyebrow">Search results</span>
      <h1 className="section-title" style={{ marginBottom: 24 }}>"{query}"</h1>

      {loading && <Loader />}

      {!loading && results.length === 0 && (
        <EmptyState title="No matches found" message="Try a different title, or check your spelling." />
      )}

      {!loading && results.length > 0 && (
        <div className="grid-posters">
          {results.map((item) => (
            <PosterCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
