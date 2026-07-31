import { supabase } from './supabaseClient';

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    action: row.action,
    detail: row.detail,
    createdAt: row.created_at,
  };
}

/**
 * Records a staff/admin action. This is intentionally "best effort" — if
 * logging fails for some reason, we don't want that to block or roll back
 * the actual action (e.g. an order still gets confirmed even if the log
 * write hiccups). Errors are swallowed here and just logged to console.
 */
export async function logActivity({ actorId, actorName, actorRole, action, detail }) {
  try {
    const { error } = await supabase
      .from('activity_log')
      .insert({ actor_id: actorId, actor_name: actorName, actor_role: actorRole, action, detail });
    if (error) throw error;
  } catch (err) {
    console.error('[activityLogService] failed to log activity', err);
  }
}

/** A staff member's own activity — RLS already restricts this to their rows. */
export async function getMyActivity(userId) {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('actor_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data.map(mapRow);
}

/** Admin-only: every staff/admin action across the whole team. */
export async function getAllActivity() {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return data.map(mapRow);
}
