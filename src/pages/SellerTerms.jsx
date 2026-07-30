import { SELLER_TERMS_TEXT } from '../data/seed';

export default function SellerTerms() {
  return (
    <div className="container section" style={{ maxWidth: 700 }}>
      <span className="eyebrow">Legal</span>
      <h1 className="section-title" style={{ marginBottom: 24 }}>Seller Agreement</h1>
      <div className="card">
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-body)', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {SELLER_TERMS_TEXT}
        </pre>
      </div>
    </div>
  );
}
