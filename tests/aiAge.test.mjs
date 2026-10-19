import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const {assertAIAdult}=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../supabase/functions/heda-ai/security.js',import.meta.url),'utf8')).toString('base64'));
test('Gemini access requires server age eligibility and never receives birth dates or user metadata',async()=>{
 await assertAIAdult({rpc:async(name,args)=>{assert.equal(name,'heda_ai_age_eligible');assert.equal(args,undefined);return {data:true};}});
 for(const [response,code] of [[{data:false},'AI_AGE_RESTRICTED'],[{data:null},'AI_AGE_REQUIRED'],[{error:{}},'AI_AGE_UNAVAILABLE']])await assert.rejects(assertAIAdult({rpc:async()=>response}),e=>e.code===code);
});
