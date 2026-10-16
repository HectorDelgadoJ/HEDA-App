-- HEDA: monthly category limits. Run once after migrations 001–005.
-- Does not change transactions or schedule automatic payments.
begin;
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (length(trim(category)) between 1 and 60 and category = trim(category)),
  monthly_limit numeric(12,2) not null check (monthly_limit > 0 and monthly_limit <> 'NaN'::numeric),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index budgets_owner_category_idx on public.budgets(user_id, lower(category));
alter table public.budgets enable row level security;
revoke all on public.budgets from anon, authenticated;
grant select, insert, update, delete on public.budgets to authenticated;
create policy budgets_own on public.budgets for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create trigger budgets_updated_at before update on public.budgets
  for each row execute function public.heda_set_updated_at();
commit;
