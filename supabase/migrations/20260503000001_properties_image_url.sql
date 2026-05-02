-- properties.image_url — add a nullable text column for the FINN listing's
-- primary image URL.
--
-- Owned by the `properties-finn-import` capability. We only store the URL
-- (pointing at FINN's CDN). No image is downloaded or cached on our side;
-- if FINN expires or moves the URL the property card falls back to the
-- placeholder. A separate `properties-images` capability will own user-
-- uploaded photos in Supabase Storage.
--
-- Idempotent so the migration is safe to re-run on environments that
-- already pulled the column in via an earlier branch.

alter table public.properties
    add column if not exists image_url text;

comment on column public.properties.image_url is
    'Primary image URL for the listing. Populated by the FINN parser when '
    'available; otherwise NULL. Not downloaded — only referenced.';
