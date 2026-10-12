-- Run after 202610110004_card_payments.sql. Existing movements stay in Mi saldo.
begin;
alter table public.profiles add column movement_mode text not null default 'simple'
  check (movement_mode in ('simple', 'cards'));
grant update (movement_mode) on public.profiles to authenticated;
alter table public.card_payments add column ledger_enabled boolean not null default false;
alter table public.card_payments add column opening_balance numeric(14,2) not null default 0
  check (opening_balance >= 0 and opening_balance <> 'NaN'::numeric);
alter table public.card_payments add constraint card_payments_id_owner unique(id, user_id);
alter table public.transactions add column card_id uuid;
alter table public.transactions add column is_card_payment boolean not null default false;
alter table public.transactions add constraint transactions_card_owner foreign key(card_id, user_id)
  references public.card_payments(id, user_id) deferrable initially deferred;
alter table public.transactions add constraint transactions_card_shape check (
  (card_id is null or type = 'expense') and (not is_card_payment or (card_id is not null and type = 'expense'))
);
alter table public.recurring_movements add column card_id uuid;
alter table public.recurring_movements add constraint recurring_card_owner foreign key(card_id, user_id)
  references public.card_payments(id, user_id) deferrable initially deferred;
alter table public.recurring_movements add constraint recurring_card_expense check(card_id is null or type = 'expense');
create index transactions_card_idx on public.transactions(user_id, card_id);

-- Tracking cannot be disabled on an existing ledger: switching UI mode never reinterprets records.
create function public.heda_guard_card_tracking()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and old.ledger_enabled and not new.ledger_enabled then
    raise exception 'El historial de una tarjeta debe conservarse';
  end if;
  return new;
end;
$$;
create trigger card_tracking_guard before update on public.card_payments
  for each row execute function public.heda_guard_card_tracking();

-- Every charge and payment locks the card, so a concurrent payment sees a consistent debt.
create function public.heda_lock_transaction_card()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare target uuid;
begin
  if tg_op = 'DELETE' then
    if old.card_id is not null then
      perform id from public.card_payments where id = old.card_id and user_id = old.user_id for update;
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' then
    for target in select distinct x from unnest(array[old.card_id, new.card_id]) x where x is not null order by x loop
      perform id from public.card_payments where id = target and user_id = new.user_id for update;
    end loop;
  end if;
  if new.card_id is not null then
    perform id from public.card_payments where id = new.card_id and user_id = new.user_id and ledger_enabled for update;
    if not found then raise exception 'La tarjeta no está habilitada o no pertenece a tu cuenta'; end if;
  end if;
  return new;
end;
$$;
create trigger transaction_card_lock before insert or update or delete on public.transactions
  for each row execute function public.heda_lock_transaction_card();

create function public.heda_set_movement_mode(p_mode text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  if p_mode not in ('simple', 'cards') or p_mode is null then raise exception 'Modo inválido'; end if;
  perform id from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'Perfil no disponible'; end if;
  if p_mode = 'cards' then
    update public.card_payments set opening_balance = case when paid then 0 else amount end, ledger_enabled = true
      where user_id = auth.uid() and not ledger_enabled;
  end if;
  update public.profiles set movement_mode = p_mode where id = auth.uid();
end;
$$;
revoke all on function public.heda_set_movement_mode(text) from public, anon;
grant execute on function public.heda_set_movement_mode(text) to authenticated;

create function public.heda_pay_tracked_card(p_id uuid, p_amount numeric)
returns void language plpgsql security invoker set search_path = '' as $$
declare card public.card_payments%rowtype; debt numeric; payment_id uuid;
begin
  select * into card from public.card_payments where id = p_id and user_id = auth.uid() for update;
  if not found or not card.ledger_enabled then raise exception 'Tarjeta no disponible'; end if;
  select card.opening_balance + coalesce(sum(case when is_card_payment then -amount else amount end), 0)
    into debt from public.transactions where card_id = p_id and user_id = auth.uid();
  if debt <= 0 then return; end if;
  if p_amount is null or p_amount <= 0 or p_amount <> debt then
    raise exception 'La deuda cambió. Actualiza la lista antes de confirmar';
  end if;
  insert into public.transactions(user_id, type, amount, category, description, transaction_date, card_id, is_card_payment)
    values (auth.uid(), 'expense', debt, 'Pago de tarjeta', 'Pago de tarjeta: ' || card.name,
      (now() at time zone 'America/Mexico_City')::date, card.id, true) returning id into payment_id;
  update public.card_payments set paid = true where id = card.id;
end;
$$;
revoke all on function public.heda_pay_tracked_card(uuid, numeric) from public, anon;
grant execute on function public.heda_pay_tracked_card(uuid, numeric) to authenticated;

-- Legacy reminders still work in Simple mode; tracked cards require the ledger RPC.
create or replace function public.heda_pay_card(p_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare card public.card_payments%rowtype;
begin
  select * into card from public.card_payments where id = p_id and user_id = auth.uid() for update;
  if not found then raise exception 'Tarjeta no disponible'; end if;
  if card.ledger_enabled then raise exception 'Usa el pago de tarjeta con seguimiento'; end if;
  if card.paid then return; end if;
  insert into public.transactions(user_id, type, amount, category, description, transaction_date)
    values (auth.uid(), 'expense', card.amount, 'Pago de tarjeta', 'Pago de tarjeta: ' || card.name,
      (now() at time zone 'America/Mexico_City')::date);
  update public.card_payments set paid = true where id = card.id;
end;
$$;

-- Recurring charges use the same card ledger as manually entered purchases.
create or replace function public.heda_confirm_recurring(p_id uuid, p_date date)
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

  insert into public.transactions(user_id, type, amount, category, description, transaction_date, recurring_movement_id, recurring_date, card_id)
    values (rule.user_id, rule.type, rule.amount, rule.category, coalesce(nullif(rule.description, ''), rule.name), p_date, rule.id, p_date, rule.card_id)
    returning id into transaction_id;

  if rule.frequency = 'daily' then next_occurrence := p_date + rule.interval_count;
  elsif rule.frequency = 'weekly' then next_occurrence := p_date + 7 * rule.interval_count;
  elsif rule.frequency = 'biweekly' then next_occurrence := p_date + 14 * rule.interval_count;
  else
    if rule.frequency = 'yearly' then
      next_month := make_date(extract(year from p_date)::integer + rule.interval_count, rule.anchor_month, 1);
    else
      next_month := (date_trunc('month', p_date) + make_interval(months => rule.interval_count))::date;
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
