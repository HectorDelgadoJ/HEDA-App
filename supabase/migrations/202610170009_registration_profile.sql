-- Run in Supabase SQL Editor, after existing migrations.
begin;
do $$ begin
  if exists(select 1 from public.profiles where nullif(btrim(username),'') is not null
    group by lower(regexp_replace(btrim(username),'^@','')) having count(*)>1) then
    raise exception 'Hay @usuarios repetidos. Revísalos antes de aplicar este SQL; no se renombró ninguna cuenta.';
  end if;
end $$;
alter table public.profiles add column if not exists age smallint check(age between 1 and 120);
alter table public.profiles add column if not exists age_recorded_at timestamptz;
comment on column public.profiles.age is 'Edad declarada al registrarse; no es fecha de nacimiento ni se incrementa automáticamente.';
create unique index if not exists profiles_username_unique on public.profiles
  (lower(regexp_replace(btrim(username),'^@','')))
  where nullif(btrim(username),'') is not null;
create or replace function public.heda_validate_profile_username()
returns trigger language plpgsql set search_path='' as $$
begin
  -- Preserve legacy profiles during unrelated updates, including old OAuth accounts.
  if tg_op='INSERT' or new.username is distinct from old.username then
    new.username:=nullif(lower(regexp_replace(btrim(new.username),'^@','')),'');
    if (tg_op='UPDATE' and new.username is null) or
       (new.username is not null and new.username !~ '^[a-z0-9._]{3,30}$') then
      raise exception 'El @usuario debe tener de 3 a 30 letras, números, puntos o guiones bajos.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists heda_profile_username on public.profiles;
create trigger heda_profile_username before insert or update on public.profiles
for each row execute function public.heda_validate_profile_username();
revoke all on function public.heda_validate_profile_username() from public,anon,authenticated;
create or replace function public.heda_username_available(p_username text)
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce(lower(regexp_replace(btrim(p_username),'^@','')) ~ '^[a-z0-9._]{3,30}$',false)
    and not exists(select 1 from public.profiles
      where nullif(btrim(username),'') is not null
        and lower(regexp_replace(btrim(username),'^@',''))=lower(regexp_replace(btrim(p_username),'^@',''))
        and id is distinct from auth.uid());
$$;
revoke all on function public.heda_username_available(text) from public,anon,authenticated;
grant execute on function public.heda_username_available(text) to anon,authenticated;
create or replace function public.heda_handle_new_user()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  v_name text:=btrim(coalesce(new.raw_user_meta_data->>'full_name',''));
  v_username text:=nullif(lower(regexp_replace(btrim(new.raw_user_meta_data->>'username'),'^@','')),'');
  v_age text:=new.raw_user_meta_data->>'age';
  v_email boolean:=coalesce(new.raw_app_meta_data->>'provider','email')='email';
begin
  if v_email then
    if v_name='' or length(v_name)>100 or v_username is null or v_username !~ '^[a-z0-9._]{3,30}$' then
      raise exception 'El nombre y un @usuario válido son obligatorios.';
    end if;
    if v_age is null or v_age !~ '^[0-9]{1,3}$' then raise exception 'La edad es obligatoria.'; end if;
    if v_age::integer not between 1 and 120 then raise exception 'Edad inválida.'; end if;
  end if;
  -- Google does not supply an age or HEDA handle. Keep its existing sign-in flow compatible.
  insert into public.profiles(id,full_name,username,age,age_recorded_at)
  values(new.id,v_name,case when v_email then v_username else null end,
    case when v_email then v_age::smallint else null end,
    case when v_email then now() else null end);
  return new;
end $$;
revoke all on function public.heda_handle_new_user() from public,anon,authenticated;
commit;
