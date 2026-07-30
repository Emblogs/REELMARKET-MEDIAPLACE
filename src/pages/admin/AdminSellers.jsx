import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { getAllApplications, approveApplication, rejectApplication } from '../../services/sellerService';
import { formatDate } from '../../utils/format';

export default function AdminSellers() {
  const [apps, setApps] = useState([]);

  async function refresh() { setApps(await getAllApplications()); }
  useEffect(() => { refresh(); }, []);

  const pending = apps.filter((a) => a.status === 'pending');
  const resolved = apps.filter((a) => a.status !== 'pending');

  return (
    <div>
      <div className="admin-panel-header">
        <h2 className="section-title" style={{ fontSize: '1.5rem' }}>Seller approvals</h2>
      </div>

      <h3 style={{ marginBottom: 12 }}>Pending ({pending.length})</h3>
      {pending.length === 0 ? (
        <EmptyState title="No pending applications" />
      ) : (
        <div className="table-scroll" style={{ marginBottom: 28 }}>
          <table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Message</th><th>Applied</th><th>Actions</th></tr></thead>
          <tbody>
            {pending.map((a) => (
              <tr key={a.id}>
                <td>{a.userName}</td>
                <td>{a.userEmail}</td>
                <td style={{ maxWidth: 260 }}>{a.message || '—'}</td>
                <td>{formatDate(a.createdAt)}</td>
                <td className="table-actions">
                  <Button size="sm" onClick={async () => { await approveApplication(a.id, a.userId); refresh(); }}>Approve</Button>
                  <Button size="sm" variant="danger" onClick={async () => { await rejectApplication(a.id); refresh(); }}>Reject</Button>
                </td>
              </tr>
            ))}
          </tbody>
                  </table>
        </div>
      )}

      <h3 style={{ marginBottom: 12 }}>History</h3>
      {resolved.length === 0 ? (
        <EmptyState title="No decisions made yet" />
      ) : (
        <div className="table-scroll">
          <table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Status</th></tr></thead>
          <tbody>
            {resolved.map((a) => (
              <tr key={a.id}>
                <td>{a.userName}</td>
                <td>{a.userEmail}</td>
                <td><Badge variant={a.status === 'approved' ? 'success' : 'danger'}>{a.status}</Badge></td>
              </tr>
            ))}
          </tbody>
                  </table>
        </div>
      )}
    </div>
  );
}
