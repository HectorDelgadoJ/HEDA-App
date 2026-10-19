import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
test('persistent AI quotas enforce owner, minute, day and global caps in PostgreSQL',{skip:!process.env.PGLITE_TEST_MODULE},async t=>{
 const {PGlite}=await import(pathToFileURL(process.env.PGLITE_TEST_MODULE).href),db=new PGlite();
 const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
 const quota=async(kind='chat')=>(await db.query('select public.heda_take_ai_quota($1) as result',[kind])).rows[0].result;
 const asUser=async id=>{await db.exec('reset role; set role authenticated');await db.query("select set_config('app.test_user',$1,false)",[id]);};
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('app.test_user',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;`);
  await db.query('insert into auth.users values ($1),($2)',[A,B]);
  const sql=readFileSync(new URL('../supabase/migrations/202610170008_ai_usage_limits.sql',import.meta.url),'utf8');await db.exec(sql);await db.exec(sql);
  await asUser(A);
  await t.test('five calls are granted, additional calls are denied without incrementing counters',async()=>{
   const results=await Promise.all(Array.from({length:10},()=>quota()));assert.equal(results.filter(x=>x.allowed).length,5);assert.ok(results.filter(x=>!x.allowed).every(x=>x.code==='AI_USER_MINUTE_LIMIT'&&x.retryAfter>0));
  });
  await t.test('different owner and preview use independent buckets; tables cannot be read or reset by users',async()=>{
   await asUser(B);assert.equal((await quota()).allowed,true);await assert.rejects(db.query('select * from public.heda_ai_usage'));await assert.rejects(db.query('delete from public.heda_ai_global_usage'));
   await asUser(A);assert.equal((await quota('preview')).allowed,true);await assert.rejects(quota('unknown'));
  });
  await t.test('daily quota cannot be bypassed by waiting for another minute',async()=>{
   await db.exec('reset role');await db.query("update public.heda_ai_usage set day_count=60,minute_count=0,minute_start=now()-interval '1 minute' where user_id=$1 and kind='chat'",[A]);await asUser(A);const result=await quota();assert.equal(result.code,'AI_USER_DAILY_LIMIT');assert.ok(result.retryAfter>0);
  });
  await t.test('UTC day rollover resets per-user counters; shared cap still blocks new accounts',async()=>{
   await db.exec('reset role');await db.query("update public.heda_ai_usage set usage_day=usage_day-1,minute_start=now()-interval '1 minute' where user_id=$1",[A]);await asUser(A);assert.equal((await quota()).allowed,true);
   await db.exec('reset role');await db.exec('update public.heda_ai_global_usage set chat_count=300');await asUser(B);assert.equal((await quota()).code,'AI_GLOBAL_LIMIT');
  });
  await t.test('anonymous and unauthenticated callers cannot consume quotas or read counters',async()=>{
   await db.exec('reset role;set role anon');await assert.rejects(quota());await assert.rejects(db.query('select * from public.heda_ai_usage'));
   await asUser('');await assert.rejects(quota());
  });
 }finally{await db.close();}
});
