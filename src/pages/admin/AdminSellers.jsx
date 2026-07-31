import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { getAllApplications, approveApplication, rejectApplication } from '../../services/sellerService';
import { logActivity } from '../../services/activityLogService';
import { formatDate } from '../../utils/format';

export default function AdminSellers() {
  const { user } = useAuth();
  const [apps, setApps] = useState([]);

  async function refresh() { setApps(await getAllApplications()); }
  useEffect(() => { refresh(); }, []);

  async function handleApprove(app) {
    await approveApplication(app.id, app.userId);
    await logActivity({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'approve_seller',
      detail: `Approved seller application from ${app.userName} (${app.userEmail})`,
    });
    refresh();
  }

  async function handleReject(app) {
    await rejectApplication(app.id);
    await logActivity({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'reject_seller',
      detail: `Rejected seller application from ${app.userName} (${app.userEmail})`,
    });
    refresh();
  }

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
                  <Button size="sm" onClick={() => handleApprove(a)}>Approve</Button>
                  <Button size="sm" variant="danger" onClick={() => handleReject(a)}>Reject</Button>
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
