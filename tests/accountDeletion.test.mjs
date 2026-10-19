import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const load=async p=>import('data:text/javascript;base64,'+Buffer.from(read(p)).toString('base64'));
const {handleDeleteAccount,readDeleteBody}=await load('../supabase/functions/delete-account/handler.js');
const {invokeAccountDeletion,finishDeletedAccount,accountDeviceKeys}=await load('../services/accountDeletion.js');
const user={id:'owner',email:'owner@example.com'};
function mock(overrides={}){const calls=[];return {calls,api:{getUser:async()=>({data:{user}}),sendCode:async(...args)=>{calls.push(['send',...args]);return {};},verifyCode:async(...args)=>{calls.push(['verify',...args]);return {data:{user,session:{access_token:'proof'}}};},deleteUser:async(...args)=>{calls.push(['delete',...args]);return {};},closeProof:async()=>{calls.push(['close']);},...overrides}};}
const body={action:'delete',confirmation:'ELIMINAR',code:'001234'};
test('unauthenticated, spoofed IDs, missing confirmation and malformed codes cannot delete',async()=>{
 for(const input of [{...body,user_id:'victim'},{...body,id:'victim'},{...body,confirmation:true},{...body,code:'bad'},{}]){const {api,calls}=mock();assert.notEqual((await handleDeleteAccount(input,api)).status,200);assert.equal(calls.length,0);}
 const {api,calls}=mock({getUser:async()=>({error:{code:'expired'}})});assert.equal((await handleDeleteAccount(body,api)).status,401);assert.equal(calls.length,0);
});
test('request sends only to the server-verified account and forwards CAPTCHA without creating users',async()=>{
 const {api,calls}=mock();const result=await handleDeleteAccount({action:'send_code',captchaToken:'test-challenge'},api);assert.equal(result.body.sent,true);assert.deepEqual(calls,[['send',user.email,'test-challenge']]);
 const limited=mock({sendCode:async()=>({error:{status:429}})});assert.equal((await handleDeleteAccount({action:'send_code'},limited.api)).status,429);
});
test('deletion requires proof of this same user; invalid proof never reaches admin',async()=>{
 for(const response of [{error:{message:'raw private detail'}},{data:{user,session:null}},{data:{user:{id:'victim',email:user.email},session:{}}},{data:{user:{...user,email:'other@example.com'},session:{}}}]){
 const {api,calls}=mock({verifyCode:async()=>response});const result=await handleDeleteAccount(body,api);assert.equal(result.body.error,'CODE_INVALID');assert.equal(calls.some(x=>x[0]==='delete'),false);assert.deepEqual(calls.at(-1),['close']);assert.ok(!JSON.stringify(result).includes('raw private detail'));
 }
});
test('valid confirmation hard-deletes only the authenticated ID and cleans up the proof session',async()=>{
 const {api,calls}=mock();const result=await handleDeleteAccount(body,api);assert.deepEqual(result,{status:200,body:{ok:true,deleted:true}});assert.deepEqual(calls,[['verify',user.email,'001234'],['delete','owner',false],['close']]);
 const failed=mock({deleteUser:async()=>({error:{message:'storage private detail'}})});assert.equal((await handleDeleteAccount(body,failed.api)).body.error,'DELETE_FAILED');assert.deepEqual(failed.calls.at(-1),['close']);
});
test('body size, type and shape are bounded before the destructive operation',async()=>{
 assert.deepEqual(await readDeleteBody(new Request('https://example.com',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})),body);
 for(const payload of ['[]','null','bad','"'+'a'.repeat(5000)+'"'])await assert.rejects(readDeleteBody(new Request('https://example.com',{method:'POST',headers:{'Content-Type':'application/json'},body:payload})));
 await assert.rejects(readDeleteBody(new Request('https://example.com',{method:'POST',body:'{}'})));
});
test('client binds the request to the opened account and surfaces deployment failures',async()=>{
 let sent;const client={auth:{getSession:async()=>({data:{session:{user,access_token:'original-token'}}})},functions:{invoke:async(...args)=>{sent=args;return {data:{ok:true,deleted:true}};}}};
 await assert.rejects(invokeAccountDeletion(client,'other',body),/sesión cambió/);assert.equal(sent,undefined);
 await invokeAccountDeletion(client,'owner',body);assert.equal(sent[0],'delete-account');assert.deepEqual(sent[1].headers,{Authorization:'Bearer original-token'});assert.ok(!('user_id' in sent[1].body));
 client.functions.invoke=async()=>({error:{context:new Response('{}',{status:404})}});await assert.rejects(invokeAccountDeletion(client,'owner',body),/Falta desplegar/);
});
test('device cleanup preserves other accounts and still signs out if optional cleanup fails',async()=>{
 const calls=[],client={auth:{getSession:async()=>({data:{session:{user}}}),signOut:async options=>{calls.push(['out',options]);return {};}}};
 const warnings=await finishDeletedAccount(client,'owner',{storage:{multiRemove:async keys=>{calls.push(['keys',keys]);throw Error('disk');}},cancelReminders:async id=>{calls.push(['reminders',id]);}});
 assert.equal(warnings.length,1);assert.deepEqual(calls.find(x=>x[0]==='keys')[1],accountDeviceKeys('owner'));assert.ok(calls.find(x=>x[0]==='keys')[1].every(key=>key.endsWith(':owner')));assert.deepEqual(calls[0],['out',{scope:'local'}]);
 client.auth.getSession=async()=>({data:{session:{user:{id:'other'}}}});client.auth.signOut=()=>assert.fail('must not sign out another account');await finishDeletedAccount(client,'owner',{storage:{multiRemove:async()=>{}},cancelReminders:async()=>{}});
});
test('dashboard single-file bundle exactly matches the reviewed sources',()=>{
 const source=read('../supabase/functions/delete-account/index.ts').replace('import { handleDeleteAccount, readDeleteBody } from "./handler.js";','');
 assert.equal(read('../supabase/delete-account-dashboard.ts'),'// Edge Function delete-account. Paste into Edge Functions, not SQL Editor.\n'+read('../supabase/functions/delete-account/handler.js')+'\n'+source);
});

test('network timeout never claims a deletion succeeded and does not retry automatically',async()=>{
 let calls=0;const client={auth:{getSession:async()=>({data:{session:{user,access_token:'token'}}})},functions:{invoke:async(name,options)=>{calls++;await new Promise(resolve=>options.signal.addEventListener('abort',resolve,{once:true}));return {error:{}};}}};
 await assert.rejects(invokeAccountDeletion(client,user.id,body,{timeoutMs:1}),/Comprueba si tu cuenta sigue activa/);assert.equal(calls,1);
});
