-- HEDA: scheduled income/expenses, confirmed explicitly by their owner.
-- Run once in Supabase SQL Editor after the initial migration.
begin;
create table public.recurring_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  type text not null check (type in ('income', 'expense')),
  amount numeric(14,2) not null check (amount > 0 and amount <> 'NaN'::numeric),
  category text not null check (length(trim(category)) > 0),
  description text,
  frequency text not null check (frequency in ('weekly', 'biweekly', 'monthly', 'yearly')),
  next_date date not null,
  anchor_day integer not null check (anchor_day between 1 and 31),
  anchor_month integer not null check (anchor_month between 1 and 12),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recurring_movements_user_date_idx on public.recurring_movements(user_id, next_date);
alter table public.recurring_movements enable row level security;
revoke all on public.recurring_movements from anon, authenticated;
grant select, insert, update, delete on public.recurring_movements to authenticated;
create policy recurring_movements_own on public.recurring_movements for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create trigger recurring_movements_updated_at before update on public.recurring_movements
  for each row execute function public.heda_set_updated_at();

alter table public.transactions add column recurring_movement_id uuid references public.recurring_movements(id) on delete set null;
alter table public.transactions add column recurring_date date;
create unique index transactions_recurring_occurrence_idx on public.transactions(recurring_movement_id, recurring_date)
  where recurring_movement_id is not null;

create function public.heda_confirm_recurring(p_id uuid, p_date date)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  rule public.recurring_movements%rowtype;
  existing_id uuid;
  transaction_id uuid;
  next_month date;
  next_occurrence date;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  select * into rule from public.recurring_movements
    where id = p_id and user_id = auth.uid() for update;
  if not found then raise exception 'Programación no disponible'; end if;
  select id into existing_id from public.transactions
    where recurring_movement_id = p_id and recurring_date = p_date and user_id = auth.uid();
  if found then return existing_id; end if;
  if not rule.active then raise exception 'La programación está pausada'; end if;
  if p_date <> rule.next_date or p_date is null then raise exception 'La fecha cambió; actualiza la lista'; end if;
  if p_date > (now() at time zone 'America/Mexico_City')::date then raise exception 'Este movimiento todavía no vence'; end if;

  insert into public.transactions(user_id, type, amount, category, description, transaction_date, recurring_movement_id, recurring_date)
    values (rule.user_id, rule.type, rule.amount, rule.category, coalesce(nullif(rule.description, ''), rule.name), p_date, rule.id, p_date)
    returning id into transaction_id;

  if rule.frequency = 'weekly' then next_occurrence := p_date + 7;
  elsif rule.frequency = 'biweekly' then next_occurrence := p_date + 14;
  else
    if rule.frequency = 'yearly' then
      next_month := make_date(extract(year from p_date)::integer + 1, rule.anchor_month, 1);
    else
      next_month := (date_trunc('month', p_date) + interval '1 month')::date;
    end if;
    next_occurrence := next_month + least(rule.anchor_day, extract(day from (next_month + interval '1 month - 1 day'))::integer) - 1;
  end if;
  update public.recurring_movements set next_date = next_occurrence where id = rule.id;
  return transaction_id;
end;
$$;
revoke all on function public.heda_confirm_recurring(uuid, date) from public, anon;
grant execute on function public.heda_confirm_recurring(uuid, date) to authenticated;
commit;
