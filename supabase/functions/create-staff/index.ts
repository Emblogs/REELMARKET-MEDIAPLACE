// supabase/functions/create-staff/index.ts
//
// Lets an admin create a real staff account (email + password) directly,
// Django-admin style — instead of the old flow where the staff member had
// to sign themselves up first and then get promoted by email.
//
// This has to live in an Edge Function because creating a user with a
// specific password requires Supabase's Admin API, which needs the SERVICE
// ROLE key. That key must never be shipped to the browser — so it stays
// here, server-side, and the frontend only ever calls this function over
// HTTPS with the caller's own session token attached.
//
// Deploy with:
//   supabase functions deploy create-staff
//
// No extra secrets to set — SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
// automatically available to every Edge Function in your project.

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing Authorization header.' }, 401);
    }

    // Client scoped to the CALLER's token — used only to verify who's
    // calling and that they're actually an admin. Never used to write data.
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: callerUser },
      error: callerErr,
    } = await callerClient.auth.getUser();
    if (callerErr || !callerUser) {
      return json({ error: 'Could not verify caller session.' }, 401);
    }

    const { data: callerProfile, error: profileErr } = await callerClient
      .from('profiles')
      .select('role, name')
      .eq('id', callerUser.id)
      .single();
    if (profileErr || callerProfile?.role !== 'admin') {
      return json({ error: 'Only admins can create staff accounts.' }, 403);
    }

    const { name, email, password, role } = await req.json();
    if (!name || !email || !password) {
      return json({ error: 'name, email, and password are required.' }, 400);
    }
    if (password.length < 6) {
      return json({ error: 'Password must be at least 6 characters.' }, 400);
    }
    const grantedRole = role === 'admin' ? 'admin' : 'staff';

    // Admin client — the only place the service role key actually gets used.
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip the confirmation email — admin is vouching for this account
      user_metadata: { name },
    });
    if (createErr) {
      return json({ error: createErr.message }, 400);
    }

    // The on_auth_user_created trigger already inserted a 'buyer' profile row
    // — bump it to the requested role.
    const { error: roleErr } = await adminClient
      .from('profiles')
      .update({ role: grantedRole })
      .eq('id', created.user.id);
    if (roleErr) {
      return json({ error: `Account created but role assignment failed: ${roleErr.message}` }, 500);
    }

    await adminClient.from('activity_log').insert({
      actor_id: callerUser.id,
      actor_name: callerProfile.name || callerUser.email,
      actor_role: 'admin',
      action: 'create_staff_account',
      detail: `Created ${grantedRole} account for ${name} (${email})`,
    });

    return json({ success: true, userId: created.user.id }, 200);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
