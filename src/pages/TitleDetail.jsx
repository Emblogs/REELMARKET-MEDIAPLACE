import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import PosterCard from '../components/catalog/PosterCard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Loader from '../components/ui/Loader';
import { getTitleById, fetchByCategory } from '../services/catalogService';
import { ensureDefaultListing } from '../services/listingsService';
import { getFranchises } from '../data/seed';
import { getRecommendations } from '../services/recommendationService';
import { getSellerTrustScore } from '../services/trustScoreService';
import { useAuth } from '../context/AuthContext';
import { addToCart } from '../services/cartService';
import { formatNaira } from '../utils/format';

function findFranchise(item) {
  if (!item) return null;
  const franchises = getFranchises();
  return (
    franchises.find((f) => {
      const link = f.links?.[item.category];
      if (!link) return false;
      return item.title?.toLowerCase().includes(f.name.toLowerCase());
    }) || null
  );
}

export default function TitleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [item, setItem] = useState(null);
  const [listings, setListings] = useState([]);
  const [trustScores, setTrustScores] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTitleById(id).then(async (fetched) => {
      if (cancelled || !fetched) {
        setLoading(false);
        return;
      }
      setItem(fetched);
      const currentListings = await ensureDefaultListing(fetched);
      if (cancelled) return;
      setListings(currentListings);

      // Batch-fetch trust scores for every distinct seller on this page,
      // rather than calling the (now async) trust score service inline
      // during render for each listing.
      const sellerIds = [...new Set(currentListings.map((l) => l.sellerId).filter(Boolean))];
      const scores = await Promise.all(sellerIds.map((sid) => getSellerTrustScore(sid)));
      if (cancelled) return;
      const scoreMap = {};
      sellerIds.forEach((sid, idx) => { scoreMap[sid] = scores[idx]; });
      setTrustScores(scoreMap);

      const pool = await fetchByCategory(fetched.category);
      if (cancelled) return;
      setRecommendations(getRecommendations(fetched, pool, 6));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  const franchise = useMemo(() => findFranchise(item), [item]);

  async function handleBuy(listing) {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    await addToCart({
      userId: user.id,
      listingId: listing.id,
      titleSnapshot: listing.titleSnapshot,
      price: listing.price,
      quantity: 1,
    });
    navigate('/cart');
  }

  if (loading) return <div className="container section"><Loader /></div>;
  if (!item) {
    return (
      <div className="container section">
        <p>This title could not be found.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="hero-banner" style={{ minHeight: 320 }}>
        <div
          className="hero-banner-bg"
          style={{ backgroundImage: `url(${item.backdropImage || item.coverImage})` }}
        />
        <div className="hero-banner-content" style={{ maxWidth: '100%' }}>
          <span className="eyebrow">{item.category?.toUpperCase()}</span>
          <h1 className="hero-banner-title" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
            {item.title}
          </h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            {item.rating ? <Badge variant="cyan">★ {Number(item.rating).toFixed(1)}</Badge> : null}
            {item.year && <Badge variant="neutral">{item.year}</Badge>}
            {item.category === 'movie' && item.runtimeMinutes && (
              <Badge variant="neutral">{item.runtimeMinutes} min</Badge>
            )}
            {item.category === 'anime' && item.episodes && (
              <Badge variant="neutral">{item.episodes} episodes</Badge>
            )}
            {item.category === 'manga' && (item.volumes || item.chapters) && (
              <Badge variant="neutral">
                {item.volumes ? `${item.volumes} vol` : `${item.chapters} ch`}
              </Badge>
            )}
            {item.category === 'comic' && item.pageCount && (
              <Badge variant="neutral">{item.pageCount} pages</Badge>
            )}
            {item.status && <Badge variant="neutral">{item.status}</Badge>}
            {item.category === 'anime' && item.ageRating && (
              <Badge variant="neutral">{item.ageRating}</Badge>
            )}
          </div>
          {item.trailerKey && (
            <a
              href={`https://www.youtube.com/watch?v=${item.trailerKey}`}
              target="_blank"
              rel="noreferrer"
            >
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 4 }}>▶ Watch trailer</button>
            </a>
          )}
        </div>
      </div>

      <div className="container section">
        <div className="title-detail-grid">
          <img
            src={item.coverImage}
            alt={item.title}
            style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}
          />
          <div>
            {franchise && (
              <div className="franchise-tabs">
                {['overview', ...Object.keys(franchise.links)].map((t) => (
                  <button
                    key={t}
                    className={`franchise-tab ${tab === t ? 'active' : ''}`}
                    onClick={() => setTab(t)}
                  >
                    {t}
                  </button>
                ))}
                {(franchise.watchOrder || franchise.readOrder) && (
                  <button
                    className={`franchise-tab ${tab === 'guide' ? 'active' : ''}`}
                    onClick={() => setTab('guide')}
                  >
                    Watch/Read order
                  </button>
                )}
              </div>
            )}

            {tab === 'overview' && (
              <div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{item.description}</p>

                {item.genreNames?.length > 0 && (
                  <div className="pill-tabs" style={{ marginBottom: 16 }}>
                    {item.genreNames.map((g) => (
                      <span key={g} className="notch-badge">{g}</span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {item.category === 'movie' && item.director && (
                    <p><strong style={{ color: 'var(--text-primary)' }}>Director:</strong> {item.director}</p>
                  )}
                  {item.category === 'movie' && item.productionCompanies?.length > 0 && (
                    <p><strong style={{ color: 'var(--text-primary)' }}>Studio:</strong> {item.productionCompanies.slice(0, 3).join(', ')}</p>
                  )}
                  {item.category === 'anime' && item.studios?.length > 0 && (
                    <p><strong style={{ color: 'var(--text-primary)' }}>Studio:</strong> {item.studios.join(', ')}</p>
                  )}
                  {item.category === 'manga' && item.authors?.length > 0 && (
                    <p><strong style={{ color: 'var(--text-primary)' }}>Author:</strong> {item.authors.join(', ')}</p>
                  )}
                  {item.category === 'comic' && item.authors?.length > 0 && (
                    <p><strong style={{ color: 'var(--text-primary)' }}>Author:</strong> {item.authors.join(', ')}</p>
                  )}
                  {item.category === 'comic' && item.publisher && (
                    <p><strong style={{ color: 'var(--text-primary)' }}>Publisher:</strong> {item.publisher}</p>
                  )}
                </div>

                {item.category === 'movie' && item.cast?.length > 0 && (
                  <>
                    <p className="eyebrow" style={{ marginBottom: 10 }}>Cast</p>
                    <div className="rail-scroll" style={{ paddingBottom: 8 }}>
                      {item.cast.map((c) => (
                        <div key={c.name} style={{ minWidth: 90, textAlign: 'center' }}>
                          <div style={{
                            width: 70, height: 70, borderRadius: '50%', overflow: 'hidden',
                            background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)',
                            margin: '0 auto 6px',
                          }}>
                            {c.photo ? (
                              <img src={c.photo} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', color: 'var(--text-muted)' }}>
                                {c.name[0]}
                              </div>
                            )}
                          </div>
                          <p style={{ fontSize: '0.76rem', fontWeight: 700 }}>{c.name}</p>
                          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{c.character}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {franchise && tab === 'guide' && (
              <div>
                <p className="eyebrow" style={{ marginBottom: 8 }}>Part of the {franchise.name} universe</p>
                {franchise.watchOrder && (
                  <>
                    <h4 style={{ margin: '12px 0 6px' }}>Watch order</h4>
                    <ol style={{ paddingLeft: 20, color: 'var(--text-secondary)' }}>
                      {franchise.watchOrder.map((s) => <li key={s.step}>{s.label}</li>)}
                    </ol>
                  </>
                )}
                {franchise.readOrder && (
                  <>
                    <h4 style={{ margin: '12px 0 6px' }}>Read order</h4>
                    <ol style={{ paddingLeft: 20, color: 'var(--text-secondary)' }}>
                      {franchise.readOrder.map((s) => <li key={s.step}>{s.label}</li>)}
                    </ol>
                  </>
                )}
              </div>
            )}

            {franchise && Object.keys(franchise.links).includes(tab) && (
              <p style={{ color: 'var(--text-secondary)' }}>
                This franchise also has a {tab} entry: <strong>{franchise.links[tab].title || franchise.name}</strong>.
                Use search to find it in the catalog.
              </p>
            )}
          </div>
        </div>

        <div className="sprocket-divider"><div className="holes"><span /><span /><span /></div></div>

        <h2 className="section-title" style={{ fontSize: '1.4rem', marginBottom: 12 }}>
          Available from sellers ({listings.length})
        </h2>

        {listings.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>
            No marketplace listings for this title yet.{' '}
            <Link to="/apply-seller" style={{ color: 'var(--accent-tracking)' }}>Become a seller</Link> to list it.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {listings.map((listing) => {
            const trust = listing.sellerId ? trustScores[listing.sellerId] : null;
            return (
              <div key={listing.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <p style={{ fontWeight: 700 }}>{listing.sellerName}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    <Badge variant="neutral">{listing.condition}</Badge>
                    <Badge variant={listing.availability === 'trade' ? 'cyan' : 'neutral'}>
                      {listing.availability}
                    </Badge>
                    <Badge variant="neutral">{listing.stock} in stock</Badge>
                    {trust && trust.score !== null && (
                      <Badge variant={trust.score >= 70 ? 'success' : trust.score >= 40 ? 'warning' : 'danger'}>
                        {trust.label} · {trust.score}%
                      </Badge>
                    )}
                    {trust && trust.score === null && <Badge variant="neutral">New Seller</Badge>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--accent-gold)' }}>
                    {formatNaira(listing.price)}
                  </span>
                  <Button
                    variant="primary"
                    disabled={listing.stock === 0}
                    onClick={() => handleBuy(listing)}
                  >
                    {listing.stock === 0 ? 'Out of stock' : 'Add to cart'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {recommendations.length > 0 && (
          <>
            <div className="sprocket-divider"><div className="holes"><span /><span /><span /></div></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
              <h2 className="section-title" style={{ fontSize: '1.4rem' }}>If you liked this</h2>
              <Link to={`/browse/${item.category}`} style={{ color: 'var(--accent-tracking)', fontSize: '0.85rem', fontWeight: 600 }}>
                View all →
              </Link>
            </div>
            <div className="rail-scroll">
              {recommendations.map((rec) => <PosterCard key={rec.id} item={rec} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
