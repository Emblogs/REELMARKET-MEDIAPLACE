-- ============================================================================
-- ReelMarket — activity log migration
-- ============================================================================
-- HOW TO USE: Supabase dashboard → SQL Editor → New query → paste this whole
-- file → Run. This is additive — run it AFTER schema.sql, on top of your
-- existing database. Safe to run once.
--
-- WHAT THIS ADDS: a record of staff/admin actions (adding items, approving
-- sellers, confirming orders, etc.) so there's real accountability for who
-- did what. Each staff member can only see their own entries; admins can see
-- everyone's, including other admins'.
-- ============================================================================

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  actor_name text not null,
  actor_role text not null check (actor_role in ('staff', 'admin')),
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index activity_log_actor_id_idx on public.activity_log (actor_id);
create index activity_log_created_at_idx on public.activity_log (created_at desc);

alter table public.activity_log enable row level security;

-- A staff member sees only rows they created; admins see every row
-- (including other admins' and other staff's), which is what lets an admin
-- audit the whole team while staff can't see each other's activity.
create policy "activity_select_own_or_admin" on public.activity_log
  for select using (auth.uid() = actor_id or public.is_admin());

-- Staff/admin can only ever insert a log row for their own actions — never
-- forge an entry attributed to someone else.
create policy "activity_insert_own" on public.activity_log
  for insert with check (auth.uid() = actor_id and public.is_admin_or_staff());

-- No update/delete policy at all — log entries are append-only by design.
