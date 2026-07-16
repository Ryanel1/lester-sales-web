-- Standalone LesterSales.net publishing foundation.
-- This schema belongs only to the dedicated LesterSales.net Supabase project.

create extension if not exists pgcrypto;

create type public.portal_publication_status as enum ('draft', 'scheduled', 'published', 'archived');
create type public.portal_resource_kind as enum ('catalog', 'pricing', 'program', 'workbook', 'art');
create type public.portal_source_type as enum ('external_url', 'storage_object');
create type public.portal_link_status as enum ('unchecked', 'available', 'warning', 'unavailable');

create or replace function public.portal_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.portal_brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null unique check (length(trim(name)) between 1 and 100),
  nav_label text not null check (length(trim(nav_label)) between 1 and 100),
  short_description text not null default '',
  accent text not null default '#314958' check (accent ~ '^#[0-9a-fA-F]{6}$'),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.portal_catalogs (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.portal_brands(id) on delete restrict,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) between 1 and 180),
  season text not null default '',
  summary text not null default '',
  image_alt text not null default '',
  cover_source_type public.portal_source_type,
  cover_external_url text,
  cover_storage_bucket text,
  cover_storage_path text,
  cover_original_filename text,
  cover_mime_type text,
  cover_byte_size bigint check (cover_byte_size is null or cover_byte_size >= 0),
  cover_sha256 text check (cover_sha256 is null or cover_sha256 ~ '^[0-9a-f]{64}$'),
  status public.portal_publication_status not null default 'draft',
  publish_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, slug),
  constraint portal_catalog_cover_source_check check (
    (cover_source_type is null and cover_external_url is null and cover_storage_bucket is null and cover_storage_path is null)
    or (cover_source_type = 'external_url' and cover_external_url ~ '^https://' and cover_storage_bucket is null and cover_storage_path is null)
    or (cover_source_type = 'storage_object' and cover_external_url is null and length(trim(cover_storage_bucket)) > 0 and length(trim(cover_storage_path)) > 0)
  )
);

create table public.portal_catalog_resources (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.portal_catalogs(id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 180),
  kind public.portal_resource_kind not null,
  source_type public.portal_source_type not null,
  external_url text,
  storage_bucket text,
  storage_path text,
  original_filename text,
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  link_status public.portal_link_status not null default 'unchecked',
  link_checked_at timestamptz,
  source_note text,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portal_catalog_resource_source_check check (
    (source_type = 'external_url' and external_url ~ '^https://' and storage_bucket is null and storage_path is null)
    or (source_type = 'storage_object' and external_url is null and length(trim(storage_bucket)) > 0 and length(trim(storage_path)) > 0)
  )
);

create table public.portal_prebooks (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.portal_brands(id) on delete restrict,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) between 1 and 180),
  season text not null default '',
  image_alt text not null default '',
  deadline timestamptz not null,
  ship_date text not null default '',
  minimums text not null default '',
  details jsonb not null default '[]'::jsonb check (jsonb_typeof(details) = 'array'),
  hero_source_type public.portal_source_type,
  hero_external_url text,
  hero_storage_bucket text,
  hero_storage_path text,
  hero_original_filename text,
  hero_mime_type text,
  hero_byte_size bigint check (hero_byte_size is null or hero_byte_size >= 0),
  hero_sha256 text check (hero_sha256 is null or hero_sha256 ~ '^[0-9a-f]{64}$'),
  status public.portal_publication_status not null default 'draft',
  publish_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, slug),
  constraint portal_prebook_hero_source_check check (
    (hero_source_type is null and hero_external_url is null and hero_storage_bucket is null and hero_storage_path is null)
    or (hero_source_type = 'external_url' and hero_external_url ~ '^https://' and hero_storage_bucket is null and hero_storage_path is null)
    or (hero_source_type = 'storage_object' and hero_external_url is null and length(trim(hero_storage_bucket)) > 0 and length(trim(hero_storage_path)) > 0)
  )
);

create table public.portal_prebook_resources (
  id uuid primary key default gen_random_uuid(),
  prebook_id uuid not null references public.portal_prebooks(id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 180),
  kind public.portal_resource_kind not null,
  source_type public.portal_source_type not null,
  external_url text,
  storage_bucket text,
  storage_path text,
  original_filename text,
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  link_status public.portal_link_status not null default 'unchecked',
  link_checked_at timestamptz,
  source_note text,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portal_prebook_resource_source_check check (
    (source_type = 'external_url' and external_url ~ '^https://' and storage_bucket is null and storage_path is null)
    or (source_type = 'storage_object' and external_url is null and length(trim(storage_bucket)) > 0 and length(trim(storage_path)) > 0)
  )
);

create table public.portal_art_groups (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.portal_brands(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 180),
  status public.portal_publication_status not null default 'draft',
  publish_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, title)
);

create table public.portal_art_resources (
  id uuid primary key default gen_random_uuid(),
  art_group_id uuid not null references public.portal_art_groups(id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 180),
  kind public.portal_resource_kind not null default 'art' check (kind = 'art'),
  source_type public.portal_source_type not null,
  external_url text,
  storage_bucket text,
  storage_path text,
  original_filename text,
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  link_status public.portal_link_status not null default 'unchecked',
  link_checked_at timestamptz,
  source_note text,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portal_art_resource_source_check check (
    (source_type = 'external_url' and external_url ~ '^https://' and storage_bucket is null and storage_path is null)
    or (source_type = 'storage_object' and external_url is null and length(trim(storage_bucket)) > 0 and length(trim(storage_path)) > 0)
  )
);

create index portal_brands_order_idx on public.portal_brands(display_order, name);
create index portal_catalogs_publication_idx on public.portal_catalogs(brand_id, status, publish_at, display_order);
create index portal_catalog_resources_order_idx on public.portal_catalog_resources(catalog_id, display_order);
create index portal_prebooks_publication_idx on public.portal_prebooks(brand_id, status, publish_at, deadline, display_order);
create index portal_prebook_resources_order_idx on public.portal_prebook_resources(prebook_id, display_order);
create index portal_art_groups_publication_idx on public.portal_art_groups(brand_id, status, publish_at, display_order);
create index portal_art_resources_order_idx on public.portal_art_resources(art_group_id, display_order);

create trigger portal_brands_set_updated_at before update on public.portal_brands
for each row execute function public.portal_set_updated_at();
create trigger portal_catalogs_set_updated_at before update on public.portal_catalogs
for each row execute function public.portal_set_updated_at();
create trigger portal_catalog_resources_set_updated_at before update on public.portal_catalog_resources
for each row execute function public.portal_set_updated_at();
create trigger portal_prebooks_set_updated_at before update on public.portal_prebooks
for each row execute function public.portal_set_updated_at();
create trigger portal_prebook_resources_set_updated_at before update on public.portal_prebook_resources
for each row execute function public.portal_set_updated_at();
create trigger portal_art_groups_set_updated_at before update on public.portal_art_groups
for each row execute function public.portal_set_updated_at();
create trigger portal_art_resources_set_updated_at before update on public.portal_art_resources
for each row execute function public.portal_set_updated_at();

alter table public.portal_brands enable row level security;
alter table public.portal_catalogs enable row level security;
alter table public.portal_catalog_resources enable row level security;
alter table public.portal_prebooks enable row level security;
alter table public.portal_prebook_resources enable row level security;
alter table public.portal_art_groups enable row level security;
alter table public.portal_art_resources enable row level security;

revoke all on public.portal_brands from anon, authenticated;
revoke all on public.portal_catalogs from anon, authenticated;
revoke all on public.portal_catalog_resources from anon, authenticated;
revoke all on public.portal_prebooks from anon, authenticated;
revoke all on public.portal_prebook_resources from anon, authenticated;
revoke all on public.portal_art_groups from anon, authenticated;
revoke all on public.portal_art_resources from anon, authenticated;

grant all on public.portal_brands to service_role;
grant all on public.portal_catalogs to service_role;
grant all on public.portal_catalog_resources to service_role;
grant all on public.portal_prebooks to service_role;
grant all on public.portal_prebook_resources to service_role;
grant all on public.portal_art_groups to service_role;
grant all on public.portal_art_resources to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('portal-documents', 'portal-documents', false, 104857600, array['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'application/zip']),
  ('portal-media', 'portal-media', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into public.portal_brands (slug, name, nav_label, short_description, accent, display_order)
values
  ('champion', 'Champion', 'Champion', 'Current collegiate apparel, program pricing, art collections, and limited-time booking opportunities.', '#c41230', 10),
  ('gear-comfortwash', 'Gear & ComfortWash', 'Gear & ComfortWash', 'Collegiate and school apparel from Gear for Sports, plus garment-dyed ComfortWash collections and art programs.', '#9d6b3f', 20),
  ('under-armour', 'Under Armour', 'Under Armour', 'Collegiate performance apparel, headwear, accessories, pricing, and seasonal programs.', '#b5212c', 30),
  ('pro-sports', 'Pro Sports', 'Pro Sports', 'Licensed professional-team programs gathered across brands in one clear destination.', '#244c84', 40)
on conflict (slug) do update set
  name = excluded.name,
  nav_label = excluded.nav_label,
  short_description = excluded.short_description,
  accent = excluded.accent,
  display_order = excluded.display_order;
