import { Link, useNavigate } from 'react-router-dom';
import './catalog.css';

const CATEGORY_LABEL = {
  movie: 'Movie',
  anime: 'Anime',
  manga: 'Manga',
  comic: 'Comic',
};

export default function PosterCard({ item }) {
  const navigate = useNavigate();
  if (!item) return null;

  function handleQuickBuy(e) {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/title/${item.id}`);
  }

  return (
    <Link to={`/title/${item.id}`} className="poster-card">
      <div className="poster-image-wrap">
        {item.coverImage ? (
          <img src={item.coverImage} alt={item.title} loading="lazy" />
        ) : (
          <div className="poster-fallback">{item.title?.[0] || '?'}</div>
        )}
        <span className="poster-category-tag">{CATEGORY_LABEL[item.category] || item.category}</span>
        {item.rating ? <span className="poster-rating-tag">★ {Number(item.rating).toFixed(1)}</span> : null}

        <div className="poster-quickview">
          <p className="poster-quickview-title">{item.title}</p>
          <p className="poster-quickview-desc">
            {item.description || 'No synopsis available for this title yet.'}
          </p>
          <div className="poster-quickview-actions">
            <button className="btn btn-primary btn-sm" onClick={handleQuickBuy}>View & buy</button>
          </div>
        </div>
      </div>
      <div className="poster-meta">
        <p className="poster-title">{item.title}</p>
      </div>
    </Link>
  );
}
