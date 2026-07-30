import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { applyToBecomeSeller, getApplicationForUser } from '../services/sellerService';
import { SELLER_TERMS_TEXT } from '../data/seed';

export default function SellerApply() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [existingApp, setExistingApp] = useState(null);

  useEffect(() => {
    if (user) getApplicationForUser(user.id).then(setExistingApp);
  }, [user]);

  if (!isAuthenticated) {
    return (
      <div className="container section">
        <p>
          You need an account to apply as a seller.{' '}
          <Link to="/login" style={{ color: 'var(--accent-tracking)' }}>Sign in</Link> or{' '}
          <Link to="/signup" style={{ color: 'var(--accent-tracking)' }}>create one</Link>.
        </p>
      </div>
    );
  }

  if (user.role === 'seller') {
    return (
      <div className="container section">
        <Badge variant="success">Approved seller</Badge>
        <h1 className="section-title" style={{ marginTop: 8 }}>You're already a seller</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
          Head to your account to submit new listings.
        </p>
        <Link to="/account"><Button style={{ marginTop: 16 }}>Go to my account</Button></Link>
      </div>
    );
  }

  if (existingApp && existingApp.status === 'pending') {
    return (
      <div className="container section">
        <Badge variant="warning">Pending review</Badge>
        <h1 className="section-title" style={{ marginTop: 8 }}>Your application is under review</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
          An admin will review your application soon. You'll be able to submit listings once approved.
        </p>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!agreed) {
      setError('You must accept the Seller Agreement to continue.');
      return;
    }
    try {
      await applyToBecomeSeller({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        message,
        agreedToTerms: agreed,
      });
      setExistingApp({ status: 'pending' });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="container section" style={{ maxWidth: 600 }}>
      <span className="eyebrow">Sell with us</span>
      <h1 className="section-title" style={{ marginBottom: 24 }}>Apply to become a seller</h1>

      {existingApp?.status === 'rejected' && (
        <p style={{ color: 'var(--danger)', marginBottom: 16 }}>
          Your last application was rejected: {existingApp.rejectionReason}. You may apply again below.
        </p>
      )}

      <form onSubmit={handleSubmit} className="card">
        <div className="field">
          <label htmlFor="message">Tell us what you'd like to sell (optional)</label>
          <textarea id="message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>

        <div className="card" style={{ background: 'var(--bg-surface-2)', marginBottom: 16, maxHeight: 180, overflowY: 'auto' }}>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {SELLER_TERMS_TEXT}
          </pre>
        </div>

        <div className="field field-checkbox">
          <input type="checkbox" id="agree" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <label htmlFor="agree">
            I have read and agree to the <Link to="/seller-terms" style={{ color: 'var(--accent-tracking)' }}>Seller Agreement</Link>.
          </label>
        </div>

        {error && <p className="field-error" style={{ marginBottom: 12 }}>{error}</p>}

        <Button type="submit" className="btn-lg" style={{ width: '100%' }}>Submit application</Button>
      </form>
    </div>
  );
}
