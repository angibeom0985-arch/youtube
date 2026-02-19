create table if not exists public.coupon_whitelist (
  id uuid primary key default gen_random_uuid(),
  email_normalized text not null,
  coupon_code text not null,
  is_active boolean not null default true,
  expires_at timestamptz null,
  used_by_user_id uuid null,
  used_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists coupon_whitelist_email_code_uq
  on public.coupon_whitelist (email_normalized, coupon_code);

create index if not exists coupon_whitelist_used_user_idx
  on public.coupon_whitelist (used_by_user_id);

create or replace function public.set_coupon_whitelist_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_coupon_whitelist_updated_at on public.coupon_whitelist;
create trigger trg_coupon_whitelist_updated_at
before update on public.coupon_whitelist
for each row
execute function public.set_coupon_whitelist_updated_at();

alter table public.coupon_whitelist enable row level security;

-- No public policies on purpose. This table is server-only (service_role/admin API).
