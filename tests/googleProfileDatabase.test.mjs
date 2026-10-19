import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
test('Google completion RPC restricts writes to auth.uid and enforces unique handles atomically',{skip:!process.env.PGLITE_TEST_MODULE},async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.PGLITE_TEST_MODULE).href),db=new PGlite();
 const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('app.test_user',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;`);
 const dir=new URL('../supabase/migrations/',import.meta.url);
 for(const file of readdirSync(dir).filter(x=>x.endsWith('.sql')).sort())await db.exec(readFileSync(new URL(file,dir),'utf8'));
 for(const id of [A,B])await db.query(`insert into auth.users(id,raw_user_meta_data,raw_app_meta_data) values($1,'{"full_name":"Google User"}','{"provider":"google"}')`,[id]);
 await db.exec('set role anon');await assert.rejects(db.query("select * from public.heda_complete_own_profile('Ana','ana',24)"),/permission denied/);
 await db.exec('reset role;set role authenticated');
 await assert.rejects(db.query("select * from public.heda_complete_own_profile('Ana','ana',24)"),/sesión/);
 await db.query("select set_config('app.test_user',$1,false)",[A]);
 const saved=(await db.query("select * from public.heda_complete_own_profile(' Ana ','@ANA',24)")).rows[0];assert.equal(saved.id,A);assert.equal(saved.username,'ana');assert.equal(saved.age,24);
 await assert.rejects(db.query("select * from public.heda_complete_own_profile('Bad','bad',0)"),/Revisa/);
 await db.query("select set_config('app.test_user',$1,false)",[B]);
 await assert.rejects(db.query("select * from public.heda_complete_own_profile('Other','ANA',25)"),/unique/);
 await db.query("select * from public.heda_complete_own_profile('Other','other',25)");
 await db.exec('reset role');
 assert.equal((await db.query('select full_name from public.profiles where id=$1',[A])).rows[0].full_name,'Ana');
 }finally{await db.close();}
});
