import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getCartForUser } from '../../services/cartService';
import { getOrdersForBuyer } from '../../services/ordersService';
import { onDataChanged } from '../../utils/events';
import logoMark from '../../assets/logo-mark.png';
import './layout.css';

const CATEGORIES = [
  { key: 'movie', label: 'Movies' },
  { key: 'anime', label: 'Anime' },
  { key: 'manga', label: 'Manga' },
  { key: 'comic', label: 'Comics' },
];

export default function Navbar() {
  const { user, isAuthenticated, role, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [openOrdersCount, setOpenOrdersCount] = useState(0);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const refreshCounts = useCallback(async () => {
    if (!user) {
      setCartCount(0);
      setOpenOrdersCount(0);
      return;
    }
    const cart = await getCartForUser(user.id);
    setCartCount(cart.reduce((sum, i) => sum + i.quantity, 0));
    const orders = await getOrdersForBuyer(user.id);
    setOpenOrdersCount(orders.filter((o) => o.status === 'pending_confirmation').length);
  }, [user]);

  useEffect(() => { refreshCounts(); }, [refreshCounts, location.pathname]);
  useEffect(() => onDataChanged(refreshCounts), [refreshCounts]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    setMenuOpen(false);
  }

  function handleNavClick(path) {
    setMenuOpen(false);
    setUserMenuOpen(false);
    navigate(path);
  }

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-logo">
          <img src={logoMark} alt="ReelMarket" className="navbar-logo-mark" />
          <span className="navbar-logo-text">REEL<span>MARKET</span></span>
        </Link>

        <nav className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <form className="navbar-search-mobile-wrap" onSubmit={handleSearch}>
            <input
              type="search"
              placeholder="Search movies, anime, manga, comics…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>
          {CATEGORIES.map((c) => (
            <Link key={c.key} to={`/browse/${c.key}`} onClick={() => setMenuOpen(false)}>
              {c.label}
            </Link>
          ))}
        </nav>

        <form className="navbar-search" onSubmit={handleSearch}>
          <svg className="navbar-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="Search movies, anime, manga, comics…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        <div className="navbar-actions">
          <Link to="/cart" className="navbar-icon-link" aria-label="Cart" style={{ position: 'relative' }}>
            🛒
            {cartCount > 0 && <span className="navbar-badge">{cartCount}</span>}
          </Link>

          {isAuthenticated ? (
            <div className="navbar-user-menu" ref={userMenuRef}>
              <button
                className="navbar-user-btn"
                onClick={() => setUserMenuOpen((o) => !o)}
                aria-expanded={userMenuOpen}
                style={{ position: 'relative' }}
              >
                {user.name?.split(' ')[0] || 'Account'} ▾
                {openOrdersCount > 0 && <span className="navbar-badge navbar-badge-inline">{openOrdersCount}</span>}
              </button>
              <div className={`navbar-dropdown ${userMenuOpen ? 'open' : ''}`}>
                <button onClick={() => handleNavClick('/account')}>
                  My account
                  {openOrdersCount > 0 && (
                    <span className="navbar-dropdown-hint"> · {openOrdersCount} order(s) pending</span>
                  )}
                </button>
                {role === 'staff' && <button onClick={() => handleNavClick('/staff')}>Staff panel</button>}
                {role === 'admin' && <button onClick={() => handleNavClick('/admin')}>Admin panel</button>}
                <button onClick={() => { logout(); setUserMenuOpen(false); }}>Sign out</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to="/login">
                <button className="btn btn-ghost btn-sm">Sign in</button>
              </Link>
              <Link to="/signup">
                <button className="btn btn-primary btn-sm">Sign up</button>
              </Link>
            </div>
          )}

          <button
            className="navbar-burger"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
        </div>
      </div>
    </header>
  );
}
