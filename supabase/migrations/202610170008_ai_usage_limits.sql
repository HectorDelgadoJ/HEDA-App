-- HEDA: persistent quotas, enforced atomically by authenticated owner and UTC day.
-- Apply after 001–007, before deploying the updated heda-ai function.
begin;
create table if not exists public.heda_ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('chat','preview')),
  usage_day date not null,
  minute_start timestamptz not null,
  day_count integer not null default 0 check(day_count>=0),
  minute_count integer not null default 0 check(minute_count>=0),
  primary key(user_id,kind)
);
create table if not exists public.heda_ai_global_usage (
  usage_day date primary key,
  chat_count integer not null default 0 check(chat_count>=0),
  preview_count integer not null default 0 check(preview_count>=0)
);
alter table public.heda_ai_usage enable row level security;
alter table public.heda_ai_global_usage enable row level security;
revoke all on public.heda_ai_usage,public.heda_ai_global_usage from public,anon,authenticated;
-- No direct policies/grants. The narrow RPC below is the only user-accessible operation.
create or replace function public.heda_take_ai_quota(p_kind text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  owner_id uuid:=auth.uid();
  at_time timestamptz:=clock_timestamp();
  utc_day date:=(at_time at time zone 'UTC')::date;
  minute_time timestamptz:=date_trunc('minute',at_time);
  minute_limit integer; day_limit integer; global_limit integer;
  global_count integer; usage public.heda_ai_usage%rowtype;
  day_retry integer:=greatest(1,ceil(extract(epoch from (((utc_day+1)::timestamp at time zone 'UTC')-at_time)))::integer);
begin
  if owner_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_kind is null or p_kind not in ('chat','preview') then raise exception 'Invalid quota kind'; end if;
  minute_limit:=case when p_kind='chat' then 5 else 20 end;
  day_limit:=case when p_kind='chat' then 60 else 120 end;
  global_limit:=case when p_kind='chat' then 300 else 1000 end;
  insert into public.heda_ai_global_usage(usage_day) values(utc_day) on conflict do nothing;
  -- Stable lock order across all callers: day bucket, then owner/kind bucket.
  select case when p_kind='chat' then chat_count else preview_count end into global_count
    from public.heda_ai_global_usage where usage_day=utc_day for update;
  insert into public.heda_ai_usage(user_id,kind,usage_day,minute_start)
    values(owner_id,p_kind,utc_day,minute_time) on conflict do nothing;
  select * into usage from public.heda_ai_usage where user_id=owner_id and kind=p_kind for update;
  if usage.usage_day<>utc_day then usage.day_count:=0; end if;
  if usage.minute_start<>minute_time then usage.minute_count:=0; end if;
  if global_count>=global_limit then return jsonb_build_object('allowed',false,'code','AI_GLOBAL_LIMIT','retryAfter',day_retry); end if;
  if usage.day_count>=day_limit then return jsonb_build_object('allowed',false,'code','AI_USER_DAILY_LIMIT','retryAfter',day_retry); end if;
  if usage.minute_count>=minute_limit then return jsonb_build_object('allowed',false,'code','AI_USER_MINUTE_LIMIT','retryAfter',greatest(1,ceil(extract(epoch from (minute_time+interval '1 minute'-at_time)))::integer)); end if;
  update public.heda_ai_usage set usage_day=utc_day,minute_start=minute_time,day_count=usage.day_count+1,minute_count=usage.minute_count+1 where user_id=owner_id and kind=p_kind;
  update public.heda_ai_global_usage set chat_count=chat_count+case when p_kind='chat' then 1 else 0 end,preview_count=preview_count+case when p_kind='preview' then 1 else 0 end where usage_day=utc_day;
  delete from public.heda_ai_global_usage where usage_day<utc_day-7;
  return jsonb_build_object('allowed',true,'remainingToday',day_limit-usage.day_count-1);
end;
$$;
revoke all on function public.heda_take_ai_quota(text) from public,anon,authenticated;
grant execute on function public.heda_take_ai_quota(text) to authenticated;
commit;
