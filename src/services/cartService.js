import { supabase } from './supabaseClient';
import { emitDataChanged } from '../utils/events';

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    listingId: row.listing_id,
    titleSnapshot: row.title_snapshot,
    price: row.price,
    quantity: row.quantity,
    createdAt: row.created_at,
  };
}

/**
 * Cart now lives in Supabase instead of localStorage — a nice side benefit
 * of the migration is the cart persists across devices, not just the one
 * browser it was added from.
 */

export async function getCartForUser(userId) {
  const { data, error } = await supabase.from('cart_items').select('*').eq('user_id', userId);
  if (error) throw error;
  return data.map(mapRow);
}

export async function addToCart({ userId, listingId, titleSnapshot, price, quantity = 1 }) {
  const { data: existing } = await supabase
    .from('cart_items')
    .select('*')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .maybeSingle();

  let result;
  if (existing) {
    const { data, error } = await supabase
      .from('cart_items')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await supabase
      .from('cart_items')
      .insert({ user_id: userId, listing_id: listingId, title_snapshot: titleSnapshot, price, quantity })
      .select()
      .single();
    if (error) throw error;
    result = data;
  }
  emitDataChanged({ type: 'cart' });
  return mapRow(result);
}

export async function updateCartQuantity(cartItemId, quantity) {
  if (quantity <= 0) {
    const { error } = await supabase.from('cart_items').delete().eq('id', cartItemId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('cart_items').update({ quantity }).eq('id', cartItemId);
    if (error) throw error;
  }
  emitDataChanged({ type: 'cart' });
}

export async function removeFromCart(cartItemId) {
  const { error } = await supabase.from('cart_items').delete().eq('id', cartItemId);
  if (error) throw error;
  emitDataChanged({ type: 'cart' });
}

export async function clearCartForUser(userId) {
  const { error } = await supabase.from('cart_items').delete().eq('user_id', userId);
  if (error) throw error;
  emitDataChanged({ type: 'cart' });
}
