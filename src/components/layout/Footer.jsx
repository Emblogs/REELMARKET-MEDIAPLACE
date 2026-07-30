import { Link } from 'react-router-dom';
import logoMark from '../../assets/logo-mark.png';
import './layout.css';

const COLUMNS = [
  {
    heading: 'Shop',
    links: [
      { label: 'Movies', to: '/browse/movie' },
      { label: 'Anime', to: '/browse/anime' },
      { label: 'Manga', to: '/browse/manga' },
      { label: 'Comics', to: '/browse/comic' },
    ],
  },
  {
    heading: 'Sell',
    links: [
      { label: 'Become a seller', to: '/apply-seller' },
      { label: 'Seller agreement', to: '/seller-terms' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Sign in', to: '/login' },
      { label: 'Create account', to: '/signup' },
      { label: 'My orders', to: '/account' },
      { label: 'My cart', to: '/cart' },
    ],
  },
];

const SOCIALS = [
  { label: 'Instagram', href: 'https://instagram.com/reelmarket', abbr: 'IG' },
  { label: 'X (Twitter)', href: 'https://x.com/reelmarket', abbr: 'X' },
  { label: 'WhatsApp', href: 'https://wa.me/2340000000000', abbr: 'WA' },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <p className="navbar-logo" style={{ fontSize: '1.3rem' }}>
            <img src={logoMark} alt="" className="navbar-logo-mark" style={{ height: 30 }} />
            REEL<span>MARKET</span>
          </p>
          <p className="footer-tagline">
            Movies, anime, manga and comics — buy, sell, or trade with a marketplace
            built for collectors.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div className="footer-col" key={col.heading}>
            <h4>{col.heading}</h4>
            <ul>
              {col.links.map((l) => (
                <li key={l.to}><Link to={l.to}>{l.label}</Link></li>
              ))}
            </ul>
          </div>
        ))}

        <div className="footer-col">
          <h4>Enquiries</h4>
          <ul>
            <li><a href="mailto:hello@reelmarket.demo">hello@reelmarket.demo</a></li>
            <li><a href="tel:+2340000000000">+234 000 000 0000</a></li>
          </ul>
          <h4 style={{ marginTop: 18 }}>Follow us</h4>
          <div className="footer-socials">
            {SOCIALS.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} title={s.label}>
                {s.abbr}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="sprocket-divider container" style={{ margin: '0 auto' }}>
        <div className="holes"><span /><span /><span /></div>
      </div>

      <div className="container footer-bottom">
        <p>© {new Date().getFullYear()} ReelMarket. A student portfolio project — not a real store.</p>
        <p className="footer-payments">Payments secured by Paystack</p>
      </div>
    </footer>
  );
}
