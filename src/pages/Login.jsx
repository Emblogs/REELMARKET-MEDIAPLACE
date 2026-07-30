import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as authService from '../services/authService';
import Button from '../components/ui/Button';

export default function Login() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState('start'); // 'start' | 'code'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleGoogle() {
    setError('');
    try {
      await authService.signInWithGoogle();
      // Browser redirects to Google and back — nothing more to do here.
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSendCode(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await authService.sendEmailOtp(email);
      setInfo(`We sent a 6-digit code to ${email}.`);
      setStep('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await authService.verifyEmailOtp(email, code);
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

        {step === 'start' && (
          <form onSubmit={handleSendCode}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {error && <p className="field-error" style={{ marginBottom: 12 }}>{error}</p>}
            <Button type="submit" disabled={submitting} className="btn-lg" style={{ width: '100%' }}>
              {submitting ? 'Sending code…' : 'Send me a sign-in code'}
            </Button>
            <p style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              No password needed — we'll email you a 6-digit code. New here? This creates
              your account automatically.
            </p>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={handleVerifyCode}>
            {info && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 14 }}>{info}</p>}
            <div className="field">
              <label htmlFor="code">6-digit code</label>
              <input
                id="code"
                inputMode="numeric"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
              />
            </div>
            {error && <p className="field-error" style={{ marginBottom: 12 }}>{error}</p>}
            <Button type="submit" disabled={submitting} className="btn-lg" style={{ width: '100%' }}>
              {submitting ? 'Verifying…' : 'Verify & sign in'}
            </Button>
            <button
              type="button"
              onClick={() => { setStep('start'); setCode(''); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--accent-tracking)', fontSize: '0.8rem', marginTop: 10 }}
            >
              Use a different email
            </button>
          </form>
        )}
      </div>

      <p style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
        ReelMarket staff? <Link to="/staff-login" style={{ color: 'var(--accent-tracking)' }}>Sign in here</Link>
      </p>
    </div>
  );
}
