import { getOrdersForSeller } from './ordersService';

/**
 * Seller trust score — one of the app's differentiators.
 * Rather than a raw "approved" flag, sellers earn a visible trust badge
 * computed from how their orders actually resolve: confirmed vs rejected.
 *
 * This is intentionally simple (no ML) — a transparent, explainable score
 * is more trustworthy for a marketplace than a black-box one.
 */
export async function getSellerTrustScore(sellerId) {
  const orders = await getOrdersForSeller(sellerId);
  const resolved = orders.filter((o) => o.status === 'confirmed' || o.status === 'rejected');

  if (resolved.length === 0) {
    return { score: null, label: 'New Seller', totalOrders: orders.length, confirmed: 0 };
  }

  const confirmed = resolved.filter((o) => o.status === 'confirmed').length;
  const score = Math.round((confirmed / resolved.length) * 100);

  let label = 'Building Trust';
  if (score >= 90) label = 'Highly Trusted';
  else if (score >= 70) label = 'Trusted';
  else if (score >= 40) label = 'Mixed Track Record';
  else label = 'Low Reliability';

  return { score, label, totalOrders: orders.length, confirmed };
}
