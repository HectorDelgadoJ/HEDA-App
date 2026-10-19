import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync} from 'node:fs';import {pathToFileURL} from 'node:url';
test('birth dates validate on server, preserve legacy unknowns, isolate owners and control AI age',{skip:!process.env.PGLITE_TEST_MODULE},async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.PGLITE_TEST_MODULE).href),db=new PGlite();const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
 try{await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('app.test_user',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;`);
 const dir=new URL('../supabase/migrations/',import.meta.url);for(const file of readdirSync(dir).filter(x=>x.endsWith('.sql')).sort())await db.exec(readFileSync(new URL(file,dir),'utf8'));
 await db.query(`insert into auth.users values($1,'{"full_name":"Old","username":"old","age":24}','{"provider":"email"}')`,[A]);
 assert.equal((await db.query('select birth_date from profiles where id=$1',[A])).rows[0].birth_date,null);
 await db.query(`insert into auth.users values($1,'{"full_name":"New","username":"new","birth_date":"2000-06-15"}','{"provider":"email"}')`,[B]);
 await db.exec('set role authenticated');await db.query("select set_config('app.test_user',$1,false)",[A]);
 assert.equal((await db.query('select heda_ai_age_eligible() as allowed')).rows[0].allowed,null);
 await assert.rejects(db.query("select * from heda_complete_own_birth_profile('Old','old','2100-01-01')"),/inválida/);
 await db.query("select * from heda_complete_own_birth_profile('Old','old',(current_date-interval '10 years')::date)");assert.equal((await db.query('select heda_ai_age_eligible() as allowed')).rows[0].allowed,false);
 await db.query("select * from heda_complete_own_birth_profile('Old','old','2000-06-15')");assert.equal((await db.query('select heda_ai_age_eligible() as allowed')).rows[0].allowed,true);
 await assert.rejects(db.query('update profiles set birth_date=null where id=$1',[A]),/obligatoria/);
 assert.equal((await db.query('select count(*)::int n from profiles where id=$1',[B])).rows[0].n,0);
 assert.equal((await db.query("select heda_age_on('2004-02-29','2025-02-28') as age")).rows[0].age,20);
 assert.equal((await db.query("select heda_age_on('2004-02-29','2025-03-01') as age")).rows[0].age,21);
 await db.exec('reset role;set role anon');await assert.rejects(db.query('select heda_ai_age_eligible()'),/permission denied/);
 }finally{await db.close();}
});
