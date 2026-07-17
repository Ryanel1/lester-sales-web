-- Atomic publishing, durable customer-access throttling, and managed-object safety.
-- This migration belongs only to the dedicated LesterSales.net Supabase project.

create table public.portal_access_attempts (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  window_reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index portal_access_attempts_reset_idx
  on public.portal_access_attempts(window_reset_at);

alter table public.portal_access_attempts enable row level security;
revoke all on public.portal_access_attempts from anon, authenticated;
grant all on public.portal_access_attempts to service_role;

create or replace function public.portal_access_is_blocked(
  p_key_hash text,
  p_now timestamptz default now(),
  p_max_attempts integer default 8
)
returns boolean
language sql
security invoker
set search_path = public
as $$
  select coalesce((
    select attempt_count >= greatest(p_max_attempts, 1)
    from public.portal_access_attempts
    where key_hash = p_key_hash
      and window_reset_at > p_now
  ), false);
$$;

create or replace function public.portal_record_access_failure(
  p_key_hash text,
  p_now timestamptz default now(),
  p_window_seconds integer default 600,
  p_max_attempts integer default 8
)
returns table(attempt_count integer, window_reset_at timestamptz, blocked boolean)
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid access-attempt key';
  end if;

  delete from public.portal_access_attempts
  where portal_access_attempts.window_reset_at < p_now - interval '1 day';

  return query
  insert into public.portal_access_attempts as attempts (
    key_hash,
    attempt_count,
    window_reset_at,
    updated_at
  )
  values (
    p_key_hash,
    1,
    p_now + make_interval(secs => greatest(p_window_seconds, 60)),
    p_now
  )
  on conflict (key_hash) do update set
    attempt_count = case
      when attempts.window_reset_at <= p_now then 1
      else attempts.attempt_count + 1
    end,
    window_reset_at = case
      when attempts.window_reset_at <= p_now
        then p_now + make_interval(secs => greatest(p_window_seconds, 60))
      else attempts.window_reset_at
    end,
    updated_at = p_now
  returning
    attempts.attempt_count,
    attempts.window_reset_at,
    attempts.attempt_count >= greatest(p_max_attempts, 1);
end;
$$;

create or replace function public.portal_clear_access_failures(p_key_hash text)
returns void
language sql
security invoker
set search_path = public
as $$
  delete from public.portal_access_attempts where key_hash = p_key_hash;
$$;

create or replace function public.portal_save_catalog(
  p_id uuid,
  p_record jsonb,
  p_resources jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  saved_id uuid := p_id;
  next_order integer;
begin
  if jsonb_typeof(p_record) <> 'object' or jsonb_typeof(p_resources) <> 'array' then
    raise exception 'Catalog payload is invalid';
  end if;

  if saved_id is null then
    perform pg_advisory_xact_lock(hashtextextended('portal_catalogs:' || (p_record->>'brand_id'), 0));
    select coalesce(max(display_order), 0) + 10 into next_order
    from public.portal_catalogs
    where brand_id = (p_record->>'brand_id')::uuid;

    insert into public.portal_catalogs (
      brand_id, slug, title, season, summary, image_alt,
      cover_source_type, cover_external_url, cover_storage_bucket, cover_storage_path,
      cover_original_filename, cover_mime_type, cover_byte_size,
      status, publish_at, published_at, archived_at, display_order
    ) values (
      (p_record->>'brand_id')::uuid,
      p_record->>'slug', p_record->>'title', coalesce(p_record->>'season', ''),
      coalesce(p_record->>'summary', ''), coalesce(p_record->>'image_alt', ''),
      nullif(p_record->>'cover_source_type', '')::public.portal_source_type,
      nullif(p_record->>'cover_external_url', ''), nullif(p_record->>'cover_storage_bucket', ''),
      nullif(p_record->>'cover_storage_path', ''), nullif(p_record->>'cover_original_filename', ''),
      nullif(p_record->>'cover_mime_type', ''), nullif(p_record->>'cover_byte_size', '')::bigint,
      coalesce(nullif(p_record->>'status', ''), 'draft')::public.portal_publication_status,
      nullif(p_record->>'publish_at', '')::timestamptz,
      nullif(p_record->>'published_at', '')::timestamptz,
      nullif(p_record->>'archived_at', '')::timestamptz,
      next_order
    ) returning id into saved_id;
  else
    update public.portal_catalogs set
      brand_id = (p_record->>'brand_id')::uuid,
      slug = p_record->>'slug',
      title = p_record->>'title',
      season = coalesce(p_record->>'season', ''),
      summary = coalesce(p_record->>'summary', ''),
      image_alt = coalesce(p_record->>'image_alt', ''),
      cover_source_type = nullif(p_record->>'cover_source_type', '')::public.portal_source_type,
      cover_external_url = nullif(p_record->>'cover_external_url', ''),
      cover_storage_bucket = nullif(p_record->>'cover_storage_bucket', ''),
      cover_storage_path = nullif(p_record->>'cover_storage_path', ''),
      cover_original_filename = nullif(p_record->>'cover_original_filename', ''),
      cover_mime_type = nullif(p_record->>'cover_mime_type', ''),
      cover_byte_size = nullif(p_record->>'cover_byte_size', '')::bigint,
      status = coalesce(nullif(p_record->>'status', ''), 'draft')::public.portal_publication_status,
      publish_at = nullif(p_record->>'publish_at', '')::timestamptz,
      published_at = nullif(p_record->>'published_at', '')::timestamptz,
      archived_at = nullif(p_record->>'archived_at', '')::timestamptz
    where id = saved_id;
    if not found then raise no_data_found using message = 'Catalog not found'; end if;
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_resources) as input(id uuid)
    join public.portal_catalog_resources existing on existing.id = input.id
    where existing.catalog_id <> saved_id
  ) then
    raise exception 'A catalog resource belongs to another catalog';
  end if;

  delete from public.portal_catalog_resources existing
  where existing.catalog_id = saved_id
    and not exists (
      select 1 from jsonb_to_recordset(p_resources) as input(id uuid)
      where input.id = existing.id
    );

  insert into public.portal_catalog_resources (
    id, catalog_id, label, kind, source_type, external_url, storage_bucket, storage_path,
    original_filename, mime_type, byte_size, link_status, link_checked_at, display_order
  )
  select
    coalesce(input.id, gen_random_uuid()), saved_id, input.label,
    input.kind::public.portal_resource_kind, input.source_type::public.portal_source_type,
    input.external_url, input.storage_bucket, input.storage_path, input.original_filename,
    input.mime_type, input.byte_size,
    coalesce(input.link_status, 'unchecked')::public.portal_link_status,
    input.link_checked_at, input.display_order
  from jsonb_to_recordset(p_resources) as input(
    id uuid, label text, kind text, source_type text, external_url text,
    storage_bucket text, storage_path text, original_filename text, mime_type text,
    byte_size bigint, link_status text, link_checked_at timestamptz, display_order integer
  )
  on conflict (id) do update set
    label = excluded.label,
    kind = excluded.kind,
    source_type = excluded.source_type,
    external_url = excluded.external_url,
    storage_bucket = excluded.storage_bucket,
    storage_path = excluded.storage_path,
    original_filename = excluded.original_filename,
    mime_type = excluded.mime_type,
    byte_size = excluded.byte_size,
    link_status = excluded.link_status,
    link_checked_at = excluded.link_checked_at,
    display_order = excluded.display_order;

  return saved_id;
end;
$$;

create or replace function public.portal_save_prebook(
  p_id uuid,
  p_record jsonb,
  p_resources jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  saved_id uuid := p_id;
  next_order integer;
begin
  if jsonb_typeof(p_record) <> 'object' or jsonb_typeof(p_resources) <> 'array' then
    raise exception 'Prebook payload is invalid';
  end if;

  if saved_id is null then
    perform pg_advisory_xact_lock(hashtextextended('portal_prebooks:' || (p_record->>'brand_id'), 0));
    select coalesce(max(display_order), 0) + 10 into next_order
    from public.portal_prebooks where brand_id = (p_record->>'brand_id')::uuid;
    insert into public.portal_prebooks (
      brand_id, slug, title, season, image_alt, deadline, ship_date, minimums, details,
      hero_source_type, hero_external_url, hero_storage_bucket, hero_storage_path,
      hero_original_filename, hero_mime_type, hero_byte_size,
      status, publish_at, published_at, archived_at, display_order
    ) values (
      (p_record->>'brand_id')::uuid,
      p_record->>'slug', p_record->>'title', coalesce(p_record->>'season', ''),
      coalesce(p_record->>'image_alt', ''), (p_record->>'deadline')::timestamptz,
      coalesce(p_record->>'ship_date', ''), coalesce(p_record->>'minimums', ''),
      coalesce(p_record->'details', '[]'::jsonb),
      nullif(p_record->>'hero_source_type', '')::public.portal_source_type,
      nullif(p_record->>'hero_external_url', ''), nullif(p_record->>'hero_storage_bucket', ''),
      nullif(p_record->>'hero_storage_path', ''), nullif(p_record->>'hero_original_filename', ''),
      nullif(p_record->>'hero_mime_type', ''), nullif(p_record->>'hero_byte_size', '')::bigint,
      coalesce(nullif(p_record->>'status', ''), 'draft')::public.portal_publication_status,
      nullif(p_record->>'publish_at', '')::timestamptz,
      nullif(p_record->>'published_at', '')::timestamptz,
      nullif(p_record->>'archived_at', '')::timestamptz,
      next_order
    ) returning id into saved_id;
  else
    update public.portal_prebooks set
      brand_id = (p_record->>'brand_id')::uuid,
      slug = p_record->>'slug', title = p_record->>'title',
      season = coalesce(p_record->>'season', ''), image_alt = coalesce(p_record->>'image_alt', ''),
      deadline = (p_record->>'deadline')::timestamptz,
      ship_date = coalesce(p_record->>'ship_date', ''), minimums = coalesce(p_record->>'minimums', ''),
      details = coalesce(p_record->'details', '[]'::jsonb),
      hero_source_type = nullif(p_record->>'hero_source_type', '')::public.portal_source_type,
      hero_external_url = nullif(p_record->>'hero_external_url', ''),
      hero_storage_bucket = nullif(p_record->>'hero_storage_bucket', ''),
      hero_storage_path = nullif(p_record->>'hero_storage_path', ''),
      hero_original_filename = nullif(p_record->>'hero_original_filename', ''),
      hero_mime_type = nullif(p_record->>'hero_mime_type', ''),
      hero_byte_size = nullif(p_record->>'hero_byte_size', '')::bigint,
      status = coalesce(nullif(p_record->>'status', ''), 'draft')::public.portal_publication_status,
      publish_at = nullif(p_record->>'publish_at', '')::timestamptz,
      published_at = nullif(p_record->>'published_at', '')::timestamptz,
      archived_at = nullif(p_record->>'archived_at', '')::timestamptz
    where id = saved_id;
    if not found then raise no_data_found using message = 'Prebook not found'; end if;
  end if;

  if exists (
    select 1 from jsonb_to_recordset(p_resources) as input(id uuid)
    join public.portal_prebook_resources existing on existing.id = input.id
    where existing.prebook_id <> saved_id
  ) then raise exception 'A prebook resource belongs to another prebook'; end if;

  delete from public.portal_prebook_resources existing
  where existing.prebook_id = saved_id
    and not exists (
      select 1 from jsonb_to_recordset(p_resources) as input(id uuid)
      where input.id = existing.id
    );

  insert into public.portal_prebook_resources (
    id, prebook_id, label, kind, source_type, external_url, storage_bucket, storage_path,
    original_filename, mime_type, byte_size, link_status, link_checked_at, display_order
  )
  select
    coalesce(input.id, gen_random_uuid()), saved_id, input.label,
    input.kind::public.portal_resource_kind, input.source_type::public.portal_source_type,
    input.external_url, input.storage_bucket, input.storage_path, input.original_filename,
    input.mime_type, input.byte_size,
    coalesce(input.link_status, 'unchecked')::public.portal_link_status,
    input.link_checked_at, input.display_order
  from jsonb_to_recordset(p_resources) as input(
    id uuid, label text, kind text, source_type text, external_url text,
    storage_bucket text, storage_path text, original_filename text, mime_type text,
    byte_size bigint, link_status text, link_checked_at timestamptz, display_order integer
  )
  on conflict (id) do update set
    label = excluded.label, kind = excluded.kind, source_type = excluded.source_type,
    external_url = excluded.external_url, storage_bucket = excluded.storage_bucket,
    storage_path = excluded.storage_path, original_filename = excluded.original_filename,
    mime_type = excluded.mime_type, byte_size = excluded.byte_size,
    link_status = excluded.link_status, link_checked_at = excluded.link_checked_at,
    display_order = excluded.display_order;

  return saved_id;
end;
$$;

create or replace function public.portal_save_art_group(
  p_id uuid,
  p_record jsonb,
  p_resources jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  saved_id uuid := p_id;
  next_order integer;
begin
  if jsonb_typeof(p_record) <> 'object' or jsonb_typeof(p_resources) <> 'array' then
    raise exception 'Art group payload is invalid';
  end if;

  if saved_id is null then
    perform pg_advisory_xact_lock(hashtextextended('portal_art_groups:' || (p_record->>'brand_id'), 0));
    select coalesce(max(display_order), 0) + 10 into next_order
    from public.portal_art_groups where brand_id = (p_record->>'brand_id')::uuid;
    insert into public.portal_art_groups (
      brand_id, title, status, publish_at, published_at, archived_at, display_order
    ) values (
      (p_record->>'brand_id')::uuid, p_record->>'title',
      coalesce(nullif(p_record->>'status', ''), 'draft')::public.portal_publication_status,
      nullif(p_record->>'publish_at', '')::timestamptz,
      nullif(p_record->>'published_at', '')::timestamptz,
      nullif(p_record->>'archived_at', '')::timestamptz,
      next_order
    ) returning id into saved_id;
  else
    update public.portal_art_groups set
      brand_id = (p_record->>'brand_id')::uuid,
      title = p_record->>'title',
      status = coalesce(nullif(p_record->>'status', ''), 'draft')::public.portal_publication_status,
      publish_at = nullif(p_record->>'publish_at', '')::timestamptz,
      published_at = nullif(p_record->>'published_at', '')::timestamptz,
      archived_at = nullif(p_record->>'archived_at', '')::timestamptz
    where id = saved_id;
    if not found then raise no_data_found using message = 'Art group not found'; end if;
  end if;

  if exists (
    select 1 from jsonb_to_recordset(p_resources) as input(id uuid)
    join public.portal_art_resources existing on existing.id = input.id
    where existing.art_group_id <> saved_id
  ) then raise exception 'An art resource belongs to another art group'; end if;

  delete from public.portal_art_resources existing
  where existing.art_group_id = saved_id
    and not exists (
      select 1 from jsonb_to_recordset(p_resources) as input(id uuid)
      where input.id = existing.id
    );

  insert into public.portal_art_resources (
    id, art_group_id, label, kind, source_type, external_url, storage_bucket, storage_path,
    original_filename, mime_type, byte_size, link_status, link_checked_at, display_order
  )
  select
    coalesce(input.id, gen_random_uuid()), saved_id, input.label, 'art'::public.portal_resource_kind,
    input.source_type::public.portal_source_type, input.external_url, input.storage_bucket,
    input.storage_path, input.original_filename, input.mime_type, input.byte_size,
    coalesce(input.link_status, 'unchecked')::public.portal_link_status,
    input.link_checked_at, input.display_order
  from jsonb_to_recordset(p_resources) as input(
    id uuid, label text, source_type text, external_url text, storage_bucket text,
    storage_path text, original_filename text, mime_type text, byte_size bigint,
    link_status text, link_checked_at timestamptz, display_order integer
  )
  on conflict (id) do update set
    label = excluded.label, source_type = excluded.source_type,
    external_url = excluded.external_url, storage_bucket = excluded.storage_bucket,
    storage_path = excluded.storage_path, original_filename = excluded.original_filename,
    mime_type = excluded.mime_type, byte_size = excluded.byte_size,
    link_status = excluded.link_status, link_checked_at = excluded.link_checked_at,
    display_order = excluded.display_order;

  return saved_id;
end;
$$;

create or replace function public.portal_reorder_catalog(p_id uuid, p_direction text)
returns text language plpgsql security invoker set search_path = public as $$
declare current_row public.portal_catalogs%rowtype; adjacent_row public.portal_catalogs%rowtype;
begin
  if p_direction not in ('up', 'down') then raise exception 'Invalid reorder direction'; end if;
  select * into current_row from public.portal_catalogs where id = p_id for update;
  if not found then raise no_data_found using message = 'Catalog not found'; end if;
  if p_direction = 'up' then
    select * into adjacent_row from public.portal_catalogs
    where brand_id = current_row.brand_id and display_order < current_row.display_order
    order by display_order desc limit 1 for update;
  else
    select * into adjacent_row from public.portal_catalogs
    where brand_id = current_row.brand_id and display_order > current_row.display_order
    order by display_order limit 1 for update;
  end if;
  if adjacent_row.id is null then return 'unchanged'; end if;
  update public.portal_catalogs set display_order = case
    when id = current_row.id then adjacent_row.display_order else current_row.display_order end
  where id in (current_row.id, adjacent_row.id);
  return 'reordered';
end; $$;

create or replace function public.portal_reorder_prebook(p_id uuid, p_direction text)
returns text language plpgsql security invoker set search_path = public as $$
declare current_row public.portal_prebooks%rowtype; adjacent_row public.portal_prebooks%rowtype;
begin
  if p_direction not in ('up', 'down') then raise exception 'Invalid reorder direction'; end if;
  select * into current_row from public.portal_prebooks where id = p_id for update;
  if not found then raise no_data_found using message = 'Prebook not found'; end if;
  if p_direction = 'up' then
    select * into adjacent_row from public.portal_prebooks
    where brand_id = current_row.brand_id and display_order < current_row.display_order
    order by display_order desc limit 1 for update;
  else
    select * into adjacent_row from public.portal_prebooks
    where brand_id = current_row.brand_id and display_order > current_row.display_order
    order by display_order limit 1 for update;
  end if;
  if adjacent_row.id is null then return 'unchanged'; end if;
  update public.portal_prebooks set display_order = case
    when id = current_row.id then adjacent_row.display_order else current_row.display_order end
  where id in (current_row.id, adjacent_row.id);
  return 'reordered';
end; $$;

create or replace function public.portal_reorder_art_group(p_id uuid, p_direction text)
returns text language plpgsql security invoker set search_path = public as $$
declare current_row public.portal_art_groups%rowtype; adjacent_row public.portal_art_groups%rowtype;
begin
  if p_direction not in ('up', 'down') then raise exception 'Invalid reorder direction'; end if;
  select * into current_row from public.portal_art_groups where id = p_id for update;
  if not found then raise no_data_found using message = 'Art group not found'; end if;
  if p_direction = 'up' then
    select * into adjacent_row from public.portal_art_groups
    where brand_id = current_row.brand_id and display_order < current_row.display_order
    order by display_order desc limit 1 for update;
  else
    select * into adjacent_row from public.portal_art_groups
    where brand_id = current_row.brand_id and display_order > current_row.display_order
    order by display_order limit 1 for update;
  end if;
  if adjacent_row.id is null then return 'unchanged'; end if;
  update public.portal_art_groups set display_order = case
    when id = current_row.id then adjacent_row.display_order else current_row.display_order end
  where id in (current_row.id, adjacent_row.id);
  return 'reordered';
end; $$;

create or replace function public.portal_storage_object_is_referenced(p_bucket text, p_path text)
returns boolean
language sql
security invoker
set search_path = public
as $$
  select
    exists(select 1 from public.portal_catalogs where cover_source_type = 'storage_object' and cover_storage_bucket = p_bucket and cover_storage_path = p_path)
    or exists(select 1 from public.portal_prebooks where hero_source_type = 'storage_object' and hero_storage_bucket = p_bucket and hero_storage_path = p_path)
    or exists(select 1 from public.portal_catalog_resources where source_type = 'storage_object' and storage_bucket = p_bucket and storage_path = p_path)
    or exists(select 1 from public.portal_prebook_resources where source_type = 'storage_object' and storage_bucket = p_bucket and storage_path = p_path)
    or exists(select 1 from public.portal_art_resources where source_type = 'storage_object' and storage_bucket = p_bucket and storage_path = p_path);
$$;

revoke all on function public.portal_access_is_blocked(text, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.portal_record_access_failure(text, timestamptz, integer, integer) from public, anon, authenticated;
revoke all on function public.portal_clear_access_failures(text) from public, anon, authenticated;
revoke all on function public.portal_save_catalog(uuid, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.portal_save_prebook(uuid, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.portal_save_art_group(uuid, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.portal_reorder_catalog(uuid, text) from public, anon, authenticated;
revoke all on function public.portal_reorder_prebook(uuid, text) from public, anon, authenticated;
revoke all on function public.portal_reorder_art_group(uuid, text) from public, anon, authenticated;
revoke all on function public.portal_storage_object_is_referenced(text, text) from public, anon, authenticated;

grant execute on function public.portal_access_is_blocked(text, timestamptz, integer) to service_role;
grant execute on function public.portal_record_access_failure(text, timestamptz, integer, integer) to service_role;
grant execute on function public.portal_clear_access_failures(text) to service_role;
grant execute on function public.portal_save_catalog(uuid, jsonb, jsonb) to service_role;
grant execute on function public.portal_save_prebook(uuid, jsonb, jsonb) to service_role;
grant execute on function public.portal_save_art_group(uuid, jsonb, jsonb) to service_role;
grant execute on function public.portal_reorder_catalog(uuid, text) to service_role;
grant execute on function public.portal_reorder_prebook(uuid, text) to service_role;
grant execute on function public.portal_reorder_art_group(uuid, text) to service_role;
grant execute on function public.portal_storage_object_is_referenced(text, text) to service_role;
