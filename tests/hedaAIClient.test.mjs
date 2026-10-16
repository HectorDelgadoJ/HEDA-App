import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../services/hedaAI.js',import.meta.url),'utf8').replace(/import \{ supabase \} from '.\/supabase';/, '').replaceAll('export async function','async function');
const client=invoke=>({auth:{getSession:async()=>({data:{session:{user:{id:'test'}}}})},functions:{invoke}});
const make=mock=>new Function('supabase',source+'; return sendMessageToHedaAI;')(mock);
test('quota response keeps status and code for the dedicated UI notice',async()=>{
 const send=make(client(async()=>({data:null,error:{context:Response.json({error:'AI_RATE_LIMIT',message:'Cuota alcanzada'},{status:429})}})));
 await assert.rejects(send('Pregunta'),error=>error.code==='AI_RATE_LIMIT' && error.status===429 && error.message==='Cuota alcanzada');
});
test('success forwards response and sends only trimmed question to the authenticated function',async()=>{
 let captured;const data={ok:true,message:'Respuesta',webEnabled:false,sources:[]};
 const send=make(client(async(name,options)=>{captured={name,options};return {data,error:null};}));
 assert.equal(await send('  Hola  '),data);assert.equal(captured.name,'heda-ai');assert.deepEqual(captured.options.body,{message:'Hola'});
});
test('missing session prevents provider calls and generic network errors have a useful message',async()=>{
 let calls=0;const mock=client(async()=>{calls++;});mock.auth.getSession=async()=>({data:{session:null}});
 await assert.rejects(make(mock)('Pregunta'),/iniciar sesión/);assert.equal(calls,0);
 await assert.rejects(make(client(async()=>({error:{}})))('Pregunta'),/Revisa tu conexión/);
});

test('follow-up forwards bounded history and detects an outdated deployed function',async()=>{
 const history=[{role:'user',text:'Pregunta'},{role:'model',text:'Respuesta'}];let body;
 const send=make(client(async(name,options)=>{body=options.body;return {data:{ok:true,message:'Seguimiento',chatVersion:1}};}));
 assert.equal((await send('Más',history)).message,'Seguimiento');assert.deepEqual(body,{message:'Más',history});
 await assert.rejects(make(client(async()=>({data:{ok:true,message:'Old'}})))('Más',history),/versión de conversación/);
});
test('new conversation can abort a pending request without reporting a false timeout',async()=>{
 const controller=new AbortController();const send=make(client(async(name,options)=>new Promise(resolve=>options.signal.addEventListener('abort',()=>resolve({error:{}})))));
 const pending=send('Pregunta',[],{signal:controller.signal});await new Promise(resolve=>setTimeout(resolve,0));controller.abort();await assert.rejects(pending,error=>error.name==='AbortError');
});

test('financial preview never requests a model answer and requires the updated function',async()=>{
 const mock=client(async(name,options)=>{assert.deepEqual(options.body,{action:'financial_preview'});return {data:{ok:true,financialVersion:1,summary:{currency:'MXN'},summaryDigest:'digest'}};});
 const preview=new Function('supabase',source+'; return previewHedaFinances;')(mock);assert.equal((await preview()).summary.currency,'MXN');
});
test('financial analysis sends consent and digest, never a client-calculated summary',async()=>{
 let body;const send=make(client(async(name,options)=>{body=options.body;return {data:{ok:true,message:'Análisis',financialSummaryUsed:true}};}));
 await send('Analiza',[],{summaryDigest:'approved-digest'});assert.deepEqual(body,{message:'Analiza',financialConsent:true,summaryDigest:'approved-digest'});
 await assert.rejects(make(client(async()=>({data:{ok:true,message:'Old'}})))('Analiza',[],{summaryDigest:'approved-digest'}),/versión de análisis/);
});
