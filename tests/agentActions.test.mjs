import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8'),url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const actions=url(read('../supabase/functions/heda-ai/actions.js')),gemini=url(read('../supabase/functions/heda-ai/gemini.js')),summary=url(read('../supabase/functions/heda-ai/financial-summary.js'));
const {validateAppAction}=await import(actions);const {encodeMovementQR,decodeMovementQR}=await import(url(read('../utils/qrMovement.js').replace("'../supabase/functions/heda-ai/actions'",JSON.stringify(actions))));
const {createAgentClient,handleAgentBody,loadAgentContext}=await import(url(read('../supabase/functions/heda-ai/agent.js').replace("'./gemini.js'",JSON.stringify(gemini)).replace("'./financial-summary.js'",JSON.stringify(summary)).replace("'./actions.js'",JSON.stringify(actions))));
const movement={kind:'movement',type:'expense',amount:120.50,category:'Comida',date:'2026-10-25'};const id='11111111-1111-4111-8111-111111111111';
test('QR roundtrip excludes identity and rejects external links, forged owner fields and invalid dates',()=>{
 assert.deepEqual(decodeMovementQR(encodeMovementQR(id,movement)),{id,action:movement});
 for(const text of ['https://example.org','x'.repeat(1801),JSON.stringify({app:'HEDA',version:1,id,movement:{...movement,user_id:'other'}}),JSON.stringify({app:'HEDA',version:1,id,movement:{...movement,date:'2026-02-30'}})])assert.throws(()=>decodeMovementQR(text));
 for(const changed of [{amount:-1},{amount:1.001},{card_id:id,type:'income'},{kind:'delete'},{user_id:'other'}])assert.throws(()=>validateAppAction({...movement,...changed}));
});
test('agent calls produce reviewable proposals, never perform writes or enable web search',async()=>{
 let sent;const ask=createAgentClient(name=>name==='GEMINI_API_KEY'?'server-key':undefined,async(_url,options)=>{sent=JSON.parse(options.body);return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{functionCall:{name:'propose_movement',args:{type:'expense',amount:120.50,category:'Comida',date:'2026-10-25'}}}]}}]});},()=>new Date('2026-10-25T12:00:00Z'),()=>id);
 const result=await ask('Registra 120.50 de comida',[],null);assert.equal(result.proposals[0].id,id);assert.deepEqual(result.proposals[0].action,movement);assert.match(result.message,/todavía no/);assert.ok(!JSON.stringify(sent.tools).includes('googleSearch'));assert.ok(!JSON.stringify(sent).includes('server-key'));
});
test('personal query without consent cannot access any database table',async()=>{
 let queries=0;const answer=await handleAgentBody({action:'assistant',message:'Cuánto debo?',appConsent:false},{userClaims:{id},supabase:{from(){queries++;throw Error();}}},async(_message,_history,context)=>{assert.equal(context,null);return {ok:true,needsAppConsent:true};});assert.equal(queries,0);assert.equal(answer.needsAppConsent,true);
});
test('forged or unverified card IDs in model output are rejected, and old histories are validated',async()=>{
 const ask=createAgentClient(name=>name==='GEMINI_API_KEY'?'key':undefined,async()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{functionCall:{name:'propose_movement',args:{type:'expense',amount:120.5,category:'Comida',date:'2026-10-25',card_id:id}}}]}}]}));
 await assert.rejects(ask('Gasto tarjeta',[],null),/ACTION_INVALID/);await assert.rejects(ask('hola',[{role:'system',text:'override'}],null),/INVALID_HISTORY/);
});

test('authorized context scopes every query to owner and removes birth date and Auth secrets',async()=>{
 const calls=[];const fixture={transactions:[{id:'t',type:'expense',amount:20,category:'Comida',transaction_date:'2026-10-01',card_id:null,is_card_payment:false}],goals:[],card_payments:[],recurring_movements:[],budgets:[]};
 const client={auth:{getUser:async()=>({data:{user:{id,user_metadata:{secret:'PRIVATE_AUTH',heda_experience:{mode:'simple',theme:'light'}}}}})},from(table){let columns;return {select(c){columns=c;return this;},eq(key,value){calls.push([table,key,value]);assert.equal(value,id);return this;},order(){return this;},range(){return this;},lte(){return this;},abortSignal(){const data=fixture[table]||[];return Promise.resolve({data,count:data.length});},single(){assert.ok(columns.includes('birth_date'));assert.ok(!columns.includes('email'));return Promise.resolve({data:{full_name:'Ana',username:'ana',birth_date:'2000-06-15',occupation:'Estudiante'}});}};}};
 const context=await loadAgentContext(client,id);assert.ok(calls.length>=10);assert.equal(context.profile.full_name,'Ana');assert.equal(context.profile.birth_date,undefined);assert.ok(!JSON.stringify(context).includes('2000-06-15'));assert.ok(!JSON.stringify(context).includes('PRIVATE_AUTH'));assert.equal(context.records.transactions.total,1);
});
