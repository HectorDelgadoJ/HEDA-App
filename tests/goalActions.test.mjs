import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');const plan=url(readFileSync(new URL('../utils/goalPlan.js',import.meta.url),'utf8'));
const {addGoalContribution,setGoalDeadline}=await import(url(readFileSync(new URL('../services/goalActions.js',import.meta.url),'utf8').replace("'../utils/goalPlan'",JSON.stringify(plan))));
const goal={id:'own-goal',user_id:'owner',target_amount:1000,current_amount:250,status:'active'};
function mock(result={data:{...goal,current_amount:350}}){const filters=[],updates=[];const query={update:value=>{updates.push(value);return query;},eq:(...args)=>{filters.push(args);return query;},select:()=>query,single:async()=>result};return {filters,updates,auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from:()=>query};}
test('an own contribution uses compare-and-swap to reject stale balances and preserves cents',async()=>{
 const client=mock();const saved=await addGoalContribution(client,'owner',goal,'100');assert.equal(saved.current_amount,350);assert.ok(client.filters.some(([key,value])=>key==='current_amount'&&value===250));assert.ok(client.filters.some(([key,value])=>key==='user_id'&&value==='owner'));assert.ok(client.filters.some(([key,value])=>key==='status'&&value==='active'));assert.equal(client.updates[0].current_amount,350);
});
test('conflicting, absent and cross-account results never claim a saved contribution',async()=>{
 for(const result of [{data:null,error:{code:'PGRST116'}},{data:{...goal,user_id:'other'}}])await assert.rejects(addGoalContribution(mock(result),'owner',goal,'100'),/No se pudo comprobar/);
 const client=mock();await assert.rejects(addGoalContribution(client,'other',goal,'100'),/sesión cambió/);assert.equal(client.updates.length,0);
});
test('changing the deadline only updates the date and checks ownership and validation',async()=>{
 const client=mock();await setGoalDeadline(client,'owner',goal,'2026-12-01','2026-10-27');assert.equal(client.updates[0].target_date,'2026-12-01');assert.equal('current_amount' in client.updates[0],false);
 await assert.rejects(setGoalDeadline(mock(),'owner',goal,'2026-02-30','2026-10-27'),/válida/);
 const clearing=mock();await setGoalDeadline(clearing,'owner',goal,'','2026-10-27');assert.equal(clearing.updates[0].target_date,null);
});
