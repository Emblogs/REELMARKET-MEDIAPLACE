import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import {
  getAllBanners, createBanner, updateBanner, deleteBanner,
  getAllPromos, createPromo, updatePromo, deletePromo,
} from '../../services/bannersService';

const emptyBannerForm = { title: '', subtitle: '', imageUrl: '', linkTo: '', order: 1 };
const emptyPromoForm = { label: '', imageUrl: '', linkTo: '' };

export default function AdminBanners() {
  const [banners, setBanners] = useState([]);
  const [promos, setPromos] = useState([]);
  const [bannerForm, setBannerForm] = useState(emptyBannerForm);
  const [promoForm, setPromoForm] = useState(emptyPromoForm);

  async function refresh() {
    setBanners(await getAllBanners());
    setPromos(await getAllPromos());
  }
  useEffect(() => { refresh(); }, []);

  async function handleAddBanner(e) {
    e.preventDefault();
    await createBanner({ ...bannerForm, order: Number(bannerForm.order) || 1 });
    setBannerForm(emptyBannerForm);
    refresh();
  }

  async function handleAddPromo(e) {
    e.preventDefault();
    await createPromo(promoForm);
    setPromoForm(emptyPromoForm);
    refresh();
  }

  return (
    <div>
      <div className="admin-panel-header">
        <h2 className="section-title" style={{ fontSize: '1.5rem' }}>Banners & Ads</h2>
      </div>

      <div className="card" style={{ marginBottom: 28 }}>
        <h3 style={{ marginBottom: 12 }}>Add a homepage banner</h3>
        <form onSubmit={handleAddBanner} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div className="field">
            <label>Title</label>
            <input required value={bannerForm.title} onChange={(e) => setBannerForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="field">
            <label>Order (lower shows first)</label>
            <input type="number" value={bannerForm.order} onChange={(e) => setBannerForm((f) => ({ ...f, order: e.target.value }))} />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Subtitle</label>
            <input value={bannerForm.subtitle} onChange={(e) => setBannerForm((f) => ({ ...f, subtitle: e.target.value }))} />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Image URL</label>
            <input required value={bannerForm.imageUrl} onChange={(e) => setBannerForm((f) => ({ ...f, imageUrl: e.target.value }))} />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Link to (e.g. /browse/movie)</label>
            <input value={bannerForm.linkTo} onChange={(e) => setBannerForm((f) => ({ ...f, linkTo: e.target.value }))} />
          </div>
          <Button type="submit" style={{ gridColumn: '1 / -1' }}>Add banner</Button>
        </form>
      </div>

      <h3 style={{ marginBottom: 12 }}>Current banners ({banners.length})</h3>
      {banners.length === 0 ? <EmptyState title="No banners yet" /> : (
        <div className="table-scroll" style={{ marginBottom: 28 }}>
          <table className="data-table">
          <thead><tr><th>Title</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {banners.map((b) => (
              <tr key={b.id}>
                <td>{b.title}</td>
                <td>{b.order}</td>
                <td><Badge variant={b.active ? 'success' : 'neutral'}>{b.active ? 'Active' : 'Hidden'}</Badge></td>
                <td className="table-actions">
                  <Button size="sm" variant="ghost" onClick={async () => { await updateBanner(b.id, { active: !b.active }); refresh(); }}>
                    {b.active ? 'Hide' : 'Show'}
                  </Button>
                  <Button size="sm" variant="danger" onClick={async () => { await deleteBanner(b.id); refresh(); }}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
                  </table>
        </div>
      )}

      <div className="card" style={{ marginBottom: 28 }}>
        <h3 style={{ marginBottom: 12 }}>Add a promo/ad slot</h3>
        <form onSubmit={handleAddPromo} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div className="field">
            <label>Label</label>
            <input required value={promoForm.label} onChange={(e) => setPromoForm((f) => ({ ...f, label: e.target.value }))} />
          </div>
          <div className="field">
            <label>Link to</label>
            <input value={promoForm.linkTo} onChange={(e) => setPromoForm((f) => ({ ...f, linkTo: e.target.value }))} />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Image URL</label>
            <input required value={promoForm.imageUrl} onChange={(e) => setPromoForm((f) => ({ ...f, imageUrl: e.target.value }))} />
          </div>
          <Button type="submit" style={{ gridColumn: '1 / -1' }}>Add promo</Button>
        </form>
      </div>

      <h3 style={{ marginBottom: 12 }}>Current promos ({promos.length})</h3>
      {promos.length === 0 ? <EmptyState title="No promos yet" /> : (
        <div className="table-scroll">
          <table className="data-table">
          <thead><tr><th>Label</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {promos.map((p) => (
              <tr key={p.id}>
                <td>{p.label}</td>
                <td><Badge variant={p.active ? 'success' : 'neutral'}>{p.active ? 'Active' : 'Hidden'}</Badge></td>
                <td className="table-actions">
                  <Button size="sm" variant="ghost" onClick={async () => { await updatePromo(p.id, { active: !p.active }); refresh(); }}>
                    {p.active ? 'Hide' : 'Show'}
                  </Button>
                  <Button size="sm" variant="danger" onClick={async () => { await deletePromo(p.id); refresh(); }}>Delete</Button>
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
