# ReelMarket

A marketplace for movies, anime, manga, and comics — buyers browse and buy or
trade with approved sellers, staff curate the catalog, and admins run the
whole show. Built with React + Vite, backed by Supabase (Postgres + Auth),
styled after a dark, poster-driven streaming-app aesthetic.

## Features

- **Unified catalog** pulled live from three external APIs (TMDB for movies,
  AniList for anime/manga, Google Books for comics) and normalized into one shape
- **Cross-media franchise linking** — related titles across categories (e.g.
  a manga and its anime adaptation) are grouped with watch/read order guides
- **Lightweight recommendation engine** — genre-overlap scoring, no external
  ML dependency needed
- **Marketplace listings** — multiple sellers can list the same title (sale,
  trade, or both), each listing requiring admin approval
- **Seller trust scores** — computed transparently from order confirmation
  history, not just a binary "approved" flag
- **Roles**: Guest (browse only) · Buyer · Seller (approved) · Staff · Admin
- **Real authentication** — Google sign-in or an emailed one-time code for
  customers (no password to remember), email + password for staff/admin
- **Real database** — Supabase Postgres with Row Level Security enforcing
  who can read/write what, not just hidden in the React UI
- **Admin panel**: dashboard with live stats, items, seller approvals, staff
  management, user ban/suspend, homepage banners & ad slots, order payment
  confirmation
- **Staff panel**: add/remove catalog items only — no access to user, seller,
  or admin settings
- **Paystack Inline checkout**, with a manual admin confirmation step before
  an order is marked successful
- **Seller Agreement** that must be explicitly accepted before applying to sell
## Getting started

### 1. Create a Supabase project

1. Go to https://supabase.com → sign in → **New project**
2. Pick a name, set a database password (save it somewhere), pick a region
3. Wait ~2 minutes for it to provision

### 2. Run the database schema

1. In your Supabase project: **SQL Editor → New query**
2. Paste in the entire contents of `supabase/schema.sql`, click **Run**
3. Optional: also run `supabase/seed.sql` to get a couple of homepage banners
   for free instead of adding them yourself later

### 3. Get your API credentials

**Settings → API** → copy the **Project URL** and **anon public** key.

### 4. Enable Google sign-in (optional but recommended)

1. In Supabase: **Authentication → Providers → Google** → toggle on
2. Go to https://console.cloud.google.com/apis/credentials, create a project,
   then **Create Credentials → OAuth client ID** (Application type: Web application)
3. Under **Authorized redirect URIs**, paste the callback URL Supabase shows
   on that same screen (looks like `https://xxxxx.supabase.co/auth/v1/callback`)
4. Copy the Client ID + Client Secret Google gives you into Supabase's Google
   provider fields, save

Email OTP (the one-time code login) needs no extra setup — it works out of
the box once your Supabase project exists.

### 5. Configure the app

```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
                        # and the catalog/payment keys below
npm run dev
```

### 6. Create your first admin account

There's no seeded admin account anymore (a real database doesn't get to
cheat with a hardcoded login). Instead:

1. Sign up through the running app once (Google or email code) — this
   creates a normal buyer account
2. In Supabase: **Table Editor → profiles** → find your row → change `role`
   from `buyer` to `admin` → save
3. Sign out and back in — you'll land in the admin panel

### API keys for the catalog/payments

| Service | Where to get a key | Required? |
|---|---|---|
| Supabase | https://supabase.com | **Required** — see steps above |
| TMDB | https://www.themoviedb.org/settings/api | Optional — movies section is empty without it |
| Google Books (comics) | https://developers.google.com/books | Optional — works with no key at all, a key just raises the rate limit |
| Paystack | https://dashboard.paystack.com/#/settings/developer | Optional — checkout will show a config error without it |
| AniList (anime/manga) | none needed | Works out of the box |

## Architecture

```
supabase/
  schema.sql      ← run this once in Supabase's SQL editor: tables, RLS
                    policies, triggers, and the ensure_default_listing()
                    function (see comments inside for what each does)
  seed.sql        ← optional: a couple of starter homepage banners

src/
  services/
    supabaseClient.js    the one Supabase client instance, used everywhere
    authService.js       Google OAuth, email OTP, staff password login,
                          profile (role/status) reads and admin writes
    tmdbService.js       )
    anilistService.js    } external catalog API clients — each normalizes
    googleBooksService.js) to one common item shape
    catalogService.js   the single entry point pages use to browse/search
    listingsService.js  marketplace listings — real Postgres rows now,
                         mapped from snake_case to the camelCase shape
                         every page already expects
    sellerService.js    seller applications + terms acceptance tracking
    ordersService.js    order lifecycle incl. manual admin confirmation
    trustScoreService.js  seller trust score calculation
    recommendationService.js  genre-overlap "if you liked this" engine
    bannersService.js   homepage banners & promo slots
    cartService.js      cart (now synced across devices via Supabase)
    paystackService.js  Paystack Inline integration
  context/AuthContext.jsx   driven by Supabase's real session state
  components/     shared UI (layout, catalog cards, buttons, tables, etc.)
  pages/          route-level screens, including pages/admin/* and pages/staff/*
  data/seed.js    static content: seller terms text, franchise link data
```

**Why every data service maps rows to camelCase:** Supabase/Postgres returns
column names as `snake_case` (`title_id`, `seller_id`, etc.), but the app's
components were written expecting `camelCase` (`titleId`, `sellerId`). Rather
than rewrite every component's field references, each service function maps
the raw response into the same shape it always returned — so the database
swap didn't require touching how pages read their data.

## Known limitations (still honest, even with a real backend now)

- **No server-side Paystack verification.** Checkout still trusts the
  client-side success callback from Paystack Inline. A real production setup
  would add a Supabase Edge Function (or small backend) that calls Paystack's
  `/transaction/verify/:reference` with the secret key before trusting a
  payment. The admin "confirm payment" step remains a manual stand-in for
  that missing check — but it's now backed by a real rule: only an admin
  session can actually flip an order's status (enforced by Postgres Row
  Level Security), so a buyer or seller can't confirm their own order by
  calling the API directly, even if they tried.
- **Staff accounts can't be created with a chosen password from the admin
  panel anymore.** Doing that safely requires Supabase's Admin API, which
  needs a service-role key — and that key must never be shipped in frontend
  JavaScript (anyone could read it from the browser and get full database
  access). The safe flow instead: the person signs up themselves (Google or
  email code, same as any buyer), then an admin promotes their existing
  account to `staff` by email. See `AdminStaff.jsx` and the comment in
  `sellerService.js` for the full reasoning.
- **Franchise cross-linking data is still static**, not a database table —
  it's editorial content the app ships with (see `data/seed.js`), not
  something sellers or admins generate, so it didn't need migrating.
- **Bundle size grew** with the Supabase client library added. Fine for this
  stage; a production build would benefit from code-splitting the heavier
  routes (Vite will warn about this at build time).

## Deploying to Vercel

This repo includes a `vercel.json` with a SPA rewrite rule so client-side
routes (e.g. `/browse/anime`) don't 404 on refresh. Set your environment
variables (the same ones from `.env`) in the Vercel project settings before
deploying. Also add your deployed URL to Supabase's **Authentication → URL
Configuration → Redirect URLs** list, or Google sign-in will redirect back
to `localhost` instead of your live site.
