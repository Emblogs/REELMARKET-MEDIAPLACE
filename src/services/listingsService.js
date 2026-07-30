import { supabase } from './supabaseClient';

/**
 * Marketplace listings — real rows in Supabase Postgres, with Row Level
 * Security enforcing who can see/write what (see supabase/schema.sql).
 *
 * Supabase returns raw snake_case column names (title_id, seller_id, etc.).
 * Every function here maps rows to the camelCase shape the rest of the app
 * already expects (titleId, sellerId, etc.) — same shape as the old
 * localStorage version, so pages didn't need to be rewritten field-by-field.
 */

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    titleId: row.title_id,
    titleSnapshot: row.title_snapshot,
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    addedByRole: row.added_by_role,
    price: row.price,
    currency: row.currency,
    condition: row.condition,
    availability: row.availability,
    stock: row.stock,
    status: row.status,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createListing({
  titleId,
  titleSnapshot,
  sellerId,
  sellerName,
  addedByRole,
  price,
  currency = 'NGN',
  condition = 'new',
  availability = 'sale',
  stock = 1,
}) {
  const status = addedByRole === 'seller' ? 'pending' : 'approved';
  const { data, error } = await supabase
    .from('listings')
    .insert({
      title_id: titleId,
      title_snapshot: titleSnapshot,
      seller_id: sellerId || null,
      seller_name: sellerName || 'Store',
      added_by_role: addedByRole,
      price,
      currency,
      condition,
      availability,
      stock,
      status,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function getApprovedListingsForTitle(titleId) {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('title_id', titleId)
    .eq('status', 'approved');
  if (error) throw error;
  return data.map(mapRow);
}

export async function getAllListings() {
  const { data, error } = await supabase.from('listings').select('*');
  if (error) throw error;
  return data.map(mapRow);
}

export async function getPendingListings() {
  const { data, error } = await supabase.from('listings').select('*').eq('status', 'pending');
  if (error) throw error;
  return data.map(mapRow);
}

export async function getListingsBySeller(sellerId) {
  const { data, error } = await supabase.from('listings').select('*').eq('seller_id', sellerId);
  if (error) throw error;
  return data.map(mapRow);
}

export async function approveListing(listingId) {
  const { error } = await supabase.from('listings').update({ status: 'approved' }).eq('id', listingId);
  if (error) throw error;
}

export async function rejectListing(listingId, reason) {
  const { error } = await supabase
    .from('listings')
    .update({ status: 'rejected', rejection_reason: reason || 'Did not meet marketplace guidelines.' })
    .eq('id', listingId);
  if (error) throw error;
}

export async function removeListing(listingId) {
  const { error } = await supabase.from('listings').delete().eq('id', listingId);
  if (error) throw error;
}

export async function decrementStock(listingId, quantity = 1) {
  const { data: listing, error: fetchErr } = await supabase
    .from('listings')
    .select('stock')
    .eq('id', listingId)
    .single();
  if (fetchErr) throw fetchErr;
  const nextStock = Math.max(0, (listing?.stock || 0) - quantity);
  const { error } = await supabase.from('listings').update({ stock: nextStock }).eq('id', listingId);
  if (error) throw error;
}

function priceFromTitle(title = '') {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  }
  const MIN_PRICE = 2500;
  const MAX_PRICE = 18000;
  const price = MIN_PRICE + (hash % (MAX_PRICE - MIN_PRICE));
  return Math.round(price / 250) * 250;
}

/**
 * Ensures a catalog title has at least one buyable listing, creating a
 * standard "ReelMarket Store" listing on the fly if nothing exists yet.
 * Calls a narrow Postgres function (see supabase/schema.sql) rather than
 * inserting directly, because a signed-out guest browsing the catalog needs
 * to be able to trigger this — but guests must NOT be able to insert
 * arbitrary listing rows, which the regular RLS insert policy prevents.
 */
export async function ensureDefaultListing(catalogItem) {
  const { data, error } = await supabase.rpc('ensure_default_listing', {
    p_title_id: catalogItem.id,
    p_title_snapshot: {
      title: catalogItem.title,
      coverImage: catalogItem.coverImage,
      category: catalogItem.category,
    },
    p_price: priceFromTitle(catalogItem.title),
    p_stock: 25,
  });
  if (error) throw error;
  return data.map(mapRow);
}
