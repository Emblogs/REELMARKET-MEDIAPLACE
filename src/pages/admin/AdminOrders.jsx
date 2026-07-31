import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { getAllOrders, confirmOrder, rejectOrder } from '../../services/ordersService';
import { logActivity } from '../../services/activityLogService';
import { formatNaira, formatDate } from '../../utils/format';

const STATUS_VARIANT = { pending_confirmation: 'warning', confirmed: 'success', rejected: 'danger' };

export default function AdminOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);

  async function refresh() { setOrders(await getAllOrders()); }
  useEffect(() => { refresh(); }, []);

  async function handleConfirm(order) {
    await confirmOrder(order.id);
    await logActivity({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'confirm_order',
      detail: `Confirmed order for "${order.titleSnapshot?.title}" (${formatNaira(order.totalAmount)}, buyer ${order.buyerName})`,
    });
    refresh();
  }

  async function handleReject(order) {
    await rejectOrder(order.id);
    await logActivity({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'reject_order',
      detail: `Rejected order for "${order.titleSnapshot?.title}" (${formatNaira(order.totalAmount)}, buyer ${order.buyerName})`,
    });
    refresh();
  }

  const pending = orders.filter((o) => o.status === 'pending_confirmation');
  const resolved = orders.filter((o) => o.status !== 'pending_confirmation');

  return (
    <div>
      <div className="admin-panel-header">
        <h2 className="section-title" style={{ fontSize: '1.5rem' }}>Orders</h2>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
        Orders are auto-confirmed the moment Paystack checkout succeeds — buyers get an instant
        confirmation instead of waiting on approval. Anything below is either a legacy order from
        before this changed, or one you've manually rejected (e.g. to simulate a refund/dispute).
      </p>

      <h3 style={{ marginBottom: 12 }}>Awaiting confirmation ({pending.length})</h3>
      {pending.length === 0 ? (
        <EmptyState title="Nothing waiting" />
      ) : (
        <div className="table-scroll" style={{ marginBottom: 28 }}>
          <table className="data-table">
          <thead><tr><th>Title</th><th>Buyer</th><th>Amount</th><th>Reference</th><th>Actions</th></tr></thead>
          <tbody>
            {pending.map((o) => (
              <tr key={o.id}>
                <td>{o.titleSnapshot?.title}</td>
                <td>{o.buyerName}</td>
                <td>{formatNaira(o.totalAmount)}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{o.paystackReference}</td>
                <td className="table-actions">
                  <Button size="sm" onClick={() => handleConfirm(o)}>Confirm payment</Button>
                  <Button size="sm" variant="danger" onClick={() => handleReject(o)}>Reject</Button>
                </td>
              </tr>
            ))}
          </tbody>
                  </table>
        </div>
      )}

      <h3 style={{ marginBottom: 12 }}>History</h3>
      {resolved.length === 0 ? <EmptyState title="No resolved orders yet" /> : (
        <div className="table-scroll">
          <table className="data-table">
          <thead><tr><th>Title</th><th>Buyer</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {resolved.map((o) => (
              <tr key={o.id}>
                <td>{o.titleSnapshot?.title}</td>
                <td>{o.buyerName}</td>
                <td>{formatNaira(o.totalAmount)}</td>
                <td><Badge variant={STATUS_VARIANT[o.status]}>{o.status}</Badge></td>
                <td>{formatDate(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
                  </table>
        </div>
      )}
    </div>
  );
}
