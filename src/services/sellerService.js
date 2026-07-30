import { supabase } from './supabaseClient';
import { setUserRole } from './authService';
import { SELLER_TERMS_VERSION } from '../data/seed';

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    message: row.message,
    agreedToTerms: row.agreed_to_terms,
    termsVersion: row.terms_version,
    agreedAt: row.agreed_at,
    status: row.status,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
  };
}

/**
 * NOTE on staff account creation (an honest limitation of a backend-less
 * Supabase setup): creating a brand new auth user with a specific password
 * requires Supabase's Admin API, which needs the SERVICE ROLE key — and
 * that key must never be exposed in frontend JavaScript (anyone could read
 * it from the browser and get full database access). So the real-world-safe
 * flow is: the person signs up themselves first (Google or email code, same
 * as any buyer), then an admin promotes their existing account to 'staff'
 * by email from the admin panel. See AdminStaff.jsx.
 */

export async function applyToBecomeSeller({ userId, userName, userEmail, message, agreedToTerms }) {
  if (!agreedToTerms) {
    throw new Error('You must accept the Seller Agreement to apply.');
  }

  const { data: pending } = await supabase
    .from('seller_applications')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'pending');
  if (pending?.length > 0) {
    throw new Error('You already have a pending seller application.');
  }

  const { data, error } = await supabase
    .from('seller_applications')
    .insert({
      user_id: userId,
      user_name: userName,
      user_email: userEmail,
      message,
      agreed_to_terms: true,
      terms_version: SELLER_TERMS_VERSION,
      agreed_at: new Date().toISOString(),
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function getAllApplications() {
  const { data, error } = await supabase
    .from('seller_applications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(mapRow);
}

export async function getPendingApplications() {
  const { data, error } = await supabase.from('seller_applications').select('*').eq('status', 'pending');
  if (error) throw error;
  return data.map(mapRow);
}

export async function getApplicationForUser(userId) {
  const { data, error } = await supabase
    .from('seller_applications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return mapRow(data);
}

export async function approveApplication(applicationId, userId) {
  const { error } = await supabase
    .from('seller_applications')
    .update({ status: 'approved' })
    .eq('id', applicationId);
  if (error) throw error;
  return setUserRole(userId, 'seller');
}

export async function rejectApplication(applicationId, reason) {
  const { error } = await supabase
    .from('seller_applications')
    .update({ status: 'rejected', rejection_reason: reason || 'Application did not meet marketplace requirements.' })
    .eq('id', applicationId);
  if (error) throw error;
}
