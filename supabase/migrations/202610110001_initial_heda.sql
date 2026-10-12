-- HEDA: initial schema for a NEW Supabase project.
-- Run once in SQL Editor. No existing tables or data are deleted.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  username text,
  occupation text,
  financial_level text not null default 'Basico',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14,2) not null check (amount > 0 and amount <> 'NaN'::numeric),
  category text not null check (length(trim(category)) > 0),
  description text,
  transaction_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  target_amount numeric(14,2) not null check (target_amount > 0 and target_amount <> 'NaN'::numeric),
  current_amount numeric(14,2) not null default 0 check (current_amount >= 0 and current_amount <> 'NaN'::numeric),
  target_date date,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions(user_id, transaction_date desc, created_at desc);
create index goals_user_status_idx on public.goals(user_id, status, created_at);

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.goals enable row level security;

revoke all on public.profiles, public.transactions, public.goals from anon, authenticated;
grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, username, occupation, financial_level) on public.profiles to authenticated;
grant select, insert, update, delete on public.transactions, public.goals to authenticated;

create policy profiles_select_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy transactions_own on public.transactions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy goals_own on public.goals for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create function public.heda_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.heda_set_updated_at() from public, anon, authenticated;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.heda_set_updated_at();
create trigger transactions_updated_at before update on public.transactions
  for each row execute function public.heda_set_updated_at();
create trigger goals_updated_at before update on public.goals
  for each row execute function public.heda_set_updated_at();

create function public.heda_handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(trim(new.raw_user_meta_data ->> 'username'), '')
  );
  return new;
end;
$$;
revoke all on function public.heda_handle_new_user() from public, anon, authenticated;

create trigger heda_auth_user_created after insert on auth.users
  for each row execute function public.heda_handle_new_user();

-- Also create profiles if test accounts were registered before running this SQL.
insert into public.profiles (id, full_name, username)
select id, coalesce(raw_user_meta_data ->> 'full_name', ''),
       nullif(trim(raw_user_meta_data ->> 'username'), '')
from auth.users;

commit;
