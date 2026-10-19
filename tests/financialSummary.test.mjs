import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../supabase/functions/heda-ai/financial-summary.js',import.meta.url),'utf8');
const {calculateFinancialSummary,summaryDate,loadFinancialPreview,handleHedaBody}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const now=new Date('2026-10-15T18:00:00Z');
const tx=(id,type,amount,date='2026-10-10',extra={})=>({id,user_id:'A',type,amount,transaction_date:date,category:'Comida',...extra});
const database=()=>({transactions:[tx('1','income',10000),tx('2','expense',100,'2026-10-10',{card_id:'card'}),tx('3','expense',1100,'2026-10-11',{card_id:'card',is_card_payment:true}),tx('4','expense',0.1),tx('5','expense',0.2)],card_payments:[{id:'card',user_id:'A',ledger_enabled:true,opening_balance:1000}],goals:[{id:'goal',user_id:'A',status:'active',target_amount:2000,current_amount:500}]});
function mockClient(db,pageLimit=1000){
 const calls=[];return {calls,from(table){const call={table};calls.push(call);let columns,userId,start=0,end=0,today;
 const q={select(value){columns=value;call.columns=value;return q;},eq(key,value){assert.equal(key,'user_id');userId=value;call.userId=value;return q;},order(){return q;},range(a,b){start=a;end=b;return q;},lte(key,value){assert.equal(key,'transaction_date');today=value;return q;},async abortSignal(){const all=(db[table] || []).filter(row=>row.user_id===userId&&(!today||row.transaction_date<=today));const data=all.slice(start,Math.min(end+1,start+pageLimit)).map(row=>Object.fromEntries(columns.split(',').map(key=>[key,row[key]])));return {data,count:all.length,error:null};}};return q;}};
}
test('summary distinguishes income, credit spending, payments, debt and exact cents',()=>{
 const db=database();const s=calculateFinancialSummary(db.transactions,db.card_payments,db.goals,'2026-10-15');
 assert.equal(s.availableBalance,8899.7);assert.equal(s.monthly.income,10000);assert.equal(s.monthly.expenses,100.3);assert.equal(s.monthly.result,9899.7);assert.equal(s.monthly.cardPayments,1100);assert.equal(s.cards.debt,0);assert.equal(s.goals.remaining,1500);assert.equal(s.goals.progressPercent,25);
});
test('debt is not offset by credit on another card and untracked reminders are not treated as calculated debt',()=>{
 const s=calculateFinancialSummary([],[{id:'a',ledger_enabled:true,opening_balance:100},{id:'b',ledger_enabled:true,opening_balance:0},{id:'c',ledger_enabled:false,amount:900,paid:false}],[],'2026-10-15');assert.equal(s.cards.debt,100);assert.equal(s.cards.untrackedReminderCount,1);
 const t=calculateFinancialSummary([tx('1','expense',200,'2026-10-10',{card_id:'b',is_card_payment:true})],[{id:'a',ledger_enabled:true,opening_balance:100},{id:'b',ledger_enabled:true,opening_balance:0}],[],'2026-10-15');assert.equal(t.cards.debt,100);assert.equal(t.cards.credit,200);
});
test('custom categories and identifying fields cannot leak into the aggregate',()=>{
 const db=database();db.transactions.push(tx('6','expense',20,'2026-10-10',{category:'Pago a Juan mail@example.org',description:'private-note'}));db.card_payments[0].name='private-card';db.goals[0].name='private-goal';
 const s=calculateFinancialSummary(db.transactions,db.card_payments,db.goals,'2026-10-15');const json=JSON.stringify(s);for(const privateText of ['Juan','mail@','private-note','private-card','private-goal','user_id','card_id','description'])assert.ok(!json.includes(privateText));assert.equal(s.monthly.categories.find(item=>item.category==='Otros').amount,20);
});
test('period uses Mexico City date, excludes future transactions and keeps earlier balance',()=>{
 assert.equal(summaryDate(new Date('2026-11-01T02:00:00Z')),'2026-10-31');const s=calculateFinancialSummary([tx('old','income',100,'2026-09-30'),tx('today','expense',10),tx('future','income',999,'2026-10-20')],[],[],'2026-10-15');assert.equal(s.availableBalance,90);assert.equal(s.monthly.income,0);assert.equal(s.monthly.expenses,10);
});
test('preview reads only selected columns and authenticated owner, paginates without dropping rows, and never invokes Gemini',async()=>{
 const db=database();db.transactions.push({...tx('foreign','income',999999),user_id:'B'});const client=mockClient(db,2);let modelCalls=0;
 const result=await handleHedaBody({action:'financial_preview',userId:'B'},{userClaims:{id:'A'},supabase:client},async()=>{modelCalls++;},true,now);
 assert.equal(result.status,200);assert.equal(result.body.summary.monthly.income,10000);assert.equal(modelCalls,0);assert.match(result.body.summaryDigest,/^[a-f0-9]{64}$/);assert.ok(client.calls.length>3);for(const call of client.calls){assert.equal(call.userId,'A');assert.ok(!/name|description|email/.test(call.columns));}
});
test('server ignores forged summaries and requires explicit consent plus an unchanged owner-bound preview',async()=>{
 const db=database();const client=mockClient(db);const ctx={userClaims:{id:'A'},supabase:client};const captured=[];const ask=async(...args)=>{captured.push(args);return {ok:true,message:'Answer'};};
 await handleHedaBody({message:'Hola',financialSummary:{income:999}},ctx,ask,true,now);assert.equal(captured[0][2],null);assert.equal(client.calls.length,0);
 const preview=await loadFinancialPreview(client,'A',now);const result=await handleHedaBody({message:'Analiza',financialConsent:true,summaryDigest:preview.summaryDigest,financialSummary:{income:999}},ctx,ask,true,now);assert.equal(result.status,200);assert.equal(result.body.financialSummaryUsed,true);assert.equal(captured.at(-1)[2].monthly.income,10000);
 const before=captured.length;const denied=await handleHedaBody({message:'Analiza',summaryDigest:preview.summaryDigest},ctx,ask,true,now);assert.equal(denied.status,400);assert.equal(captured.length,before);
 db.transactions.push(tx('new','expense',50));const changed=await handleHedaBody({message:'Analiza',financialConsent:true,summaryDigest:preview.summaryDigest},ctx,ask,true,now);assert.equal(changed.status,409);assert.equal(changed.body.error,'SUMMARY_CHANGED');assert.equal(captured.length,before);
});
test('unauthenticated or disabled requests cannot read the database or call the provider',async()=>{
 const client={from(){throw new Error('must not query');}};const ask=()=>{throw new Error('must not call');};
 assert.equal((await handleHedaBody({action:'financial_preview'},{supabase:client},ask,true,now)).status,401);
 assert.equal((await handleHedaBody({action:'financial_preview'},{supabase:client,userClaims:{id:'A'}},ask,false,now)).status,503);
});
test('database errors stop the preview instead of generating a partial analysis',async()=>{
 const client={from(){const q={select(){return q;},eq(){return q;},order(){return q;},range(){return q;},lte(){return q;},abortSignal:async()=>({data:null,count:null,error:{message:'failed'}})};return q;}};
 await assert.rejects(loadFinancialPreview(client,'A',now),/SUMMARY_LOAD_FAILED/);
});

test('budget summary uses actual purchases, exact thresholds and contains no custom category names',()=>{
 const rows=[tx('1','expense',80,'2026-10-10',{category:' private category '}),tx('2','expense',90,'2026-10-10',{category:'Comida',is_card_payment:true})];
 const summary=calculateFinancialSummary(rows,[],[],'2026-10-15',[{category:'PRIVATE CATEGORY',monthly_limit:100},{category:'Comida',monthly_limit:50}]);
 assert.deepEqual(summary.budgets,{configuredCount:2,nearCount:1,reachedCount:0,monthlyLimitTotal:150,spentInBudgetedCategories:80});
 assert.equal(summary.coverage.sparseMonth,true);assert.ok(!JSON.stringify(summary).includes('private category'));
});
test('empty month produces an actionable response without spending API quota',async()=>{
 const db={transactions:[],card_payments:[],goals:[],budgets:[]};const client=mockClient(db);const preview=await loadFinancialPreview(client,'A',now);let calls=0;
 const response=await handleHedaBody({message:'Analiza',financialConsent:true,summaryDigest:preview.summaryDigest},{userClaims:{id:'A'},supabase:client},async()=>calls++,true,now);
 assert.equal(response.status,422);assert.equal(response.body.error,'SUMMARY_NO_DATA');assert.equal(calls,0);
});
test('different owners cannot reuse a consent digest even when their recorded totals match',async()=>{
 const db=database();const a=await loadFinancialPreview(mockClient(db),'A',now);
 const bdb=Object.fromEntries(Object.entries(db).map(([table,rows])=>[table,rows.map(row=>({...row,user_id:'B'}))]));
 let calls=0;const response=await handleHedaBody({message:'Analiza',financialConsent:true,summaryDigest:a.summaryDigest},{userClaims:{id:'B'},supabase:mockClient(bdb)},async()=>calls++,true,now);
 assert.equal(response.status,409);assert.equal(calls,0);
});
test('invalid money cannot silently become a false financial summary',()=>{
 assert.throws(()=>calculateFinancialSummary([tx('bad','income','NaN')],[],[],'2026-10-15'),/SUMMARY_INVALID_DATA/);
});
