import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { getOrdersForBuyer } from '../services/ordersService';
import { getListingsBySeller, createListing } from '../services/listingsService';
import { getSellerTrustScore } from '../services/trustScoreService';
import { searchAll } from '../services/catalogService';
import { formatNaira, formatDate } from '../utils/format';

const ORDER_STATUS_VARIANT = {
  pending_confirmation: 'warning',
  confirmed: 'success',
  rejected: 'danger',
};

function NewListingModal({ onClose, onCreated }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('new');
  const [availability, setAvailability] = useState('sale');
  const [stock, setStock] = useState(1);
  const [searching, setSearching] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    const res = await searchAll(query);
    setResults(res);
    setSearching(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selected || !price) return;
    await createListing({
      titleId: selected.id,
      titleSnapshot: { title: selected.title, coverImage: selected.coverImage, category: selected.category },
      sellerId: user.id,
      sellerName: user.name,
      addedByRole: 'seller',
      price: Number(price),
      condition,
      availability,
      stock: Number(stock),
    });
    onCreated();
    onClose();
  }

  return (
    <Modal title="Submit a listing" onClose={onClose}>
      {!selected ? (
        <>
          <form onSubmit={handleSearch} className="field" style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
            <input placeholder="Search a title to list…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Button type="submit" variant="secondary" disabled={searching}>{searching ? '…' : 'Search'}</Button>
          </form>
          <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 8, textAlign: 'left' }}
              >
                {r.coverImage && <img src={r.coverImage} alt="" style={{ width: 36, height: 52, objectFit: 'cover', borderRadius: 4 }} />}
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{r.title}</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{r.category}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <p style={{ marginBottom: 12, fontWeight: 700 }}>{selected.title}</p>
          <div className="field">
            <label>Price (₦)</label>
            <input type="number" min={0} required value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="field">
            <label>Condition</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value)}>
              <option value="new">New</option>
              <option value="used">Used</option>
              <option value="digital">Digital</option>
            </select>
          </div>
          <div className="field">
            <label>Availability</label>
            <select value={availability} onChange={(e) => setAvailability(e.target.value)}>
              <option value="sale">For sale</option>
              <option value="trade">For trade</option>
              <option value="both">Sale or trade</option>
            </select>
          </div>
          <div className="field">
            <label>Stock</label>
            <input type="number" min={1} required value={stock} onChange={(e) => setStock(e.target.value)} />
          </div>
          <Button type="submit" style={{ width: '100%' }}>Submit for approval</Button>
        </form>
      )}
    </Modal>
  );
}

export default function Account() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [listings, setListings] = useState([]);
  const [trust, setTrust] = useState(null);
  const [showModal, setShowModal] = useState(false);

  async function refresh() {
    setOrders(await getOrdersForBuyer(user.id));
    if (user.role === 'seller') {
      setListings(await getListingsBySeller(user.id));
      setTrust(await getSellerTrustScore(user.id));
    }
  }

  useEffect(() => { refresh(); }, [user]);

  return (
    <div className="container section">
      <span className="eyebrow">Signed in as {user.email}</span>
      <h1 className="section-title" style={{ marginBottom: 8 }}>{user.name}</h1>
      <Badge variant="neutral" className="visually-hidden-not">{user.role}</Badge>

      {user.role === 'seller' && trust && (
        <div className="card" style={{ margin: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="eyebrow">Seller trust score</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem' }}>
              {trust.score === null ? 'New Seller' : `${trust.score}% · ${trust.label}`}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{trust.totalOrders} total order(s)</p>
          </div>
          <Button onClick={() => setShowModal(true)}>+ Submit new listing</Button>
        </div>
      )}

      {user.role === 'seller' && (
        <>
          <h2 className="section-title" style={{ fontSize: '1.3rem', margin: '24px 0 12px' }}>My listings</h2>
          {listings.length === 0 ? (
            <EmptyState title="No listings yet" message="Submit your first item for admin approval." />
          ) : (
            <div className="table-scroll">
              <table className="data-table">
              <thead>
                <tr><th>Title</th><th>Price</th><th>Status</th><th>Stock</th></tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id}>
                    <td>{l.titleSnapshot?.title}</td>
                    <td>{formatNaira(l.price)}</td>
                    <td><Badge variant={l.status === 'approved' ? 'success' : l.status === 'rejected' ? 'danger' : 'warning'}>{l.status}</Badge></td>
                    <td>{l.stock}</td>
                  </tr>
                ))}
              </tbody>
                          </table>
            </div>
          )}
        </>
      )}

      <h2 className="section-title" style={{ fontSize: '1.3rem', margin: '24px 0 12px' }}>My orders</h2>
      {orders.length === 0 ? (
        <EmptyState title="No orders yet" message="Anything you buy will show up here." />
      ) : (
        <div className="table-scroll">
          <table className="data-table">
          <thead>
            <tr><th>Title</th><th>Amount</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.titleSnapshot?.title}</td>
                <td>{formatNaira(o.totalAmount)}</td>
                <td><Badge variant={ORDER_STATUS_VARIANT[o.status] || 'neutral'}>{o.status.replace('_', ' ')}</Badge></td>
                <td>{formatDate(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
                  </table>
        </div>
      )}

      {showModal && (
        <NewListingModal onClose={() => setShowModal(false)} onCreated={refresh} />
      )}
    </div>
  );
}
