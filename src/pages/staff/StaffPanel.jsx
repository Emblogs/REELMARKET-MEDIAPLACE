import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { searchAll } from '../../services/catalogService';
import { createListing, getAllListings, removeListing } from '../../services/listingsService';
import { logActivity, getMyActivity } from '../../services/activityLogService';
import { formatNaira, formatDate } from '../../utils/format';

export default function StaffPanel() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState(1);
  const [items, setItems] = useState([]);
  const [myActivity, setMyActivity] = useState([]);

  async function refresh() {
    const all = await getAllListings();
    setItems(all.filter((l) => l.status === 'approved'));
    setMyActivity(await getMyActivity(user.id));
  }
  useEffect(() => { refresh(); }, []);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setResults(await searchAll(query));
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!selected || !price) return;
    await createListing({
      titleId: selected.id,
      titleSnapshot: { title: selected.title, coverImage: selected.coverImage, category: selected.category },
      sellerId: null,
      sellerName: `Store (added by staff: ${user.name})`,
      addedByRole: 'staff',
      price: Number(price),
      stock: Number(stock),
      availability: 'sale',
    });
    await logActivity({
      actorId: user.id,
      actorName: user.name,
      actorRole: 'staff',
      action: 'add_item',
      detail: `Added "${selected.title}" — ₦${price} × ${stock} in stock`,
    });
    setSelected(null);
    setPrice('');
    setStock(1);
    setResults([]);
    setQuery('');
    refresh();
  }

  async function handleRemove(item) {
    await removeListing(item.id);
    await logActivity({
      actorId: user.id,
      actorName: user.name,
      actorRole: 'staff',
      action: 'remove_item',
      detail: `Removed "${item.titleSnapshot?.title}"`,
    });
    refresh();
  }

  return (
    <div className="container section">
      <span className="eyebrow">Staff panel</span>
      <h1 className="section-title" style={{ marginBottom: 8 }}>Manage items</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>
        You can add and remove store items here. Staff accounts do not have access to
        user management, seller approvals, or admin settings.
      </p>

      <div className="card" style={{ marginBottom: 28 }}>
        <h3 style={{ marginBottom: 12 }}>Add an item</h3>
        {!selected ? (
          <>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <input
                placeholder="Search a title from the catalog…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ flex: 1, minWidth: 140, background: 'var(--bg-surface-2)', border: '1px solid var(--border-strong)', borderRadius: 6, padding: 10, color: 'var(--text-primary)' }}
              />
              <Button type="submit" variant="secondary">Search</Button>
            </form>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 8, textAlign: 'left' }}
                >
                  {r.coverImage && <img src={r.coverImage} alt="" style={{ width: 32, height: 46, objectFit: 'cover', borderRadius: 4 }} />}
                  <span style={{ fontSize: '0.85rem' }}>{r.title} <span style={{ color: 'var(--text-muted)' }}>· {r.category}</span></span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <p style={{ fontWeight: 700 }}>{selected.title}</p>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Price (₦)</label>
              <input type="number" required value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Stock</label>
              <input type="number" min={1} required value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
            <Button type="submit">Add item</Button>
            <Button type="button" variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
          </form>
        )}
      </div>

      <h3 style={{ marginBottom: 12 }}>Live items ({items.length})</h3>
      {items.length === 0 ? <EmptyState title="No items yet" /> : (
        <div className="table-scroll">
          <table className="data-table">
          <thead><tr><th>Title</th><th>Added by</th><th>Price</th><th>Stock</th><th></th></tr></thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id}>
                <td>{l.titleSnapshot?.title}</td>
                <td>{l.sellerName}</td>
                <td>{formatNaira(l.price)}</td>
                <td>{l.stock}</td>
                <td>
                  <Button size="sm" variant="danger" onClick={() => handleRemove(l)}>Remove</Button>
                </td>
              </tr>
            ))}
          </tbody>
                  </table>
        </div>
      )}

      <h3 style={{ marginTop: 32, marginBottom: 12 }}>My activity</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 12 }}>
        A private record of actions you've taken. Only you and admins can see this — other staff can't.
      </p>
      {myActivity.length === 0 ? (
        <EmptyState title="No activity yet" />
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Action</th><th>Detail</th><th>When</th></tr></thead>
            <tbody>
              {myActivity.map((a) => (
                <tr key={a.id}>
                  <td style={{ textTransform: 'capitalize' }}>{a.action.replace(/_/g, ' ')}</td>
                  <td>{a.detail}</td>
                  <td>{formatDate(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
