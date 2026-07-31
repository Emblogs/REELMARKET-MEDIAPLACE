import { supabase } from './supabaseClient';

function mapProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Auth is now handled entirely by Supabase — real hashed sessions, real
 * OAuth, real one-time codes. Nothing here stores a password in plain text
 * anymore (that was an honest limitation of the old localStorage version).
 *
 * Customers sign in with Google or an emailed one-time code (no password to
 * remember). Staff/admin accounts use email + password instead, since those
 * are internal accounts an admin sets up deliberately (see the note in
 * sellerService.js / AdminStaff.jsx about how staff accounts actually get
 * created without a backend service-role key).
 */

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
  // Supabase redirects the whole page to Google and back — there's nothing
  // else to return here; AuthContext picks up the resulting session via
  // onAuthStateChange once the browser lands back on the app.
}

/** Step 1 of email OTP: send a 6-digit code to the given address. */
export async function sendEmailOtp(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

/** Step 2 of email OTP: verify the code the person received. */
export async function verifyEmailOtp(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
  return data.session;
}

/**
 * Customer sign-up with a real password. Supabase creates the auth.users
 * row, and the `on_auth_user_created` trigger creates the matching
 * `profiles` row (defaulted to role 'buyer') automatically.
 *
 * NOTE: if "Confirm email" is turned on in Supabase Auth settings, `session`
 * will come back null here — the account exists but can't sign in until the
 * person clicks the confirmation link. The Signup page handles that case.
 */
export async function signUpWithPassword(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  return data.session; // null if email confirmation is required
}

/** Staff/admin sign-in — these accounts use a real password, not OTP. */
export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Fetches the app-specific profile row (role/status/name) for a user. */
export async function getProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) {
    console.error('[authService] getProfile failed', error);
    return null;
  }
  return mapProfile(data);
}

export async function listUsers() {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw error;
  return data.map(mapProfile);
}

export async function setUserStatus(userId, status) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return mapProfile(data);
}

export async function setUserRole(userId, role) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return mapProfile(data);
}
