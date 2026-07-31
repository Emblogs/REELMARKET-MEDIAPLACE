import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as authService from '../services/authService';
import Button from '../components/ui/Button';

export default function Login() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleGoogle() {
    setError('');
    try {
      await authService.signInWithGoogle();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await authService.signInWithPassword(form.email, form.password);
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
      <span className="eyebrow">Welcome back</span>
      <h1 className="section-title" style={{ marginBottom: 24 }}>Sign in</h1>

      <div className="card">
        <Button variant="secondary" style={{ width: '100%', marginBottom: 20 }} onClick={handleGoogle}>
          Continue with Google
        </Button>

        <div className="sprocket-divider" style={{ margin: '0 0 20px' }}>
          <div className="holes"><span /><span /><span /></div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
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
      </div>

      <p style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
        New here? <Link to="/signup" style={{ color: 'var(--accent-tracking)' }}>Create an account</Link>
      </p>
      <p style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
        ReelMarket staff? <Link to="/staff-login" style={{ color: 'var(--accent-tracking)' }}>Sign in here</Link>
      </p>
    </div>
  );
}
