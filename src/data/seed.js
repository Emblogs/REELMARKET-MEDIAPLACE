export const SELLER_TERMS_VERSION = '1.0';

export const SELLER_TERMS_TEXT = `
Seller Agreement

1. Approval: All seller applications and item listings are reviewed by an
   administrator before appearing on the marketplace. Approval is at the
   admin's discretion.

2. Accurate listings: You agree to list items you genuinely intend to sell
   or trade, with honest condition, pricing, and availability.

3. Fulfilment: Orders must be confirmed and fulfilled in good faith. Your
   seller trust score is calculated from how reliably you do this.

4. Payments: Payments are processed via Paystack. Payouts to sellers are
   handled outside the marketplace platform directly between the parties
   involved, according to ReelMarket's payout schedule.

5. Conduct: Accounts found violating these terms may be suspended or banned
   by an administrator at any time.

6. Changes: ReelMarket may update these terms from time to time. Continued
   use of your seller account after changes take effect constitutes
   acceptance of the updated terms.
`.trim();

/**
 * Cross-media franchise links — kept as static local data (not a database
 * table) since this is editorial content the app ships with, not something
 * sellers/admins generate. This is what backs the "cross-media franchise
 * linking" differentiator: each entry ties together items across sources
 * (TMDB / AniList / Google Books) that belong to the same fictional universe,
 * plus optional watch/read order notes.
 */
const FRANCHISES = [
  {
    id: 'franchise_naruto',
    name: 'Naruto',
    description:
      'Ninja franchise spanning the original manga, the anime adaptation, and spin-off material.',
    coverImage:
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800&auto=format&fit=crop',
    links: {
      anime: { anilistId: 20, title: 'Naruto' },
      manga: { anilistId: 11, title: 'Naruto' },
    },
    watchOrder: [
      { step: 1, label: 'Naruto (2002) — episodes 1\u2013220' },
      { step: 2, label: 'Naruto: Shippuden — episodes 1\u2013500' },
      { step: 3, label: 'Boruto: Naruto Next Generations (sequel)' },
    ],
    readOrder: [
      { step: 1, label: 'Naruto manga, chapters 1\u2013700' },
      { step: 2, label: 'Boruto manga (sequel)' },
    ],
  },
  {
    id: 'franchise_spiderman',
    name: 'Spider-Man',
    description: 'Comics and film adaptations following Peter Parker.',
    coverImage:
      'https://images.unsplash.com/photo-1635805737707-575885ab0820?q=80&w=800&auto=format&fit=crop',
    links: {
      movie: { tmdbQuery: 'Spider-Man' },
      comic: { comicVineQuery: 'Amazing Spider-Man' },
    },
    watchOrder: [
      { step: 1, label: 'Spider-Man: Into the Spider-Verse' },
      { step: 2, label: 'Spider-Man: Across the Spider-Verse' },
    ],
    readOrder: [{ step: 1, label: 'The Amazing Spider-Man (2018 run)' }],
  },
];

export function getFranchises() {
  return FRANCHISES;
}
