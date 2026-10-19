-- READ ONLY: run in SQL Editor after applying the migrations.
-- RLS disabled should return zero rows for all listed application tables.
select expected.name as table_name,c.relrowsecurity as rls_enabled
from unnest(array['profiles','transactions','goals','recurring_movements','card_payments','budgets','heda_ai_usage','heda_ai_global_usage']) expected(name)
left join pg_namespace n on n.nspname='public'
left join pg_class c on c.relnamespace=n.oid and c.relname=expected.name and c.relkind='r'
where c.oid is null or not c.relrowsecurity;
-- Review policies: app data should restrict access with auth.uid() and the owner column.
select tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname='public' order by tablename,policyname;
-- Quota tables must have NO anon/authenticated table grants (zero rows expected).
select table_name,grantee,privilege_type from information_schema.role_table_grants where table_schema='public' and table_name in ('heda_ai_usage','heda_ai_global_usage') and grantee in ('anon','authenticated','PUBLIC');
-- No anonymous calls to these RPCs; false expected.
select p.proname as routine_name,has_function_privilege('anon',p.oid,'execute') as anon_can_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace 
where n.nspname='public' and p.proname in ('heda_take_ai_quota','heda_pay_tracked_card','heda_confirm_recurring');
