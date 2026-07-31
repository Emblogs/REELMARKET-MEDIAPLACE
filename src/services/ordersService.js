import { supabase } from './supabaseClient';
import { decrementStock } from './listingsService';
import { emitDataChanged } from '../utils/events';

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    buyerId: row.buyer_id,
    buyerName: row.buyer_name,
    listingId: row.listing_id,
    titleSnapshot: row.title_snapshot,
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    totalAmount: row.total_amount,
    currency: row.currency,
    paystackReference: row.paystack_reference,
    status: row.status,
    rejectionReason: row.rejection_reason,
    confirmedAt: row.confirmed_at,
    createdAt: row.created_at,
  };
}

/**
 * Order lifecycle: confirmed | rejected (auto-confirmed on successful
 * Paystack checkout — see note below).
 *
 * NOTE (production limitation, carried over from the localStorage version):
 * there is still no server-side verification of the Paystack transaction
 * reference against Paystack's own API — that would need a small backend
 * or Supabase Edge Function calling Paystack with the secret key.
 *
 * DEMO BEHAVIOR: since this is a demo project (not processing real money),
 * orders are auto-confirmed the moment Paystack's client-side callback
 * fires, instead of sitting in "pending confirmation" until an admin
 * manually checks each one. The buyer sees a "payment confirmed" toast
 * right after checkout instead of waiting on staff. Admins can still
 * manually reject an order afterwards (e.g. to simulate a refund/dispute)
 * from the Orders panel — that path is untouched and still admin-only via
 * RLS. Before handling real payments, swap this back to
 * `status: 'pending_confirmation'` and verify server-side before trusting
 * any payment.
 */
export async function createOrder({
  buyerId,
  buyerName,
  listingId,
  titleSnapshot,
  sellerId,
  sellerName,
  quantity,
  unitPrice,
  totalAmount,
  paystackReference,
}) {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      buyer_id: buyerId,
      buyer_name: buyerName,
      listing_id: listingId,
      title_snapshot: titleSnapshot,
      seller_id: sellerId,
      seller_name: sellerName,
      quantity,
      unit_price: unitPrice,
      total_amount: totalAmount,
      currency: 'NGN',
      paystack_reference: paystackReference,
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;

  await decrementStock(listingId, quantity);
  emitDataChanged({ type: 'order' });
  return mapRow(data);
}

export async function getAllOrders() {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(mapRow);
}

export async function getOrdersForBuyer(buyerId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(mapRow);
}

export async function getOrdersForSeller(sellerId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(mapRow);
}

export async function getPendingOrders() {
  const { data, error } = await supabase.from('orders').select('*').eq('status', 'pending_confirmation');
  if (error) throw error;
  return data.map(mapRow);
}

export async function confirmOrder(orderId) {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw error;
  emitDataChanged({ type: 'order' });
}

export async function rejectOrder(orderId, reason) {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'rejected', rejection_reason: reason || 'Payment could not be verified.' })
    .eq('id', orderId);
  if (error) throw error;
  emitDataChanged({ type: 'order' });
}
