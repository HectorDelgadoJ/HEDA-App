import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync} from 'node:fs';import {pathToFileURL} from 'node:url';
test('action confirmation is atomic, idempotent and restricted to authenticated owner',{skip:!process.env.PGLITE_TEST_MODULE},async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.PGLITE_TEST_MODULE).href),db=new PGlite();const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';let seq=0;const request=()=>`aaaaaaaa-aaaa-4aaa-8aaa-${String(++seq).padStart(12,'0')}`;
 try{await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('app.test_user',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;`);
 const dir=new URL('../supabase/migrations/',import.meta.url);for(const f of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort())await db.exec(readFileSync(new URL(f,dir),'utf8'));
 for(const [owner,name] of [[A,'ana'],[B,'ben']])await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[owner,{full_name:name,username:name,birth_date:'2000-06-15'}]);
 const foreign=(await db.query("insert into card_payments(user_id,name,amount,due_date,ledger_enabled) values($1,'Foreign',100,current_date,true) returning id",[B])).rows[0].id;
 await db.exec('set role anon');await assert.rejects(db.query('select heda_apply_own_action($1,$2)',[request(),{}]),/permission denied/);
 await db.exec('reset role;set role authenticated');await db.query("select set_config('app.test_user',$1,false)",[A]);
 const apply=(rid,action)=>db.query('select heda_apply_own_action($1,$2) as result',[rid,action]);
 const action={kind:'movement',type:'expense',amount:120.5,category:'Comida',date:'2026-10-25'},rid=request();
 const first=(await apply(rid,action)).rows[0].result,again=(await apply(rid,action)).rows[0].result;assert.equal(first.id,again.id);assert.equal(again.alreadyApplied,true);assert.equal((await db.query('select count(*)::int n from transactions')).rows[0].n,1);
 await assert.rejects(apply(rid,{...action,amount:200}),/otra propuesta/);
 for(const changed of [{amount:0},{amount:1.001},{user_id:B},{card_id:foreign},{date:'2026-02-30'},{kind:'delete'}])await assert.rejects(apply(request(),{...action,...changed}));
 await apply(request(),{kind:'goal',name:'Laptop',amount:5000});
 await apply(request(),{kind:'budget',category:'Comida',amount:2000});await assert.rejects(apply(request(),{kind:'budget',category:'Comida',amount:500}),/unique/);
 await apply(request(),{kind:'recurring',type:'expense',name:'Renta',amount:1000,category:'Hogar',date:'2026-11-01',frequency:'monthly',interval_count:1});
 assert.equal((await db.query('select count(*)::int n from transactions')).rows[0].n,1,'recurring never creates an actual payment');
 await assert.rejects(db.query('select * from heda_action_receipts'),/permission denied/);
 await db.query("select set_config('app.test_user',$1,false)",[B]);assert.equal((await db.query('select count(*)::int n from goals')).rows[0].n,0);
 const other=(await apply(rid,action)).rows[0].result;assert.notEqual(other.id,first.id);
 await db.exec('reset role');await db.query('delete from auth.users where id=$1',[A]);assert.equal((await db.query('select count(*)::int n from heda_action_receipts where user_id=$1',[A])).rows[0].n,0);
 }finally{await db.close();}
});
