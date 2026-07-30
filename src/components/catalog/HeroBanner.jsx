import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import './catalog.css';

export default function HeroBanner({ banners = [] }) {
  const [active, setActive] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setActive((i) => (i + 1) % banners.length), 6000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (banners.length === 0) return null;
  const banner = banners[active];

  return (
    <div className="hero-banner">
      <div
        className="hero-banner-bg"
        style={{ backgroundImage: `url(${banner.imageUrl})` }}
        role="img"
        aria-label={banner.title}
      />
      <div className="hero-banner-content">
        <div className="hero-banner-chips">
          <span className="notch-badge">Featured</span>
          <span className="notch-badge" style={{ borderStyle: 'solid', color: 'var(--accent-gold)' }}>★ Editor's pick</span>
        </div>
        <h1 className="hero-banner-title">{banner.title}</h1>
        <p className="hero-banner-subtitle">{banner.subtitle}</p>
        <div className="hero-banner-cta-row">
          {banner.linkTo && (
            <Button variant="primary" size="lg" onClick={() => navigate(banner.linkTo)}>
              Browse now
            </Button>
          )}
          <Button variant="secondary" size="lg" onClick={() => navigate('/apply-seller')}>
            Sell on ReelMarket
          </Button>
        </div>
      </div>
      {banners.length > 1 && (
        <div className="hero-dots">
          {banners.map((b, i) => (
            <button
              key={b.id}
              className={`hero-dot ${i === active ? 'active' : ''}`}
              onClick={() => setActive(i)}
              aria-label={`Show banner ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
