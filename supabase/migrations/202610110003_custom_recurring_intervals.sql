-- Run once after 202610110002_recurring_movements.sql.
-- Existing schedules keep their current frequency and dates.
begin;
alter table public.recurring_movements add column interval_count integer not null default 1
  check (interval_count between 1 and 365);
alter table public.recurring_movements drop constraint recurring_movements_frequency_check;
alter table public.recurring_movements add constraint recurring_movements_frequency_check
  check (frequency in ('daily', 'weekly', 'biweekly', 'monthly', 'yearly'));

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

  insert into public.transactions(user_id, type, amount, category, description, transaction_date, recurring_movement_id, recurring_date)
    values (rule.user_id, rule.type, rule.amount, rule.category, coalesce(nullif(rule.description, ''), rule.name), p_date, rule.id, p_date)
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
