import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { getAllOrders, confirmOrder, rejectOrder } from '../../services/ordersService';
import { formatNaira, formatDate } from '../../utils/format';

const STATUS_VARIANT = { pending_confirmation: 'warning', confirmed: 'success', rejected: 'danger' };

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);

  async function refresh() { setOrders(await getAllOrders()); }
  useEffect(() => { refresh(); }, []);

  const pending = orders.filter((o) => o.status === 'pending_confirmation');
  const resolved = orders.filter((o) => o.status !== 'pending_confirmation');

  return (
    <div>
      <div className="admin-panel-header">
        <h2 className="section-title" style={{ fontSize: '1.5rem' }}>Orders</h2>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
        Buyers see "pending confirmation" immediately after paying via Paystack. Confirm here once you've
        verified the transaction reference, and the buyer's order will show as successful.
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
                  <Button size="sm" onClick={async () => { await confirmOrder(o.id); refresh(); }}>Confirm payment</Button>
                  <Button size="sm" variant="danger" onClick={async () => { await rejectOrder(o.id); refresh(); }}>Reject</Button>
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
