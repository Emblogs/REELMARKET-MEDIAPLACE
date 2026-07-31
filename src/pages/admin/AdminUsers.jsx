import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { listUsers, setUserStatus } from '../../services/authService';
import { logActivity } from '../../services/activityLogService';

const STATUS_VARIANT = { active: 'success', suspended: 'warning', banned: 'danger' };

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);

  async function refresh() {
    const all = await listUsers();
    setUsers(all.filter((u) => u.role !== 'admin'));
  }
  useEffect(() => { refresh(); }, []);

  async function handleStatus(targetUser, status) {
    await setUserStatus(targetUser.id, status);
    await logActivity({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'set_user_status',
      detail: `Set ${targetUser.name || targetUser.email} to "${status}"`,
    });
    refresh();
  }

  return (
    <div>
      <div className="admin-panel-header">
        <h2 className="section-title" style={{ fontSize: '1.5rem' }}>Users</h2>
      </div>

      {users.length === 0 ? (
        <EmptyState title="No users yet" />
      ) : (
        <div className="table-scroll">
          <table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                <td><Badge variant={STATUS_VARIANT[u.status] || 'neutral'}>{u.status}</Badge></td>
                <td className="table-actions">
                  {u.status !== 'active' && (
                    <Button size="sm" onClick={() => handleStatus(u, 'active')}>Reactivate</Button>
                  )}
                  {u.status !== 'suspended' && (
                    <Button size="sm" variant="ghost" onClick={() => handleStatus(u, 'suspended')}>Suspend</Button>
                  )}
                  {u.status !== 'banned' && (
                    <Button size="sm" variant="danger" onClick={() => handleStatus(u, 'banned')}>Ban</Button>
                  )}
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
