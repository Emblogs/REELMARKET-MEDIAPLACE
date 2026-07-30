-- ============================================================================
-- ReelMarket — Supabase schema, security policies, and triggers
-- ============================================================================
-- HOW TO USE: Supabase dashboard → SQL Editor → New query → paste this whole
-- file → Run. Safe to run once on a fresh project. If you need to re-run it,
-- drop the tables first (see bottom of file, commented out).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES — extends Supabase's built-in auth.users with app-specific
--    fields (role, status). This is the "users" table the rest of the app
--    refers to.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null,
  role text not null default 'buyer' check (role in ('buyer', 'seller', 'staff', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended', 'banned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up (Google, email OTP,
-- or password) — this is what makes every new auth.users row usable by the
-- rest of the app immediately, defaulted to the 'buyer' role.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    'buyer',
    'active'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. Helper functions for RLS policies (security definer avoids recursive
--    RLS lookups when a policy needs to check the current user's own role).
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public;

create or replace function public.is_admin()
returns boolean as $$
  select public.current_user_role() = 'admin';
$$ language sql stable security definer set search_path = public;

create or replace function public.is_admin_or_staff()
returns boolean as $$
  select public.current_user_role() in ('admin', 'staff');
$$ language sql stable security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- 3. SELLER APPLICATIONS
-- ---------------------------------------------------------------------------
create table public.seller_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_name text not null,
  user_email text not null,
  message text,
  agreed_to_terms boolean not null default false,
  terms_version text,
  agreed_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. LISTINGS — marketplace items (multiple sellers can list the same title)
-- ---------------------------------------------------------------------------
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  title_id text not null,
  title_snapshot jsonb not null,
  seller_id uuid references public.profiles(id) on delete set null,
  seller_name text not null default 'Store',
  added_by_role text not null check (added_by_role in ('admin', 'staff', 'seller')),
  price numeric not null check (price >= 0),
  currency text not null default 'NGN',
  condition text not null default 'new',
  availability text not null default 'sale' check (availability in ('sale', 'trade', 'both')),
  stock int not null default 1 check (stock >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5. ORDERS
-- ---------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  buyer_name text not null,
  listing_id uuid references public.listings(id) on delete set null,
  title_snapshot jsonb not null,
  seller_id uuid references public.profiles(id) on delete set null,
  seller_name text not null default 'Store',
  quantity int not null check (quantity > 0),
  unit_price numeric not null,
  total_amount numeric not null,
  currency text not null default 'NGN',
  paystack_reference text,
  status text not null default 'pending_confirmation' check (status in ('pending_confirmation', 'confirmed', 'rejected')),
  rejection_reason text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 6. BANNERS & PROMOS
-- ---------------------------------------------------------------------------
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text not null,
  link_to text,
  active boolean not null default true,
  display_order int not null default 1,
  created_at timestamptz not null default now()
);

create table public.promos (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  image_url text not null,
  link_to text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 7. CART ITEMS
-- ---------------------------------------------------------------------------
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  title_snapshot jsonb not null,
  price numeric not null,
  quantity int not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY — this is what makes authorization real (enforced by
-- the database itself, not just hidden in the React UI like the old
-- localStorage version).
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.seller_applications enable row level security;
alter table public.listings enable row level security;
alter table public.orders enable row level security;
alter table public.banners enable row level security;
alter table public.promos enable row level security;
alter table public.cart_items enable row level security;

-- ---------- profiles ----------
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

-- Deliberately no general self-update policy: role/status changes must go
-- through an admin session, so a buyer can never grant themselves 'admin'
-- by calling the update endpoint directly.
create policy "profiles_admin_update" on public.profiles
  for update using (public.is_admin());

-- ---------- seller_applications ----------
create policy "applications_select_own_or_admin" on public.seller_applications
  for select using (auth.uid() = user_id or public.is_admin());

create policy "applications_insert_own" on public.seller_applications
  for insert with check (auth.uid() = user_id);

create policy "applications_admin_update" on public.seller_applications
  for update using (public.is_admin());

-- ---------- listings ----------
-- Public catalog browsing: anyone (including signed-out visitors) can see
-- approved listings. This is the one deliberately public table.
create policy "listings_select_approved_public" on public.listings
  for select using (status = 'approved');

create policy "listings_select_own_or_staff" on public.listings
  for select using (auth.uid() = seller_id or public.is_admin_or_staff());

create policy "listings_insert" on public.listings
  for insert with check (
    (public.is_admin_or_staff() and seller_id is null)
    or (public.current_user_role() = 'seller' and seller_id = auth.uid())
  );

create policy "listings_update_admin_staff" on public.listings
  for update using (public.is_admin_or_staff());

create policy "listings_update_own_pending" on public.listings
  for update using (auth.uid() = seller_id and status = 'pending');

create policy "listings_delete" on public.listings
  for delete using (public.is_admin_or_staff() or auth.uid() = seller_id);

-- ---------- orders ----------
create policy "orders_select_buyer_seller_admin" on public.orders
  for select using (auth.uid() = buyer_id or auth.uid() = seller_id or public.is_admin());

create policy "orders_insert_own" on public.orders
  for insert with check (auth.uid() = buyer_id);

-- Only admin can confirm/reject — buyers and sellers can never flip their
-- own order's status, which is the whole point of the manual confirmation
-- step (see ordersService.js comments).
create policy "orders_admin_update" on public.orders
  for update using (public.is_admin());

-- ---------- banners & promos ----------
create policy "banners_select_active_public" on public.banners
  for select using (active = true or public.is_admin());

create policy "banners_admin_write" on public.banners
  for all using (public.is_admin());

create policy "promos_select_active_public" on public.promos
  for select using (active = true or public.is_admin());

create policy "promos_admin_write" on public.promos
  for all using (public.is_admin());

-- ---------- cart_items ----------
create policy "cart_own_only" on public.cart_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- ensure_default_listing: lets ANY visitor (including signed-out guests)
-- trigger creation of a default "ReelMarket Store" listing for a catalog
-- title that has no listings yet — without weakening the listings_insert
-- policy above to allow arbitrary inserts from random visitors. This is the
-- one deliberate, narrow exception, and it only ever creates a listing
-- owned by the store (seller_id null), never on anyone's behalf.
-- ============================================================================
create or replace function public.ensure_default_listing(
  p_title_id text,
  p_title_snapshot jsonb,
  p_price numeric,
  p_stock int default 25
) returns setof public.listings as $$
begin
  if exists (select 1 from public.listings where title_id = p_title_id and status = 'approved') then
    return query select * from public.listings where title_id = p_title_id and status = 'approved';
  end if;

  return query insert into public.listings
    (title_id, title_snapshot, seller_id, seller_name, added_by_role, price, stock, status, availability, condition)
    values (p_title_id, p_title_snapshot, null, 'ReelMarket Store', 'admin', p_price, p_stock, 'approved', 'sale', 'new')
    returning *;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.ensure_default_listing(text, jsonb, numeric, int) to anon, authenticated;

-- ============================================================================
-- SETUP'S LAST STEP (do this after deploying, not in this SQL file):
-- Sign up once through the live app (Google or email code), then in
-- Supabase's Table Editor open "profiles", find your row, and change its
-- "role" column to 'admin'. That's your first admin account.
-- ============================================================================

-- To start over from scratch, uncomment and run:
-- drop table if exists public.cart_items, public.promos, public.banners,
--   public.orders, public.listings, public.seller_applications, public.profiles cascade;
