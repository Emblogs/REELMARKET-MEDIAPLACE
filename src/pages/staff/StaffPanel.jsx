import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { searchAll } from '../../services/catalogService';
import { createListing, getAllListings, removeListing } from '../../services/listingsService';
import { formatNaira } from '../../utils/format';

export default function StaffPanel() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState(1);
  const [items, setItems] = useState([]);

  async function refresh() {
    const all = await getAllListings();
    setItems(all.filter((l) => l.status === 'approved'));
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
    setSelected(null);
    setPrice('');
    setStock(1);
    setResults([]);
    setQuery('');
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
                  <Button size="sm" variant="danger" onClick={async () => { await removeListing(l.id); refresh(); }}>Remove</Button>
                </td>
              </tr>
            ))}
          </tbody>
                  </table>
        </div>
      )}
    </div>
  );
}
