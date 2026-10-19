import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {reserveAIQuota,readHedaRequest}=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../supabase/functions/heda-ai/security.js',import.meta.url),'utf8')).toString('base64'));
test('server quota uses only the authenticated RPC, never a user ID or client limits',async()=>{
 let captured;const result=await reserveAIQuota({rpc:async(...args)=>{captured=args;return {data:{allowed:true,remainingToday:59}};}},'chat');assert.deepEqual(captured,['heda_take_ai_quota',{p_kind:'chat'}]);assert.equal(result.remainingToday,59);
});
test('quota exhaustion and missing migration fail closed with actionable errors',async()=>{
 await assert.rejects(reserveAIQuota({rpc:async()=>({error:{code:'PGRST202'}})},'chat'),/AI_LIMITS_UNAVAILABLE/);
 for(const code of ['AI_GLOBAL_LIMIT','AI_USER_DAILY_LIMIT','AI_USER_MINUTE_LIMIT'])await assert.rejects(reserveAIQuota({rpc:async()=>({data:{allowed:false,code,retryAfter:60}})},'chat'),error=>error.status===429&&error.code===code&&error.retryAfter===60);
});
test('bounded JSON reader rejects wrong content type, arrays, invalid JSON and oversized streamed bodies',async()=>{
 const req=(body,type='application/json')=>new Request('https://example.test',{method:'POST',headers:{'Content-Type':type},body});
 assert.deepEqual(await readHedaRequest(req('{"message":"Hola"}')),{message:'Hola'});
 for(const request of [req('x','text/plain'),req('[]'),req('null'),req('bad')])await assert.rejects(readHedaRequest(request),error=>[400,415].includes(error.status));
 await assert.rejects(readHedaRequest(req(JSON.stringify({message:'x'.repeat(200)})),100),error=>error.status===413);
});
