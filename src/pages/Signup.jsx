import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as authService from '../services/authService';
import Button from '../components/ui/Button';

export default function Signup() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleGoogle() {
    setError('');
    try {
      await authService.signInWithGoogle();
      // Browser redirects to Google and back — nothing more to do here.
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const session = await authService.signUpWithPassword(form.email, form.password, form.name);
      if (!session) {
        // Email confirmation is turned on in Supabase — account exists,
        // but can't sign in until they click the link in their inbox.
        setInfo(`Almost there — we sent a confirmation link to ${form.email}. Click it, then sign in.`);
        return;
      }
      await refresh();
      const redirectTo = location.state?.from?.pathname;
      navigate(redirectTo || '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container section" style={{ maxWidth: 420 }}>
      <span className="eyebrow">New here?</span>
      <h1 className="section-title" style={{ marginBottom: 24 }}>Create your account</h1>

      <div className="card">
        <Button variant="secondary" style={{ width: '100%', marginBottom: 20 }} onClick={handleGoogle}>
          Continue with Google
        </Button>

        <div className="sprocket-divider" style={{ margin: '0 0 20px' }}>
          <div className="holes"><span /><span /><span /></div>
        </div>

        {info ? (
          <p style={{ color: 'var(--success)', fontSize: '0.9rem' }}>{info}</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" type="text" required value={form.name} onChange={handleChange} />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required value={form.email} onChange={handleChange} />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" required minLength={6} value={form.password} onChange={handleChange} />
            </div>
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <input id="confirm" name="confirm" type="password" required minLength={6} value={form.confirm} onChange={handleChange} />
            </div>
            {error && <p className="field-error" style={{ marginBottom: 12 }}>{error}</p>}
            <Button type="submit" disabled={submitting} className="btn-lg" style={{ width: '100%' }}>
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        )}
      </div>

      <p style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--accent-tracking)' }}>Sign in</Link>
      </p>
      <p style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
        ReelMarket staff? <Link to="/staff-login" style={{ color: 'var(--accent-tracking)' }}>Sign in here</Link>
      </p>
    </div>
  );
}
