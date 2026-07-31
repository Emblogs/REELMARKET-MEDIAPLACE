import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { supabase } from '../../services/supabaseClient';
import { listUsers, setUserRole } from '../../services/authService';
import { logActivity, getAllActivity } from '../../services/activityLogService';
import { formatDate } from '../../utils/format';

function generatePassword() {
  // Readable-ish temp password: two words + 3 digits, easy to read aloud
  // or write down when handing it to someone in person.
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function AdminStaff() {
  const { user: currentUser } = useAuth();
  const [staff, setStaff] = useState([]);
  const [activity, setActivity] = useState([]);

  // Create-account form
  const [form, setForm] = useState({ name: '', email: '', password: generatePassword() });
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [creating, setCreating] = useState(false);

  // Legacy promote-by-email fallback
  const [promoteEmail, setPromoteEmail] = useState('');
  const [promoteError, setPromoteError] = useState('');
  const [promoteSuccess, setPromoteSuccess] = useState('');
  const [promoting, setPromoting] = useState(false);

  async function refresh() {
    const users = await listUsers();
    setStaff(users.filter((u) => u.role === 'staff'));
    try {
      setActivity(await getAllActivity());
    } catch {
      // activity_log table may not exist yet if the migration hasn't been run
      setActivity([]);
    }
  }
  useEffect(() => { refresh(); }, []);

  function handleFormChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('create-staff', {
        body: { name: form.name, email: form.email, password: form.password, role: 'staff' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCreateSuccess(
        `Staff account created for ${form.name}. Give them these credentials to sign in at /staff-login: ` +
        `${form.email} / ${form.password}`
      );
      setForm({ name: '', email: '', password: generatePassword() });
      refresh();
    } catch (err) {
      setCreateError(
        err.message?.includes('Failed to fetch') || err.message?.includes('not found')
          ? "Couldn't reach the create-staff function — make sure it's deployed (see supabase/functions/create-staff)."
          : err.message
      );
    } finally {
      setCreating(false);
    }
  }

  async function handlePromote(e) {
    e.preventDefault();
    setPromoteError('');
    setPromoteSuccess('');
    setPromoting(true);
    try {
      const { data, error: lookupErr } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .ilike('email', promoteEmail.trim())
        .maybeSingle();
      if (lookupErr) throw lookupErr;
      if (!data) {
        setPromoteError('No existing account found with that email.');
        return;
      }
      if (data.role === 'admin') {
        setPromoteError('That account is already an admin.');
        return;
      }
      await setUserRole(data.id, 'staff');
      await logActivity({
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: 'admin',
        action: 'promote_to_staff',
        detail: `Promoted existing account ${data.name || data.email} to staff`,
      });
      setPromoteSuccess(`${data.name || data.email} is now staff.`);
      setPromoteEmail('');
      refresh();
    } catch (err) {
      setPromoteError(err.message);
    } finally {
      setPromoting(false);
    }
  }

  async function handleRemoveStaff(staffUser) {
    await setUserRole(staffUser.id, 'buyer');
    await logActivity({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: 'admin',
      action: 'remove_staff_access',
      detail: `Removed staff access from ${staffUser.name || staffUser.email}`,
    });
    refresh();
  }

  return (
    <div>
      <div className="admin-panel-header">
        <h2 className="section-title" style={{ fontSize: '1.5rem' }}>Staff</h2>
      </div>

      <div className="card" style={{ marginBottom: 24, maxWidth: 480 }}>
        <h3 style={{ marginBottom: 12 }}>Create a staff account</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 14 }}>
          Set up a new staff member directly — they don't need to sign up themselves first.
          They'll sign in with these credentials at <strong>/staff-login</strong>.
        </p>
        <form onSubmit={handleCreate}>
          <div className="field">
            <label>Full name</label>
            <input name="name" required value={form.name} onChange={handleFormChange} />
          </div>
          <div className="field">
            <label>Email</label>
            <input name="email" type="email" required value={form.email} onChange={handleFormChange} />
          </div>
          <div className="field">
            <label>Temporary password</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                name="password"
                required
                minLength={6}
                value={form.password}
                onChange={handleFormChange}
                style={{ flex: 1, fontFamily: 'var(--font-mono)' }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setForm((f) => ({ ...f, password: generatePassword() }))}
              >
                Regenerate
              </Button>
            </div>
          </div>
          {createError && <p className="field-error" style={{ marginBottom: 12 }}>{createError}</p>}
          {createSuccess && (
            <p style={{ color: 'var(--success)', fontSize: '0.82rem', marginBottom: 12 }}>{createSuccess}</p>
          )}
          <Button type="submit" disabled={creating} style={{ width: '100%' }}>
            {creating ? 'Creating…' : 'Create staff account'}
          </Button>
        </form>
      </div>

      <details style={{ marginBottom: 28, maxWidth: 480 }}>
        <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 12 }}>
          Or promote an existing account instead
        </summary>
        <div className="card" style={{ marginTop: 12 }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 14 }}>
            If someone already has a ReelMarket account (they signed up as a buyer), you can grant
            them staff access by email instead of creating a new login.
          </p>
          <form onSubmit={handlePromote}>
            <div className="field">
              <label>Their email address</label>
              <input type="email" required value={promoteEmail} onChange={(e) => setPromoteEmail(e.target.value)} />
            </div>
            {promoteError && <p className="field-error" style={{ marginBottom: 12 }}>{promoteError}</p>}
            {promoteSuccess && (
              <p style={{ color: 'var(--success)', fontSize: '0.85rem', marginBottom: 12 }}>{promoteSuccess}</p>
            )}
            <Button type="submit" disabled={promoting} variant="secondary" style={{ width: '100%' }}>
              {promoting ? 'Checking…' : 'Grant staff access'}
            </Button>
          </form>
        </div>
      </details>

      <h3 style={{ marginBottom: 12 }}>Current staff ({staff.length})</h3>
      {staff.length === 0 ? (
        <EmptyState title="No staff yet" />
      ) : (
        <div className="table-scroll" style={{ marginBottom: 32 }}>
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th></th></tr></thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>
                    <Button size="sm" variant="danger" onClick={() => handleRemoveStaff(s)}>
                      Remove staff access
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 style={{ marginBottom: 12 }}>Team activity</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 12 }}>
        Every staff/admin action across the team. Staff members only see their own activity —
        this full view is admin-only.
      </p>
      {activity.length === 0 ? (
        <EmptyState title="No activity yet" message="Actions will appear here as staff and admins use the panel." />
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Who</th><th>Action</th><th>Detail</th><th>When</th></tr></thead>
            <tbody>
              {activity.map((a) => (
                <tr key={a.id}>
                  <td>{a.actorName} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({a.actorRole})</span></td>
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
