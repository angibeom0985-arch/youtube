begin;

alter table if exists public.guides enable row level security;

-- Remove any legacy broad write policies.
drop policy if exists "Enable insert for everyone" on public.guides;
drop policy if exists "Enable update for everyone" on public.guides;
drop policy if exists "Enable delete for everyone" on public.guides;

-- Keep public read access for guide pages.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'guides'
      and policyname = 'Public guides are viewable by everyone'
  ) then
    create policy "Public guides are viewable by everyone"
      on public.guides
      for select
      using (true);
  end if;
end
$$;

-- Remove table-level write grants for anon/authenticated roles.
revoke insert, update, delete on table public.guides from anon;
revoke insert, update, delete on table public.guides from authenticated;

-- Explicit read grants.
grant select on table public.guides to anon;
grant select on table public.guides to authenticated;

commit;
