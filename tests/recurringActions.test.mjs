import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const {confirmRecurring}=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../services/recurringActions.js',import.meta.url),'utf8')).toString('base64'));
const rule={id:'rule',next_date:'2026-10-01',card_id:'owned-card'};
test('confirmation matches the database signature and leaves card resolution on the server',async()=>{
 let sent;const client={auth:{getUser:async()=>({data:{user:{id:'owner'}}})},rpc:async(name,args)=>{sent={name,args};assert.deepEqual(Object.keys(args).sort(),['p_date','p_id']);return {data:'confirmed-transaction'};}};
 assert.equal(await confirmRecurring(client,'owner',rule),'confirmed-transaction');assert.deepEqual(sent,{name:'heda_confirm_recurring',args:{p_id:'rule',p_date:'2026-10-01'}});
});
test('an account change never confirms the previous users recurring movement',async()=>{
 const client={auth:{getUser:async()=>({data:{user:{id:'other'}}})},rpc:()=>assert.fail('must not confirm')};await assert.rejects(confirmRecurring(client,'owner',rule),/sesión cambió/);
});
test('rejections and missing receipts never claim a successful payment',async()=>{
 for(const result of [{data:null},{error:{code:'PGRST202'}},{error:{code:'P0001',message:'La fecha cambió; actualiza la lista'}}]){
 const client={auth:{getUser:async()=>({data:{user:{id:'owner'}}})},rpc:async()=>result};await assert.rejects(confirmRecurring(client,'owner',rule));
 }
});
