-- properties-images capability — extend get_property_list() to return image_url.
--
-- The list view needs to render uploaded images (Storage paths) and
-- legacy external URLs (FINN). We extend the function's return shape to
-- include `image_url` so the server can bulk-sign Storage paths in one
-- round before rendering. Existing callers ignore additional columns;
-- the new column is appended at the end.
--
-- This is a CREATE OR REPLACE — Postgres requires the same return
-- signature in OR REPLACE, so we drop and recreate.

drop function if exists public.get_property_list(uuid, uuid);

create function public.get_property_list(
    p_household_id uuid,
    p_user_id uuid
)
returns table (
    id uuid,
    household_id uuid,
    address text,
    finn_link text,
    price bigint,
    costs bigint,
    monthly_costs bigint,
    bra numeric,
    primary_rooms int,
    bedrooms int,
    bathrooms numeric,
    year_built int,
    property_type text,
    floor text,
    status_id uuid,
    status_label text,
    status_color text,
    status_icon text,
    status_is_terminal boolean,
    added_by uuid,
    created_at timestamptz,
    updated_at timestamptz,
    felles_total int,
    your_total int,
    partner_id uuid,
    partner_total int,
    your_score_count int,
    image_url text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_partner_id uuid;
    v_member_count int;
begin
    if not exists (
        select 1 from public.household_members hm
        where hm.household_id = p_household_id
          and hm.user_id = p_user_id
    ) then
        return;
    end if;

    select count(*) into v_member_count
    from public.household_members hm
    where hm.household_id = p_household_id;

    if v_member_count = 2 then
        select hm.user_id into v_partner_id
        from public.household_members hm
        where hm.household_id = p_household_id
          and hm.user_id <> p_user_id
        limit 1;
    end if;

    return query
    with felles_agg as (
        select
            pfs.property_id,
            sum(pfs.score::numeric * coalesce(hw.weight, 0)) as numerator,
            (
                select sum(coalesce(hw2.weight, 0))
                from public.household_weights hw2
                where hw2.household_id = p_household_id
            ) as denominator_all
        from public.property_felles_scores pfs
        left join public.household_weights hw
          on hw.household_id = p_household_id
         and hw.criterion_id = pfs.criterion_id
        group by pfs.property_id
    ),
    your_agg as (
        select
            ps.property_id,
            sum(ps.score::numeric * coalesce(uw.weight, 0)) as numerator,
            sum(coalesce(uw.weight, 0)) as denominator_scored,
            count(*) as score_count
        from public.property_scores ps
        left join public.user_weights uw
          on uw.household_id = p_household_id
         and uw.user_id = p_user_id
         and uw.criterion_id = ps.criterion_id
        where ps.user_id = p_user_id
        group by ps.property_id
    ),
    partner_agg as (
        select
            ps.property_id,
            sum(ps.score::numeric * coalesce(uw.weight, 0)) as numerator,
            sum(coalesce(uw.weight, 0)) as denominator_scored
        from public.property_scores ps
        left join public.user_weights uw
          on uw.household_id = p_household_id
         and uw.user_id = v_partner_id
         and uw.criterion_id = ps.criterion_id
        where v_partner_id is not null
          and ps.user_id = v_partner_id
        group by ps.property_id
    )
    select
        p.id,
        p.household_id,
        p.address,
        p.finn_link,
        p.price,
        p.costs,
        p.monthly_costs,
        p.bra,
        p.primary_rooms,
        p.bedrooms,
        p.bathrooms,
        p.year_built,
        p.property_type,
        p.floor,
        p.status_id,
        s.label as status_label,
        s.color as status_color,
        s.icon as status_icon,
        s.is_terminal as status_is_terminal,
        p.added_by,
        p.created_at,
        p.updated_at,
        case
            when fa.denominator_all is null
              or fa.denominator_all = 0 then null
            else round((fa.numerator / fa.denominator_all) * 10)::int
        end as felles_total,
        case
            when ya.denominator_scored is null
              or ya.denominator_scored = 0 then null
            else round((ya.numerator / ya.denominator_scored) * 10)::int
        end as your_total,
        v_partner_id as partner_id,
        case
            when pa.denominator_scored is null
              or pa.denominator_scored = 0 then null
            else round((pa.numerator / pa.denominator_scored) * 10)::int
        end as partner_total,
        coalesce(ya.score_count, 0)::int as your_score_count,
        p.image_url
    from public.properties p
    join public.property_statuses s on s.id = p.status_id
    left join felles_agg fa on fa.property_id = p.id
    left join your_agg ya on ya.property_id = p.id
    left join partner_agg pa on pa.property_id = p.id
    where p.household_id = p_household_id;
end;
$$;

comment on function public.get_property_list(uuid, uuid) is
    'Returns one row per property in the active household with derived totals (felles, your, partner), your_score_count, and image_url. SECURITY DEFINER + explicit membership check so non-members get nothing. See properties/design.md D3, comparison/design.md D7, properties-images/design.md D3.';

revoke all on function public.get_property_list(uuid, uuid) from public;
grant execute on function public.get_property_list(uuid, uuid) to authenticated;
