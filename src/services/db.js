/**
 * db.js — localStorage-backed data layer.
 *
 * IMPORTANT (production note):
 * This module simulates a database using the browser's localStorage.
 * Every function here is written with the same shape a real API/database
 * client would have (collection name + CRUD verbs), specifically so that
 * swapping this file's internals for real `fetch()` calls to a backend
 * later does NOT require touching any component or page. Only this file
 * (and the two service files that build on it) would need to change.
 *
 * Known limitations of this demo implementation:
 * - Data lives only in the visiting browser. Nothing is shared across devices.
 * - There is no real authentication/authorization enforcement — anyone with
 *   devtools access could edit their own role in localStorage. Route guards
 *   in this app hide/redirect the UI, but do not constitute real security.
 */

const NAMESPACE = 'mm'; // media-marketplace

function key(collection) {
  return `${NAMESPACE}:${collection}`;
}

function readAll(collection) {
  try {
    const raw = localStorage.getItem(key(collection));
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error(`[db] Failed to read collection "${collection}"`, err);
    return [];
  }
}

function writeAll(collection, records) {
  try {
    localStorage.setItem(key(collection), JSON.stringify(records));
    return true;
  } catch (err) {
    console.error(`[db] Failed to write collection "${collection}"`, err);
    return false;
  }
}

function genId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Get every record in a collection. */
export function getAll(collection) {
  return readAll(collection);
}

/** Get a single record by id. */
export function getById(collection, id) {
  return readAll(collection).find((r) => r.id === id) || null;
}

/** Find records matching a predicate function. */
export function find(collection, predicate) {
  return readAll(collection).filter(predicate);
}

/** Insert a new record. Auto-generates id/createdAt if not provided. */
export function insert(collection, record) {
  const records = readAll(collection);
  const withDefaults = {
    id: record.id || genId(collection),
    createdAt: record.createdAt || new Date().toISOString(),
    ...record,
  };
  records.push(withDefaults);
  writeAll(collection, records);
  return withDefaults;
}

/** Update a record by id with a partial patch. Returns the updated record or null. */
export function update(collection, id, patch) {
  const records = readAll(collection);
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  records[idx] = { ...records[idx], ...patch, updatedAt: new Date().toISOString() };
  writeAll(collection, records);
  return records[idx];
}

/** Remove a record by id. Returns true if something was removed. */
export function remove(collection, id) {
  const records = readAll(collection);
  const next = records.filter((r) => r.id !== id);
  writeAll(collection, next);
  return next.length !== records.length;
}

/** Replace an entire collection (used sparingly, e.g. seeding). */
export function seedIfEmpty(collection, seedRecords) {
  const existing = readAll(collection);
  if (existing.length === 0 && seedRecords.length > 0) {
    writeAll(collection, seedRecords);
  }
}

export function clearCollection(collection) {
  writeAll(collection, []);
}

export const COLLECTIONS = {
  USERS: 'users',
  SELLER_APPLICATIONS: 'seller_applications',
  LISTINGS: 'listings',
  ORDERS: 'orders',
  BANNERS: 'banners',
  PROMOS: 'promos',
  CART: 'cart',
  FRANCHISES: 'franchises',
};
