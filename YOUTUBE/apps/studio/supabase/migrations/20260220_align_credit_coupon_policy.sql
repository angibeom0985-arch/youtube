-- =============================================
-- Align credit/coupon policy with production rules
-- - No signup free credits
-- - No initial free-credit expiry flow
-- - Keep coupon whitelist flow server-controlled
-- - Lock down guides write access (server-side only)
-- =============================================

begin;

-- 1) profiles default credits -> 0
alter table if exists public.profiles
  alter column credits set default 0;

-- 2) replace new-user profile bootstrap function
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (
    id,
    email,
    credits,
    last_reset_date,
    signup_ip,
    initial_credits_expiry,
    created_at
  )
  values (
    new.id,
    new.email,
    0,
    now(),
    null,
    null,
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- 3) ensure trigger exists with updated function
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 4) normalize existing users to new policy
update public.profiles
set
  credits = 0,
  initial_credits_expiry = null
where credits <> 0
   or initial_credits_expiry is not null;

-- 5) tighten guides write policies (public read only)
drop policy if exists "Enable insert for everyone" on public.guides;
drop policy if exists "Enable update for everyone" on public.guides;

-- Keep read policy if already present; create if missing.
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
      on public.guides for select
      using (true);
  end if;
end
$$;

commit;

-- Optional verification queries:
-- select column_default from information_schema.columns
-- where table_schema='public' and table_name='profiles' and column_name='credits';
--
-- select email, credits, initial_credits_expiry
-- from public.profiles
-- order by created_at desc
-- limit 20;
