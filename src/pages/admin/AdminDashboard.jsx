import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../../components/ui/Badge';
import { getAllListings } from '../../services/listingsService';
import { getAllOrders } from '../../services/ordersService';
import { getPendingApplications } from '../../services/sellerService';
import { listUsers } from '../../services/authService';
import { formatNaira } from '../../utils/format';

function StatCard({ label, value, tone = 'default', to }) {
  const content = (
    <div className="card admin-stat-card">
      <p className="admin-stat-label">{label}</p>
      <p className={`admin-stat-value ${tone}`}>{value}</p>
    </div>
  );
  return to ? <Link to={to} style={{ display: 'block' }}>{content}</Link> : content;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadStats() {
      const [listings, orders, pendingApps, users] = await Promise.all([
        getAllListings(),
        getAllOrders(),
        getPendingApplications(),
        listUsers(),
      ]);
      if (!active) return;

      const approved = listings.filter((l) => l.status === 'approved');
      const outOfStock = approved.filter((l) => l.stock === 0);
      const lowStock = approved.filter((l) => l.stock > 0 && l.stock <= 3);
      const pendingOrders = orders.filter((o) => o.status === 'pending_confirmation');
      const confirmedOrders = orders.filter((o) => o.status === 'confirmed');
      const revenue = confirmedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const pendingListings = listings.filter((l) => l.status === 'pending');

      setStats({
        totalItems: approved.length,
        outOfStock: outOfStock.length,
        lowStock: lowStock.length,
        pendingOrders: pendingOrders.length,
        revenue,
        pendingApps: pendingApps.length,
        pendingListings: pendingListings.length,
        totalUsers: users.filter((u) => u.role !== 'admin').length,
        lowStockItems: lowStock.slice(0, 5),
        outOfStockItems: outOfStock.slice(0, 5),
      });
    }
    loadStats();
    return () => { active = false; };
  }, []);

  if (!stats) return null;

  return (
    <div>
      <div className="admin-panel-header">
        <h2 className="section-title" style={{ fontSize: '1.5rem' }}>Dashboard</h2>
      </div>

      <div className="admin-stat-grid">
        <StatCard label="Live items" value={stats.totalItems} to="/admin/items" />
        <StatCard label="Out of stock" value={stats.outOfStock} tone={stats.outOfStock > 0 ? 'danger' : ''} to="/admin/items" />
        <StatCard label="Low stock (≤3)" value={stats.lowStock} tone={stats.lowStock > 0 ? 'warning' : ''} to="/admin/items" />
        <StatCard label="Orders awaiting confirmation" value={stats.pendingOrders} tone={stats.pendingOrders > 0 ? 'warning' : ''} to="/admin/orders" />
        <StatCard label="Confirmed revenue" value={formatNaira(stats.revenue)} to="/admin/orders" />
        <StatCard label="Pending seller applications" value={stats.pendingApps} tone={stats.pendingApps > 0 ? 'warning' : ''} to="/admin/sellers" />
        <StatCard label="Pending listing approvals" value={stats.pendingListings} tone={stats.pendingListings > 0 ? 'warning' : ''} to="/admin/items" />
        <StatCard label="Total users" value={stats.totalUsers} to="/admin/users" />
      </div>

      {(stats.outOfStockItems.length > 0 || stats.lowStockItems.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 28 }}>
          <div className="card">
            <h3 style={{ marginBottom: 12, fontSize: '0.95rem' }}>Out of stock</h3>
            {stats.outOfStockItems.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nothing out of stock right now.</p>
            ) : (
              stats.outOfStockItems.map((l) => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.85rem' }}>{l.titleSnapshot?.title}</span>
                  <Badge variant="danger">0 left</Badge>
                </div>
              ))
            )}
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 12, fontSize: '0.95rem' }}>Running low</h3>
            {stats.lowStockItems.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nothing running low right now.</p>
            ) : (
              stats.lowStockItems.map((l) => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.85rem' }}>{l.titleSnapshot?.title}</span>
                  <Badge variant="warning">{l.stock} left</Badge>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
