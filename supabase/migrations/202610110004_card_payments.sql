-- HEDA: manual card statements and in-app payment reminders.
-- Does not modify existing transactions or recurring schedules.
begin;
create table public.card_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  amount numeric(14,2) not null check (amount > 0 and amount <> 'NaN'::numeric),
  due_date date not null,
  reminder boolean not null default true,
  paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index card_payments_user_due_idx on public.card_payments(user_id, due_date, id);
alter table public.card_payments enable row level security;
revoke all on public.card_payments from anon, authenticated;
grant select, insert, update, delete on public.card_payments to authenticated;
create policy card_payments_own on public.card_payments for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create trigger card_payments_updated_at before update on public.card_payments
  for each row execute function public.heda_set_updated_at();

-- Lock and update in the same transaction so retrying cannot charge twice.
create function public.heda_pay_card(p_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare card public.card_payments%rowtype;
begin
  select * into card from public.card_payments
    where id = p_id and user_id = auth.uid() for update;
  if not found then raise exception 'Card not found'; end if;
  if card.paid then return; end if;
  insert into public.transactions(user_id, type, amount, category, description, transaction_date)
    values (auth.uid(), 'expense', card.amount, 'Pago de tarjeta',
      'Pago de tarjeta: ' || card.name, (now() at time zone 'America/Mexico_City')::date);
  update public.card_payments set paid = true where id = card.id;
end;
$$;
revoke all on function public.heda_pay_card(uuid) from public, anon;
grant execute on function public.heda_pay_card(uuid) to authenticated;
commit;
