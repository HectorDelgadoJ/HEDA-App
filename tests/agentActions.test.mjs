import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8'),url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const actions=url(read('../supabase/functions/heda-ai/actions.js')),gemini=url(read('../supabase/functions/heda-ai/gemini.js')),summary=url(read('../supabase/functions/heda-ai/financial-summary.js'));
const {validateAppAction}=await import(actions);const {encodeMovementQR,decodeMovementQR}=await import(url(read('../utils/qrMovement.js').replace("'../supabase/functions/heda-ai/actions'",JSON.stringify(actions))));
const {createAgentClient,handleAgentBody,loadAgentContext,personalDataQuestion,cashFlowReply,appOperationIntent,publicMarketQuestion}=await import(url(read('../supabase/functions/heda-ai/agent.js').replace("'./gemini.js'",JSON.stringify(gemini)).replace("'./financial-summary.js'",JSON.stringify(summary)).replace("'./actions.js'",JSON.stringify(actions))));
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

test('cash-flow question requests access directly instead of a generic no-access answer',async()=>{
 let calls=0;
 const result=await handleAgentBody({action:'assistant',message:'Puedes decirme cómo va mi flujo de efectivo?',appConsent:false},{userClaims:{id},supabase:{from(){throw Error('No consent');}}},async()=>{calls++;throw Error('Must not ask model for this permission');});
 assert.equal(calls,0);assert.equal(result.needsAppConsent,true);assert.match(result.message,/consultarlos/);
 assert.equal(personalDataQuestion('¿Cuánto tengo?'),true);assert.equal(personalDataQuestion('Qué es el flujo de efectivo'),false);
});
test('cash-flow response uses verified cash change and distinguishes credit purchases from card payments',()=>{
 const summary={period:{start:'2026-10-01',end:'2026-10-25'},availableBalance:2300,monthly:{income:1000,expenses:700,cardPayments:200,cashChange:800,transactionCount:3}};
 const answer=cashFlowReply('cómo va mi flujo de efectivo',summary);assert.ok(answer.includes('$800.00 MXN'));assert.ok(answer.includes('$700.00 MXN'));assert.ok(answer.includes('$200.00 MXN'));assert.ok(answer.includes('2026-10-01'));assert.ok(!answer.includes('No tengo acceso'));
 assert.equal(cashFlowReply('Cómo va mi flujo del mes pasado',summary),null);
 assert.equal(cashFlowReply('Revisa mi flujo y crea una meta de 500',summary),null);
 assert.match(cashFlowReply('mi flujo de efectivo',{...summary,monthly:{...summary.monthly,transactionCount:0}}),/no asumiré/);
});

test('app requests cannot fall back to the old public prompt that denies creation tools',()=>{
 for(const message of ['Puedes anotar un gasto de 1000 pesos en la BBVA?','Crea una meta de ahorro','Puedes agregarlo por mi? Registra un gasto']){assert.equal(appOperationIntent(message),true);assert.equal(publicMarketQuestion(message),false);}
 assert.equal(publicMarketQuestion('Cuál es la cotización actual de Ethereum?'),true);
 assert.equal(publicMarketQuestion('Cuál es mi saldo actual?'),false);
});

test('Ethereum tool consults authenticated module and preserves historical warning',async()=>{
 const answer=await handleAgentBody({action:'assistant',message:'Tendencia Ethereum'}, {userClaims:{id},supabase:{functions:{invoke:async(name)=>{assert.equal(name,'ethereum-forecast');return {data:{ok:true,ethereumVersion:1,dataMode:'training_snapshot',asOf:'2026-10-24',lastCandle:{close:100},forecasts:[{horizonDays:1,targetDate:'2026-10-25',trend:'estable'}],model:{reports:{'1':{models:{LSTM:{test:{macroF1:.35}}}}}},warning:'Histórico'}};}}}},async()=>({ok:true,needsEthereum:true,agentVersion:1,chatVersion:1}));
 assert.equal(answer.ethereumUsed,true);assert.match(answer.message,/histórica/);assert.match(answer.message,/desempeño es bajo/);assert.ok(!answer.proposals?.length);
});
