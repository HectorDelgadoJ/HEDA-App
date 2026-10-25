-- After 001-011. Own-account actions with atomic idempotency. No model SQL.
begin;
create table if not exists public.heda_action_receipts(
 user_id uuid not null references auth.users(id) on delete cascade,request_id uuid not null,payload jsonb not null,result_id uuid,created_at timestamptz not null default now(),primary key(user_id,request_id));
alter table public.heda_action_receipts enable row level security;
revoke all on public.heda_action_receipts from public,anon,authenticated;
create or replace function public.heda_apply_own_action(p_request_id uuid,p_action jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_owner uuid:=auth.uid();v_kind text:=p_action->>'kind';v_amount numeric;v_date date;v_card uuid;v_id uuid;v_existing public.heda_action_receipts;v_frequency text;v_interval integer;
begin
 if v_owner is null or p_request_id is null then raise exception 'Se requiere una sesión.' using errcode='42501';end if;
 if jsonb_typeof(p_action) is distinct from 'object' or v_kind is null or v_kind not in ('movement','goal','budget','recurring') then raise exception 'Acción inválida.' using errcode='22023';end if;
 if exists(select 1 from jsonb_object_keys(p_action) as k where k not in ('kind','type','amount','category','description','date','card_id','name','frequency','interval_count')) then raise exception 'Campos no permitidos.' using errcode='22023';end if;
 if jsonb_typeof(p_action->'amount') is distinct from 'number' then raise exception 'Importe inválido.' using errcode='22023';end if;
 v_amount:=(p_action->>'amount')::numeric;
 if v_amount<=0 or v_amount>9999999999.99 or v_amount<>round(v_amount,2) or v_amount='NaN'::numeric then raise exception 'Importe inválido.' using errcode='22023';end if;
 if v_kind in ('movement','recurring') and coalesce(p_action->>'type','') not in ('income','expense') then raise exception 'Tipo inválido.' using errcode='22023';end if;
 if v_kind in ('movement','budget','recurring') and (coalesce(length(btrim(p_action->>'category')),0) not between 1 and 60) then raise exception 'Categoría inválida.' using errcode='22023';end if;
 if v_kind in ('goal','recurring') and coalesce(length(btrim(p_action->>'name')),0) not between 1 and 80 then raise exception 'Nombre inválido.' using errcode='22023';end if;
 if length(coalesce(p_action->>'description',''))>300 then raise exception 'Concepto demasiado largo.' using errcode='22023';end if;
 if nullif(p_action->>'date','') is not null then
  if (p_action->>'date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Fecha inválida.' using errcode='22023';end if;
  v_date:=(p_action->>'date')::date;
  if v_date<date '1900-01-01' or v_date>date '2200-12-31' then raise exception 'Fecha inválida.' using errcode='22023';end if;
 end if;
 if v_kind in ('movement','recurring') and v_date is null then raise exception 'Falta la fecha.' using errcode='22023';end if;
 if nullif(p_action->>'card_id','') is not null then
  v_card:=(p_action->>'card_id')::uuid;
  if v_kind not in ('movement','recurring') or p_action->>'type'<>'expense' or not exists(select 1 from public.card_payments where id=v_card and user_id=v_owner and ledger_enabled) then raise exception 'Tarjeta no disponible en tu cuenta.' using errcode='42501';end if;
 end if;
 if v_kind='recurring' then
  v_frequency:=p_action->>'frequency';v_interval:=(p_action->>'interval_count')::integer;
  if v_frequency is null or v_frequency not in ('daily','weekly','biweekly','monthly','yearly') or v_interval is null or v_interval not between 1 and 365 then raise exception 'Intervalo inválido.' using errcode='22023';end if;
 end if;
 insert into public.heda_action_receipts(user_id,request_id,payload) values(v_owner,p_request_id,p_action) on conflict do nothing;
 select * into v_existing from public.heda_action_receipts where user_id=v_owner and request_id=p_request_id for update;
 if v_existing.payload<>p_action then raise exception 'El intento ya corresponde a otra propuesta.' using errcode='22023';end if;
 if v_existing.result_id is not null then return jsonb_build_object('ok',true,'id',v_existing.result_id,'alreadyApplied',true);end if;
 if v_kind='movement' then
  insert into public.transactions(user_id,type,amount,category,description,transaction_date,card_id) values(v_owner,p_action->>'type',v_amount,btrim(p_action->>'category'),nullif(btrim(p_action->>'description'),''),v_date,v_card) returning id into v_id;
 elsif v_kind='goal' then
  insert into public.goals(user_id,name,target_amount,target_date) values(v_owner,btrim(p_action->>'name'),v_amount,v_date) returning id into v_id;
 elsif v_kind='budget' then
  insert into public.budgets(user_id,category,monthly_limit) values(v_owner,btrim(p_action->>'category'),v_amount) returning id into v_id;
 else
  insert into public.recurring_movements(user_id,name,type,amount,category,description,frequency,interval_count,next_date,anchor_day,anchor_month,card_id) values(v_owner,btrim(p_action->>'name'),p_action->>'type',v_amount,btrim(p_action->>'category'),nullif(btrim(p_action->>'description'),''),v_frequency,v_interval,v_date,extract(day from v_date)::integer,extract(month from v_date)::integer,v_card) returning id into v_id;
 end if;
 update public.heda_action_receipts set result_id=v_id where user_id=v_owner and request_id=p_request_id;
 return jsonb_build_object('ok',true,'id',v_id,'alreadyApplied',false);
end $$;
revoke all on function public.heda_apply_own_action(uuid,jsonb) from public,anon;
grant execute on function public.heda_apply_own_action(uuid,jsonb) to authenticated;
commit;
