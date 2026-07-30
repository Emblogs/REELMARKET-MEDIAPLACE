/**
 * Paystack Inline integration.
 *
 * IMPORTANT (production note): this only uses Paystack's PUBLIC key and
 * relies on the client-side `onSuccess` callback. There is no backend here
 * to call Paystack's server-side /transaction/verify/:reference endpoint
 * with the SECRET key, which is how a real production system would confirm
 * a payment actually happened before trusting it. That's exactly why this
 * app adds a manual "admin confirms the order" step after checkout — it's
 * a stand-in safety net for the missing server-side verification, not a
 * replacement for it. Before going live with real money, add a backend
 * verification endpoint and call it from here instead of trusting the
 * client callback alone.
 */

const PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
const SCRIPT_SRC = 'https://js.paystack.co/v1/inline.js';

let scriptPromise = null;

function loadPaystackScript() {
  if (window.PaystackPop) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load Paystack script.'));
    document.body.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Opens the Paystack inline popup.
 * amountNaira: amount in whole Naira (will be converted to kobo internally).
 */
export async function payWithPaystack({ email, amountNaira, metadata, onSuccess, onClose }) {
  if (!PUBLIC_KEY) {
    throw new Error(
      'Paystack is not configured. Set VITE_PAYSTACK_PUBLIC_KEY in your .env file.'
    );
  }

  await loadPaystackScript();

  const handler = window.PaystackPop.setup({
    key: PUBLIC_KEY,
    email,
    amount: Math.round(amountNaira * 100), // kobo
    currency: 'NGN',
    metadata,
    callback: (response) => onSuccess(response),
    onClose: () => onClose?.(),
  });

  handler.openIframe();
}
