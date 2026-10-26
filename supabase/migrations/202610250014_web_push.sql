-- Optional background browser delivery. Requires SQL 013 and worker configuration.
begin;
create table public.heda_web_push(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,endpoint text not null unique check(length(endpoint)<3000),keys jsonb not null,created_at timestamptz not null default now());
alter table public.heda_web_push enable row level security;
revoke all on public.heda_web_push from public,anon,authenticated;
grant select,insert,delete on public.heda_web_push to authenticated;
create policy own_push on public.heda_web_push for all to authenticated using(user_id=auth.uid() and public.heda_account_active()) with check(user_id=auth.uid() and public.heda_account_active());
create function public.heda_validate_push() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/' or new.endpoint~'[@#]' or coalesce(new.keys->>'auth','') !~ '^[A-Za-z0-9_-]{20,30}$' or coalesce(new.keys->>'p256dh','') !~ '^[A-Za-z0-9_-]{80,100}$' then raise exception 'Suscripción no válida.';end if;
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,414));
 if (select count(*) from public.heda_web_push where user_id=new.user_id)>=5 then raise exception 'Máximo cinco navegadores por cuenta.';end if;return new;end $$;
create trigger push_validate before insert on public.heda_web_push for each row execute function public.heda_validate_push();
revoke all on function public.heda_validate_push() from public,anon,authenticated;
alter table public.heda_notifications add column notified_at timestamptz,add column push_attempts integer not null default 0,add column claimed_at timestamptz;
create function public.heda_claim_push() returns setof public.heda_notifications language sql security definer set search_path='' as $$
 update public.heda_notifications set claimed_at=now(),push_attempts=push_attempts+1 where (user_id,id) in(select n.user_id,n.id from public.heda_notifications n where n.notified_at is null and n.read_at is null and n.push_attempts<5 and n.created_at>now()-interval '1 day' and (n.claimed_at is null or n.claimed_at<now()-interval '10 minutes') and not exists(select 1 from public.heda_account_state s where s.user_id=n.user_id and not s.enabled) and exists(select 1 from public.heda_web_push w where w.user_id=n.user_id) order by n.created_at limit 10 for update skip locked) returning *;
$$;
revoke all on function public.heda_claim_push() from public,anon,authenticated;
do $$begin if exists(select 1 from pg_roles where rolname='service_role') then grant all on public.heda_notifications,public.heda_web_push,public.heda_account_state to service_role;grant execute on function public.heda_claim_push() to service_role;end if;end $$;
create table public.heda_alert_preferences(user_id uuid primary key references auth.users(id) on delete cascade,ethereum boolean not null default false);
alter table public.heda_alert_preferences enable row level security;
revoke all on public.heda_alert_preferences from public,anon,authenticated;
grant select,insert,update,delete on public.heda_alert_preferences to authenticated;
create policy own_alert_preferences on public.heda_alert_preferences for all to authenticated using(user_id=auth.uid() and public.heda_account_active()) with check(user_id=auth.uid() and public.heda_account_active());
do $$begin if exists(select 1 from pg_roles where rolname='service_role') then grant all on public.heda_alert_preferences to service_role;end if;end $$;
commit;
