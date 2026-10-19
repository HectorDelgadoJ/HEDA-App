import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
test('deleting the auth owner cascades all HEDA data and leaves other owners intact',{skip:!process.env.PGLITE_TEST_MODULE},async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.PGLITE_TEST_MODULE).href),db=new PGlite();
 const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('app.test_user',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;`);
 const directory=new URL('../supabase/migrations/',import.meta.url);
 for(const file of readdirSync(directory).filter(x=>x.endsWith('.sql')).sort())await db.exec(readFileSync(new URL(file,directory),'utf8'));
 for(const [id,name] of [[A,'first'],[B,'second']]){
 await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[id,{full_name:name,username:name,age:24}]);
 await db.query("select set_config('app.test_user',$1,false)",[id]);
 const card=(await db.query("insert into public.card_payments(user_id,name,amount,due_date,ledger_enabled,opening_balance) values($1,'card',100,'2026-10-30',true,100) returning id",[id])).rows[0].id;
 const rule=(await db.query("insert into public.recurring_movements(user_id,name,type,amount,category,frequency,next_date,anchor_day,anchor_month,card_id) values($1,'rule','expense',10,'Comida','monthly','2026-10-30',30,10,$2) returning id",[id,card])).rows[0].id;
 await db.query("insert into public.transactions(user_id,type,amount,category,card_id,recurring_movement_id,recurring_date) values($1,'expense',10,'Comida',$2,$3,'2026-10-18')",[id,card,rule]);
 await db.query("insert into public.goals(user_id,name,target_amount) values($1,'goal',100)",[id]);
 await db.query("insert into public.budgets(user_id,category,monthly_limit) values($1,'Comida',100)",[id]);
 await db.query("select public.heda_take_ai_quota('chat')");
 }
 // Ordinary users cannot delete auth users directly.
 await db.exec('set role authenticated');await assert.rejects(db.query('delete from auth.users where id=$1',[A]));await db.exec('reset role');
 await db.query('delete from auth.users where id=$1',[A]);
 for(const [table,column] of [['profiles','id'],...['transactions','goals','card_payments','recurring_movements','budgets','heda_ai_usage'].map(x=>[x,'user_id'])]){
 assert.equal((await db.query(`select count(*)::int n from public.${table} where ${column}=$1`,[A])).rows[0].n,0,table);
 assert.equal((await db.query(`select count(*)::int n from public.${table} where ${column}=$1`,[B])).rows[0].n,1,table);
 }
 // An old JWT subject cannot recreate financial data after its auth row was deleted.
 await db.exec('set role authenticated');await db.query("select set_config('app.test_user',$1,false)",[A]);await assert.rejects(db.query("insert into public.transactions(user_id,type,amount,category) values($1,'income',1,'Salario')",[A]));
 }finally{await db.close();}
});
