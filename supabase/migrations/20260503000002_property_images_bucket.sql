-- properties-images capability — Supabase Storage bucket + policies.
--
-- Owned by the `properties-images` change (see openspec). Provisions a
-- private bucket `property-images` and the RLS policies on
-- `storage.objects` that gate read / write by household membership.
--
-- Path convention (D1):
--   households/{household_id}/properties/{property_id}/{uuid}.{ext}
--
-- The membership check is encapsulated in `has_household_role_for_storage_path`
-- — a SECURITY DEFINER helper that splits the path, extracts the
-- household uuid, and delegates to the existing `has_household_role()`
-- helper. Returns false on any malformed path so a typo can never widen
-- access.
--
-- Idempotent so the migration is safe to re-run on environments that
-- already pulled the bucket / policy in via an earlier branch.

-- Bucket ----------------------------------------------------------------------
--
-- Private bucket (public = false). file_size_limit = 9_000_000 bytes
-- (~9 MB) — slack above the client-side 8 MB pre-compression cap so the
-- API does not bounce a request that the client already accepted.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'property-images',
    'property-images',
    false,
    9000000,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

-- Path helper ----------------------------------------------------------------
--
-- Storage policies cannot run arbitrary SQL but they can call SQL
-- functions. This helper takes a path like
-- `households/<uuid>/properties/<uuid>/<file>` and returns true when the
-- caller has any of the supplied roles in that household. It is
-- deliberately strict: any malformed input → false.

create or replace function public.has_household_role_for_storage_path(
    path text,
    roles text[]
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    parts text[];
    v_household_id uuid;
begin
    if path is null or roles is null then
        return false;
    end if;

    parts := string_to_array(path, '/');
    -- Expected shape:
    --   parts[1] = 'households'
    --   parts[2] = '<household uuid>'
    --   parts[3] = 'properties'
    --   parts[4] = '<property uuid>'
    --   parts[5] = '<file>'
    if array_length(parts, 1) is null or array_length(parts, 1) < 5 then
        return false;
    end if;
    if parts[1] <> 'households' or parts[3] <> 'properties' then
        return false;
    end if;
    if parts[2] is null or length(parts[2]) = 0 then
        return false;
    end if;

    begin
        v_household_id := parts[2]::uuid;
    exception when others then
        return false;
    end;

    return public.has_household_role(v_household_id, roles);
end;
$$;

comment on function public.has_household_role_for_storage_path(text, text[]) is
    'Path-based membership check used by storage policies on the property-images bucket. Splits households/{hid}/properties/{pid}/{file} and delegates to has_household_role(). Returns false on any malformed input.';

revoke all on function public.has_household_role_for_storage_path(text, text[]) from public;
grant execute on function public.has_household_role_for_storage_path(text, text[]) to authenticated, anon;

-- Storage policies ------------------------------------------------------------
--
-- The Supabase storage schema has RLS enabled by default on
-- storage.objects. We add policies scoped to bucket_id =
-- 'property-images' so that nothing else in the schema is affected.
--
-- Read: any role in the household (owner, member, viewer).
-- Write (insert/update/delete): owner + member only — viewer denied (D7).

drop policy if exists property_images_select on storage.objects;
create policy property_images_select on storage.objects
    for select
    to authenticated
    using (
        bucket_id = 'property-images'
        and public.has_household_role_for_storage_path(name, array['owner', 'member', 'viewer'])
    );

drop policy if exists property_images_insert on storage.objects;
create policy property_images_insert on storage.objects
    for insert
    to authenticated
    with check (
        bucket_id = 'property-images'
        and public.has_household_role_for_storage_path(name, array['owner', 'member'])
    );

drop policy if exists property_images_update on storage.objects;
create policy property_images_update on storage.objects
    for update
    to authenticated
    using (
        bucket_id = 'property-images'
        and public.has_household_role_for_storage_path(name, array['owner', 'member'])
    )
    with check (
        bucket_id = 'property-images'
        and public.has_household_role_for_storage_path(name, array['owner', 'member'])
    );

drop policy if exists property_images_delete on storage.objects;
create policy property_images_delete on storage.objects
    for delete
    to authenticated
    using (
        bucket_id = 'property-images'
        and public.has_household_role_for_storage_path(name, array['owner', 'member'])
    );
