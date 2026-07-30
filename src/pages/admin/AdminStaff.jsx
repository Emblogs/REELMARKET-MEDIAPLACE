import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { supabase } from '../../services/supabaseClient';
import { listUsers, setUserRole } from '../../services/authService';

export default function AdminStaff() {
  const [staff, setStaff] = useState([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    const users = await listUsers();
    setStaff(users.filter((u) => u.role === 'staff'));
  }
  useEffect(() => { refresh(); }, []);

  async function handlePromote(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const { data, error: lookupErr } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .ilike('email', email.trim())
        .maybeSingle();
      if (lookupErr) throw lookupErr;
      if (!data) {
        setError(
          'No account found with that email. They need to sign up first (Google or email code) before you can promote them to staff.'
        );
        return;
      }
      if (data.role === 'admin') {
        setError('That account is already an admin.');
        return;
      }
      await setUserRole(data.id, 'staff');
      setSuccess(`${data.name || data.email} is now staff.`);
      setEmail('');
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveStaff(userId) {
    await setUserRole(userId, 'buyer');
    refresh();
  }

  return (
    <div>
      <div className="admin-panel-header">
        <h2 className="section-title" style={{ fontSize: '1.5rem' }}>Staff</h2>
      </div>

      <div className="card" style={{ marginBottom: 28, maxWidth: 480 }}>
        <h3 style={{ marginBottom: 12 }}>Promote someone to staff</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 14 }}>
          Staff accounts aren't created here directly — the person needs to sign up
          themselves first (Google or email code, same as any buyer) at{' '}
          <strong>/staff-login</strong> or the regular sign-in page. Once they have an
          account, enter their email below to grant staff access.
        </p>
        <form onSubmit={handlePromote}>
          <div className="field">
            <label>Their email address</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p className="field-error" style={{ marginBottom: 12 }}>{error}</p>}
          {success && <p style={{ color: 'var(--success)', fontSize: '0.85rem', marginBottom: 12 }}>{success}</p>}
          <Button type="submit" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? 'Checking…' : 'Grant staff access'}
          </Button>
        </form>
      </div>

      <h3 style={{ marginBottom: 12 }}>Current staff ({staff.length})</h3>
      {staff.length === 0 ? (
        <EmptyState title="No staff yet" />
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th></th></tr></thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>
                    <Button size="sm" variant="danger" onClick={() => handleRemoveStaff(s.id)}>
                      Remove staff access
                    </Button>
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
