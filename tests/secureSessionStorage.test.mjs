import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {createSecureSessionStorage}=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../utils/secureSessionStorage.js',import.meta.url),'utf8')).toString('base64'));
function fixture(){const secure=new Map(),plain=new Map(),writes=[];let seq=0,fail=false;
 const store=createSecureSessionStorage({getItemAsync:async k=>secure.get(k)??null,setItemAsync:async(k,v)=>{if(fail)throw new Error('SECURE_WRITE_FAILED');writes.push(v);secure.set(k,v);},deleteItemAsync:async k=>secure.delete(k)},{getItem:async k=>plain.get(k)??null,setItem:async(k,v)=>plain.set(k,v),removeItem:async k=>plain.delete(k)},()=>`id-${++seq}`);
 return {store,secure,plain,writes,setFail:value=>fail=value};}
test('large Unicode sessions round-trip in protected chunks below native value limits',async()=>{
 const f=fixture(),value=JSON.stringify({access_token:'test-only-'.repeat(800),name:'🌻á'.repeat(1000)});await f.store.setItem('session',value);assert.equal(await f.store.getItem('session'),value);assert.ok(f.writes.every(value=>Buffer.byteLength(value,'utf8')<2048));assert.equal(f.plain.size,0);
});
test('legacy plaintext migrates once and is removed only after protected write succeeds',async()=>{
 const f=fixture();f.plain.set('session','legacy-test-token');f.setFail(true);await assert.rejects(f.store.getItem('session'),/SECURE_WRITE_FAILED/);assert.equal(f.plain.get('session'),'legacy-test-token');f.setFail(false);assert.equal(await f.store.getItem('session'),'legacy-test-token');assert.equal(f.plain.size,0);assert.equal(await f.store.getItem('session'),'legacy-test-token');
});
test('failed replacement preserves the previous secure session and never falls back to plaintext',async()=>{
 const f=fixture();await f.store.setItem('session','old');f.setFail(true);await assert.rejects(f.store.setItem('session','new'));assert.equal(await f.store.getItem('session'),'old');
});
test('concurrent refresh then logout cannot resurrect a session; all chunks and legacy token are removed',async()=>{
 const f=fixture();await f.store.setItem('session','first');f.plain.set('session','stale');await Promise.all([f.store.setItem('session','refreshed'),f.store.removeItem('session')]);assert.equal(await f.store.getItem('session'),null);assert.equal(f.secure.size,0);assert.equal(f.plain.size,0);
});
test('missing protected chunks fail closed even if a stale plaintext copy exists',async()=>{
 const f=fixture();await f.store.setItem('session','protected');f.secure.delete([...f.secure.keys()].find(k=>k.includes('.part.')));f.plain.set('session','stale');await assert.rejects(f.store.getItem('session'),/SECURE_SESSION_INCOMPLETE/);assert.equal(f.plain.size,0);
});
