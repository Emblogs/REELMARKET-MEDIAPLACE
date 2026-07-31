import { useEffect } from 'react';

/**
 * A simple, self-dismissing notification banner. Rendered fixed to the
 * viewport so it works the same on every page, including on mobile where
 * there's no room for an inline banner without shifting layout.
 */
export default function Toast({ message, variant = 'success', onDismiss, duration = 5000 }) {
  useEffect(() => {
    if (!duration) return undefined;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  if (!message) return null;

  return (
    <div className={`toast toast-${variant}`} role="status">
      <span>{message}</span>
      <button className="toast-close" onClick={onDismiss} aria-label="Dismiss">×</button>
    </div>
  );
}
