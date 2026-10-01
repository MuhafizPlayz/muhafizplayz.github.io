-- =====================================================================
-- MUHAFIZ PLAYZ — Supabase schema (run ONCE in Supabase > SQL Editor)
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- PROFILES + ADMIN ROLE ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('admin','user')),
  created_at timestamptz not null default now()
);

-- Creates a 'user' profile automatically for every new auth account.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role) values (new.id, new.email, 'user')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Back-fill profiles for accounts created before this script ran.
insert into public.profiles (id, email)
  select id, email from auth.users on conflict (id) do nothing;

-- True only when the current logged-in user has role = 'admin'.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- TABLES ----------
create table if not exists public.site_settings (
  id int primary key default 1 check (id = 1),
  site_name text not null default 'Muhafız Playz',
  tagline text default 'Turkish dramas and more',
  logo_url text,
  favicon_url text,
  site_url text,
  site_title text default 'Muhafız Playz',
  default_description text default 'Muhafız Playz — watch-ready details and authorized downloads for Turkish dramas and movies.',
  default_social_image text,
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null unique check (platform in ('facebook','whatsapp','whatsapp_channel','instagram','tiktok','telegram','youtube')),
  url text check (url is null or url = '' or url ~* '^https?://'),
  enabled boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.social_links (platform, sort_order) values
  ('facebook',1),('whatsapp',2),('whatsapp_channel',3),('instagram',4),('tiktok',5),('telegram',6),('youtube',7)
on conflict (platform) do nothing;

create table if not exists public.contact_settings (
  id int primary key default 1 check (id = 1),
  whatsapp_number text,              -- digits with country code, e.g. 923001234567
  email text,
  contact_text text default 'Questions, partnerships or copyright requests? Get in touch.',
  show_whatsapp_button boolean not null default true,
  show_telegram_button boolean not null default true,
  telegram_url text check (telegram_url is null or telegram_url = '' or telegram_url ~* '^https?://'),
  updated_at timestamptz not null default now()
);
insert into public.contact_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order int not null default 0,
  show_in_nav boolean not null default false,
  show_on_home boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.dramas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  poster_url text,
  backdrop_url text,
  category_id uuid references public.categories(id) on delete set null,
  kind text not null default 'series' check (kind in ('series','movie')),
  language text,
  subtitle text,
  status text not null default 'ongoing' check (status in ('ongoing','completed','coming_soon')),
  featured boolean not null default false,
  published boolean not null default false,
  release_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dramas_category_idx on public.dramas(category_id);
create index if not exists dramas_published_idx on public.dramas(published, created_at desc);
create index if not exists dramas_featured_idx on public.dramas(featured) where featured;

create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  drama_id uuid not null references public.dramas(id) on delete cascade,
  season_number int not null default 1 check (season_number > 0),
  episode_number int not null check (episode_number > 0),
  title text,
  description text,
  thumbnail_url text,
  release_date date,
  status text not null default 'available' check (status in ('available','coming_soon')),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (drama_id, season_number, episode_number)
);
create index if not exists episodes_drama_idx on public.episodes(drama_id, season_number, episode_number);
create index if not exists episodes_created_idx on public.episodes(created_at desc);

create table if not exists public.episode_downloads (
  episode_id uuid primary key references public.episodes(id) on delete cascade,
  quality_180p text, quality_360p text, quality_480p text, quality_720p text, quality_1080p text,
  updated_at timestamptz not null default now(),
  constraint dl_urls_valid check (
    (quality_180p  is null or quality_180p  = '' or quality_180p  ~* '^https?://') and
    (quality_360p  is null or quality_360p  = '' or quality_360p  ~* '^https?://') and
    (quality_480p  is null or quality_480p  = '' or quality_480p  ~* '^https?://') and
    (quality_720p  is null or quality_720p  = '' or quality_720p  ~* '^https?://') and
    (quality_1080p is null or quality_1080p = '' or quality_1080p ~* '^https?://'))
);

create table if not exists public.advertisements (
  id uuid primary key default gen_random_uuid(),
  slot text not null unique check (slot in ('header','home_top','home_middle','home_bottom','drama_page','episode_page')),
  label text,
  enabled boolean not null default false,
  code text,                          -- paste legitimate ad-network code here (admin only)
  updated_at timestamptz not null default now()
);
insert into public.advertisements (slot, label) values
  ('header','Header Ad'),('home_top','Home Top Ad'),('home_middle','Home Middle Ad'),
  ('home_bottom','Home Bottom Ad'),('drama_page','Drama Page Ad'),('episode_page','Episode Page Ad')
on conflict (slot) do nothing;

-- Keep updated_at fresh.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
do $$ declare t text; begin
  foreach t in array array['site_settings','social_links','contact_settings','dramas','episodes','episode_downloads','advertisements'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s; create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at();', t);
  end loop; end $$;

-- ---------- ROW LEVEL SECURITY ----------
alter table public.profiles          enable row level security;
alter table public.site_settings     enable row level security;
alter table public.social_links      enable row level security;
alter table public.contact_settings  enable row level security;
alter table public.categories        enable row level security;
alter table public.dramas            enable row level security;
alter table public.episodes          enable row level security;
alter table public.episode_downloads enable row level security;
alter table public.advertisements    enable row level security;

-- profiles: a user sees their own row; admins see/update all. Nobody can insert/delete from the browser.
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

-- Public read of settings
drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read" on public.site_settings for select using (true);
drop policy if exists "site_settings_admin_write" on public.site_settings;
create policy "site_settings_admin_write" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "social_links_public_read" on public.social_links;
create policy "social_links_public_read" on public.social_links for select using (enabled = true or public.is_admin());
drop policy if exists "social_links_admin_write" on public.social_links;
create policy "social_links_admin_write" on public.social_links for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "contact_settings_public_read" on public.contact_settings;
create policy "contact_settings_public_read" on public.contact_settings for select using (true);
drop policy if exists "contact_settings_admin_write" on public.contact_settings;
create policy "contact_settings_admin_write" on public.contact_settings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories for select using (true);
drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write" on public.categories for all using (public.is_admin()) with check (public.is_admin());

-- Dramas: public sees published only; admin sees everything.
drop policy if exists "dramas_public_read" on public.dramas;
create policy "dramas_public_read" on public.dramas for select using (published = true or public.is_admin());
drop policy if exists "dramas_admin_write" on public.dramas;
create policy "dramas_admin_write" on public.dramas for all using (public.is_admin()) with check (public.is_admin());

-- Episodes: public sees published episodes of published dramas.
drop policy if exists "episodes_public_read" on public.episodes;
create policy "episodes_public_read" on public.episodes for select using (
  public.is_admin() or (published = true and exists (select 1 from public.dramas d where d.id = episodes.drama_id and d.published = true)));
drop policy if exists "episodes_admin_write" on public.episodes;
create policy "episodes_admin_write" on public.episodes for all using (public.is_admin()) with check (public.is_admin());

-- Download links: public sees links only for available, published episodes of published dramas.
drop policy if exists "downloads_public_read" on public.episode_downloads;
create policy "downloads_public_read" on public.episode_downloads for select using (
  public.is_admin() or exists (
    select 1 from public.episodes e join public.dramas d on d.id = e.drama_id
    where e.id = episode_downloads.episode_id and e.published and e.status = 'available' and d.published));
drop policy if exists "downloads_admin_write" on public.episode_downloads;
create policy "downloads_admin_write" on public.episode_downloads for all using (public.is_admin()) with check (public.is_admin());

-- Ads: public reads only enabled slots; admin manages.
drop policy if exists "ads_public_read" on public.advertisements;
create policy "ads_public_read" on public.advertisements for select using (enabled = true or public.is_admin());
drop policy if exists "ads_admin_write" on public.advertisements;
create policy "ads_admin_write" on public.advertisements for all using (public.is_admin()) with check (public.is_admin());

-- ---------- STORAGE (public bucket for posters, logo, favicon) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-assets','site-assets', true, 2097152, array['image/jpeg','image/png','image/webp','image/gif','image/x-icon','image/vnd.microsoft.icon'])
on conflict (id) do update set public = true, file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/x-icon','image/vnd.microsoft.icon'];

drop policy if exists "assets_public_read" on storage.objects;
create policy "assets_public_read" on storage.objects for select using (bucket_id = 'site-assets');
drop policy if exists "assets_admin_insert" on storage.objects;
create policy "assets_admin_insert" on storage.objects for insert to authenticated with check (bucket_id = 'site-assets' and public.is_admin());
drop policy if exists "assets_admin_update" on storage.objects;
create policy "assets_admin_update" on storage.objects for update to authenticated using (bucket_id = 'site-assets' and public.is_admin());
drop policy if exists "assets_admin_delete" on storage.objects;
create policy "assets_admin_delete" on storage.objects for delete to authenticated using (bucket_id = 'site-assets' and public.is_admin());

-- ---------- MAKE YOURSELF ADMIN (run AFTER creating your user) ----------
-- update public.profiles set role = 'admin' where email = 'YOUR_ADMIN_EMAIL_HERE';
