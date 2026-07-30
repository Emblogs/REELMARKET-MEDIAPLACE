-- Optional: run this after schema.sql if you want the homepage hero to have
-- something in it right away. You can also just add banners yourself later
-- through Admin → Banners & Ads once you have an admin account.

insert into public.banners (title, subtitle, image_url, link_to, active, display_order)
values
  (
    'New arrivals this week',
    'Fresh listings from approved sellers across movies, anime, manga & comics',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1600&auto=format&fit=crop',
    '/browse/movie',
    true,
    1
  ),
  (
    'Trade, don''t just buy',
    'Swap manga and comics directly with other collectors',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1600&auto=format&fit=crop',
    '/browse/comic',
    true,
    2
  );
