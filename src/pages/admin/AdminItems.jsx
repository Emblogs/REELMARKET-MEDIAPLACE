import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { searchAll } from '../../services/catalogService';
import {
  createListing,
  getAllListings,
  getPendingListings,
  approveListing,
  rejectListing,
  removeListing,
} from '../../services/listingsService';
import { logActivity } from '../../services/activityLogService';
import { formatNaira } from '../../utils/format';

export default function AdminItems() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState(1);
  const [allListings, setAllListings] = useState([]);
  const [pending, setPending] = useState([]);

  async function refresh() {
    const all = await getAllListings();
    setAllListings(all.filter((l) => l.status === 'approved'));
    setPending(await getPendingListings());
  }

  useEffect(() => { refresh(); }, []);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setResults(await searchAll(query));
  }

  async function handleAddCurated(e) {
    e.preventDefault();
    if (!selected || !price) return;
    await createListing({
      titleId: selected.id,
      titleSnapshot: { title: selected.title, coverImage: selected.coverImage, category: selected.category },
      sellerId: null,
      sellerName: `Store (added by ${user.role})`,
      addedByRole: user.role, // 'admin' or 'staff'
      price: Number(price),
      stock: Number(stock),
      availability: 'sale',
    });
    await logActivity({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
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

  async function handleApprove(listing) {
    await approveListing(listing.id);
    await logActivity({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'approve_listing',
      detail: `Approved "${listing.titleSnapshot?.title}" from seller ${listing.sellerName}`,
    });
    refresh();
  }

  async function handleReject(listing) {
    await rejectListing(listing.id);
    await logActivity({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'reject_listing',
      detail: `Rejected "${listing.titleSnapshot?.title}" from seller ${listing.sellerName}`,
    });
    refresh();
  }

  async function handleRemove(listing) {
    await removeListing(listing.id);
    await logActivity({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'remove_item',
      detail: `Removed "${listing.titleSnapshot?.title}"`,
    });
    refresh();
  }

  return (
    <div>
      <div className="admin-panel-header">
        <h2 className="section-title" style={{ fontSize: '1.5rem' }}>Items</h2>
      </div>

      <div className="card" style={{ marginBottom: 28 }}>
        <h3 style={{ marginBottom: 12 }}>Add a store item</h3>
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
          <form onSubmit={handleAddCurated} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
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

      <h3 style={{ marginBottom: 12 }}>Pending seller listings ({pending.length})</h3>
      {pending.length === 0 ? (
        <EmptyState title="Nothing pending" message="Seller-submitted listings will show up here for approval." />
      ) : (
        <div className="table-scroll" style={{ marginBottom: 28 }}>
          <table className="data-table">
          <thead><tr><th>Title</th><th>Seller</th><th>Price</th><th>Actions</th></tr></thead>
          <tbody>
            {pending.map((l) => (
              <tr key={l.id}>
                <td>{l.titleSnapshot?.title}</td>
                <td>{l.sellerName}</td>
                <td>{formatNaira(l.price)}</td>
                <td className="table-actions">
                  <Button size="sm" onClick={() => handleApprove(l)}>Approve</Button>
                  <Button size="sm" variant="danger" onClick={() => handleReject(l)}>Reject</Button>
                </td>
              </tr>
            ))}
          </tbody>
                  </table>
        </div>
      )}

      <h3 style={{ marginBottom: 12 }}>Live items ({allListings.length})</h3>
      {allListings.length === 0 ? (
        <EmptyState title="No live items yet" />
      ) : (
        <div className="table-scroll">
          <table className="data-table">
          <thead><tr><th>Title</th><th>Seller</th><th>Price</th><th>Stock</th><th></th></tr></thead>
          <tbody>
            {allListings.map((l) => (
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
    </div>
  );
}
