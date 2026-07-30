import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoMark from '../../assets/logo-mark.png';
import './admin.css';

const TABS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/items', label: 'Items' },
  { to: '/admin/sellers', label: 'Seller approvals' },
  { to: '/admin/staff', label: 'Staff' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/banners', label: 'Banners & Ads' },
  { to: '/admin/orders', label: 'Orders' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <Link to="/admin" className="admin-topbar-logo">
          <img src={logoMark} alt="" style={{ height: 28, marginRight: 8, verticalAlign: 'middle' }} />
          REEL<span>MARKET</span> <span className="admin-topbar-tag">ADMIN</span>
        </Link>
        <div className="admin-topbar-actions">
          <span className="admin-topbar-user">{user?.name}</span>
          <Link to="/" className="admin-topbar-link">View live site</Link>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
        </div>
      </header>

      <div className="container section admin-layout">
        <aside className="admin-sidebar">
          <span className="eyebrow">Control room</span>
          <h1 className="section-title" style={{ fontSize: '1.6rem', marginBottom: 16 }}>Admin</h1>
          <nav>
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
