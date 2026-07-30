/**
 * Minimal pub-sub so components that don't share a parent (e.g. the Navbar
 * badge and the Cart page) can stay in sync when localStorage-backed data
 * changes. Built on native CustomEvents — no extra dependency needed.
 */
const EVENT_NAME = 'mm:data-changed';

export function emitDataChanged(detail) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
}

export function onDataChanged(callback) {
  window.addEventListener(EVENT_NAME, callback);
  return () => window.removeEventListener(EVENT_NAME, callback);
}
