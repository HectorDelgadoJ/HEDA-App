-- Apply after migrations 001-009. Does not delete or rename existing profiles.
begin;
create or replace function public.heda_complete_own_profile(p_full_name text,p_username text,p_age integer)
returns setof public.profiles language plpgsql security definer set search_path='' as $$
declare v_owner uuid:=auth.uid(); v_name text:=btrim(p_full_name); v_username text:=lower(regexp_replace(btrim(p_username),'^@',''));
begin
 if v_owner is null then raise exception 'Se requiere una sesión.' using errcode='42501'; end if;
 if v_name is null or length(v_name) not between 1 and 100 or v_username is null or v_username !~ '^[a-z0-9._]{3,30}$' or p_age is null or p_age not between 1 and 120 then
  raise exception 'Revisa nombre, edad y @usuario.' using errcode='22023';
 end if;
 -- The unique index from 009 resolves simultaneous claims; no caller-supplied owner ID.
 return query update public.profiles set full_name=v_name,username=v_username,age=p_age,age_recorded_at=now() where id=v_owner returning *;
 if not found then raise exception 'No existe el perfil de esta sesión.'; end if;
end $$;
revoke all on function public.heda_complete_own_profile(text,text,integer) from public,anon;
grant execute on function public.heda_complete_own_profile(text,text,integer) to authenticated;
commit;
