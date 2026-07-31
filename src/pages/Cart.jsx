import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Toast from '../components/ui/Toast';
import { getCartForUser, updateCartQuantity, removeFromCart, clearCartForUser } from '../services/cartService';
import { createOrder } from '../services/ordersService';
import { getAllListings } from '../services/listingsService';
import { payWithPaystack } from '../services/paystackService';
import { formatNaira } from '../utils/format';

export default function Cart() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [paying, setPaying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  async function refresh() {
    if (user) setItems(await getCartForUser(user.id));
  }

  useEffect(() => { refresh(); }, [user]);

  if (!isAuthenticated) {
    return (
      <div className="container section">
        <p>
          <Link to="/login" style={{ color: 'var(--accent-tracking)' }}>Sign in</Link> to view your cart.
        </p>
      </div>
    );
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  function handleCheckout() {
    if (items.length === 0) return;
    setError('');
    setPaying(true);

    payWithPaystack({
      email: user.email,
      amountNaira: total,
      metadata: { userId: user.id, itemCount: items.length },
      onSuccess: async (response) => {
        try {
          setPaying(false);
          setConfirming(true);

          const listings = await getAllListings();
          for (const cartItem of items) {
            const listing = listings.find((l) => l.id === cartItem.listingId);
            await createOrder({
              buyerId: user.id,
              buyerName: user.name,
              listingId: cartItem.listingId,
              titleSnapshot: cartItem.titleSnapshot,
              sellerId: listing?.sellerId || null,
              sellerName: listing?.sellerName || 'Store',
              quantity: cartItem.quantity,
              unitPrice: cartItem.price,
              totalAmount: cartItem.price * cartItem.quantity,
              paystackReference: response.reference,
            });
          }
          await clearCartForUser(user.id);

          // Brief "confirming payment" beat before the success notification —
          // mirrors what a real payment confirmation would feel like, rather
          // than an instant jump to "done".
          await new Promise((resolve) => setTimeout(resolve, 1400));

          setConfirming(false);
          setToast(`Payment confirmed! Your order${items.length > 1 ? 's are' : ' is'} complete.`);

          setTimeout(() => navigate('/account?tab=orders'), 1800);
        } catch (err) {
          setError(err.message);
          setPaying(false);
          setConfirming(false);
        }
      },
      onClose: () => setPaying(false),
    }).catch((err) => {
      setError(err.message);
      setPaying(false);
    });
  }

  return (
    <div className="container section">
      <Toast message={toast} variant="success" onDismiss={() => setToast('')} />
      <span className="eyebrow">Checkout</span>
      <h1 className="section-title" style={{ marginBottom: 24 }}>Your cart</h1>

      {items.length === 0 && (
        <EmptyState title="Your cart is empty" message="Browse the catalog to find something to buy or trade." />
      )}

      {items.length > 0 && (
        <div className="cart-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map((i) => (
              <div key={i.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <p style={{ fontWeight: 700 }}>{i.titleSnapshot?.title}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{formatNaira(i.price)} each</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="number"
                    min={1}
                    value={i.quantity}
                    onChange={(e) => { updateCartQuantity(i.id, Number(e.target.value)).then(refresh); }}
                    style={{ width: 56, background: 'var(--bg-surface-2)', border: '1px solid var(--border-strong)', borderRadius: 6, color: 'var(--text-primary)', padding: 6 }}
                  />
                  <button className="btn btn-ghost btn-sm" onClick={() => { removeFromCart(i.id).then(refresh); }}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ alignSelf: 'start' }}>
            <p style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span>Total</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{formatNaira(total)}</strong>
            </p>
            {error && <p className="field-error" style={{ marginBottom: 12 }}>{error}</p>}
            <Button style={{ width: '100%' }} disabled={paying || confirming} onClick={handleCheckout}>
              {paying ? 'Opening Paystack…' : confirming ? 'Confirming payment…' : 'Pay with Paystack'}
            </Button>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 10 }}>
              You'll get a confirmation the moment your payment goes through — no waiting on admin approval.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
