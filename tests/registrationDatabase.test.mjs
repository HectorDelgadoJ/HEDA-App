import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
test('registration SQL validates required fields, unique handles, legacy data and privacy',{skip:!process.env.PGLITE_TEST_MODULE},async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.PGLITE_TEST_MODULE).href),db=new PGlite();
 const sql=readFileSync(new URL('../supabase/migrations/202610170009_registration_profile.sql',import.meta.url),'utf8');
 const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('app.test_user',true),'')::uuid$$;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb,raw_app_meta_data jsonb);
 create table public.profiles(id uuid primary key,full_name text,username text);
 alter table public.profiles enable row level security;
 grant usage on schema public,auth to anon,authenticated;
 grant select on public.profiles to authenticated;
 create policy own on public.profiles for select to authenticated using(id=auth.uid());`);
 await db.query('insert into public.profiles values($1,$2,$3),($4,$5,$6)',[A,'Legacy','Vic',B,'Legacy2',' @VIC ']);
 await assert.rejects(db.exec(sql),/repetidos/);await db.exec('rollback');
 await db.query('delete from public.profiles where id=$1',[B]);await db.exec(sql);await db.exec(sql);
 await db.exec('create trigger test_signup after insert on auth.users for each row execute function public.heda_handle_new_user()');
 const signup=meta=>db.query('insert into auth.users values($1,$2,$3)',[B,meta,{provider:'email'}]);
 await assert.rejects(signup({full_name:'Ana',username:'ana'}),/edad/);
 await assert.rejects(signup({full_name:'Ana',username:'@VIC',age:24}),/unique/);
 await assert.rejects(signup({full_name:'Ana',username:'ana',age:121}),/Edad/);
 await assert.rejects(signup({full_name:'Ana',age:24}),/obligatorios/);
 await signup({full_name:'Ana',username:'@ANA',age:24});
 assert.deepEqual((await db.query('select username,age from public.profiles where id=$1',[B])).rows[0],{username:'ana',age:24});
 await assert.rejects(db.query('update public.profiles set username=null where id=$1',[B]),/usuario/);
 await db.exec('set role anon');
 assert.equal((await db.query("select public.heda_username_available('@VIC') as free")).rows[0].free,false);
 assert.equal((await db.query("select public.heda_username_available('new_name') as free")).rows[0].free,true);
 await assert.rejects(db.query('select * from public.profiles'));
 await db.exec('reset role;set role authenticated');await db.query("select set_config('app.test_user',$1,false)",[B]);
 assert.equal((await db.query('select * from public.profiles')).rows.length,1);
 assert.equal((await db.query("select public.heda_username_available('ana') as free")).rows[0].free,true);
 }finally{await db.close();}
});
