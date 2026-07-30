import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as authService from '../services/authService';
import Button from '../components/ui/Button';

export default function StaffLogin() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await authService.signInWithPassword(form.email, form.password);
      await refresh();
      const session = await authService.getCurrentSession();
      const profile = await authService.getProfile(session.user.id);

      if (profile.status === 'banned') throw new Error('This account has been banned.');
      if (profile.status === 'suspended') throw new Error('This account is currently suspended.');
      if (profile.role !== 'staff' && profile.role !== 'admin') {
        await authService.logout();
        throw new Error('This sign-in is for ReelMarket staff accounts only.');
      }
      navigate(profile.role === 'admin' ? '/admin' : '/staff');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container section" style={{ maxWidth: 380 }}>
      <span className="eyebrow">Internal access</span>
      <h1 className="section-title" style={{ marginBottom: 24, fontSize: '1.6rem' }}>Staff sign-in</h1>

      <form onSubmit={handleSubmit} className="card">
        <div className="field">
          <label htmlFor="email">Staff email</label>
          <input id="email" name="email" type="email" required value={form.email} onChange={handleChange} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required value={form.password} onChange={handleChange} />
        </div>
        {error && <p className="field-error" style={{ marginBottom: 12 }}>{error}</p>}
        <Button type="submit" disabled={submitting} className="btn-lg" style={{ width: '100%' }}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
        Staff accounts are created by an administrator — there's no self-signup here.
        Wrong page? <a href="/login" style={{ color: 'var(--accent-tracking)' }}>Customer sign-in</a>
      </p>
    </div>
  );
}
