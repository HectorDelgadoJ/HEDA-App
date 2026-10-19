-- After 001-010. No birth dates are inferred from declared ages.
begin;
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles drop constraint if exists profiles_age_check;
alter table public.profiles add constraint profiles_age_check check(age between 0 and 120);
comment on column public.profiles.birth_date is 'Fecha privada declarada; fuente de la edad calculada. No se envía a Gemini.';
comment on column public.profiles.age is 'Dato legado / instantánea al guardar. Calcular edad actual desde birth_date, no usar esta columna para elegibilidad.';
grant update(birth_date) on public.profiles to authenticated;
create or replace function public.heda_age_on(p_birth_date date,p_today date default ((now() at time zone 'America/Mexico_City')::date))
returns integer language sql immutable set search_path='' as $$
 select case when p_birth_date is null or p_birth_date>p_today then null else extract(year from age(p_today,p_birth_date))::integer end;
$$;
create or replace function public.heda_validate_birth_date()
returns trigger language plpgsql set search_path='' as $$
declare v_today date:=(now() at time zone 'America/Mexico_City')::date; v_age integer;
begin
 if tg_op='UPDATE' and old.birth_date is not null and new.birth_date is null then raise exception 'La fecha de nacimiento es obligatoria.' using errcode='22023'; end if;
 if new.birth_date is not null then
  v_age:=public.heda_age_on(new.birth_date,v_today);
  if new.birth_date<date '1900-01-01' or v_age is null or v_age>120 then raise exception 'Fecha de nacimiento inválida.' using errcode='22023'; end if;
  new.age:=v_age;new.age_recorded_at:=now();
 end if;
 return new;
end $$;
drop trigger if exists heda_profile_birth_date on public.profiles;
create trigger heda_profile_birth_date before insert or update on public.profiles for each row execute function public.heda_validate_birth_date();
revoke all on function public.heda_validate_birth_date() from public,anon,authenticated;
create or replace function public.heda_handle_new_user()
returns trigger language plpgsql security definer set search_path='' as $$
declare
 v_name text:=btrim(coalesce(new.raw_user_meta_data->>'full_name',''));
 v_username text:=nullif(lower(regexp_replace(btrim(new.raw_user_meta_data->>'username'),'^@','')),'');
 v_birth text:=new.raw_user_meta_data->>'birth_date'; v_date date; v_legacy_age text:=new.raw_user_meta_data->>'age';
 v_email boolean:=coalesce(new.raw_app_meta_data->>'provider','email')='email';
begin
 if v_email then
  if v_name='' or length(v_name)>100 or v_username is null or v_username !~ '^[a-z0-9._]{3,30}$' then raise exception 'El nombre y un @usuario válido son obligatorios.';end if;
  if v_birth is not null then
   if v_birth !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Fecha de nacimiento inválida.';end if;
   v_date:=v_birth::date;
  elsif v_legacy_age is null or v_legacy_age !~ '^[0-9]{1,3}$' then raise exception 'La fecha de nacimiento es obligatoria.';
  elsif v_legacy_age::integer not between 1 and 120 then raise exception 'Edad inválida.';end if;
 end if;
 insert into public.profiles(id,full_name,username,birth_date,age,age_recorded_at)
 values(new.id,v_name,case when v_email then v_username else null end,case when v_email then v_date else null end,
 case when v_email and v_date is null then v_legacy_age::smallint else null end,case when v_email then now() else null end);
 return new;
end $$;
revoke all on function public.heda_handle_new_user() from public,anon,authenticated;
create or replace function public.heda_complete_own_birth_profile(p_full_name text,p_username text,p_birth_date date)
returns setof public.profiles language plpgsql security definer set search_path='' as $$
declare v_owner uuid:=auth.uid();v_name text:=btrim(p_full_name);v_username text:=lower(regexp_replace(btrim(p_username),'^@',''));
begin
 if v_owner is null then raise exception 'Se requiere una sesión.' using errcode='42501';end if;
 if v_name is null or length(v_name) not between 1 and 100 or v_username is null or v_username !~ '^[a-z0-9._]{3,30}$' or p_birth_date is null then raise exception 'Revisa nombre, fecha de nacimiento y @usuario.' using errcode='22023';end if;
 return query update public.profiles set full_name=v_name,username=v_username,birth_date=p_birth_date where id=v_owner returning *;
 if not found then raise exception 'No existe el perfil de esta sesión.';end if;
end $$;
revoke all on function public.heda_complete_own_birth_profile(text,text,date) from public,anon;
grant execute on function public.heda_complete_own_birth_profile(text,text,date) to authenticated;
-- A boolean only: exact birth date never leaves the server for AI eligibility.
create or replace function public.heda_ai_age_eligible()
returns boolean language sql stable security definer set search_path='' as $$
 select public.heda_age_on(birth_date)>=18 from public.profiles where id=auth.uid();
$$;
revoke all on function public.heda_ai_age_eligible() from public,anon;
grant execute on function public.heda_ai_age_eligible() to authenticated;
commit;
