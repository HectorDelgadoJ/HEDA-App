-- HEDA: pay only debt recorded through today. Keeps locking, RLS and retry behavior.
-- Run after 001–006. No records are deleted or rewritten. Safe to run again.
begin;
create or replace function public.heda_pay_tracked_card(p_id uuid, p_amount numeric)
returns void language plpgsql security invoker set search_path = '' as $$
declare card public.card_payments%rowtype; debt numeric; payment_id uuid;
begin
  select * into card from public.card_payments where id = p_id and user_id = auth.uid() for update;
  if not found or not card.ledger_enabled then raise exception 'Tarjeta no disponible'; end if;
  select card.opening_balance + coalesce(sum(case when is_card_payment then -amount else amount end), 0)
    into debt from public.transactions where card_id = p_id and user_id = auth.uid()
      and transaction_date <= (now() at time zone 'America/Mexico_City')::date;
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

commit;
