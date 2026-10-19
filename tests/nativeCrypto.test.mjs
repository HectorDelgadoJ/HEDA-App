import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
const {installNativeCrypto}=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../utils/nativeCrypto.js',import.meta.url),'utf8')).toString('base64'));
test('PKCE crypto bridge provides SHA-256 and native random values without a plain fallback',async()=>{
 const target={},native={getRandomValues:values=>webcrypto.getRandomValues(values),digest:(name,data)=>webcrypto.subtle.digest(name,data)};installNativeCrypto(target,native);
 const value=new Uint8Array(16);assert.equal(target.crypto.getRandomValues(value),value);assert.ok(value.some(x=>x!==0));
 const hash=await target.crypto.subtle.digest('SHA-256',new TextEncoder().encode('abc'));assert.equal(Buffer.from(hash).toString('hex'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
 await assert.rejects(target.crypto.subtle.digest('MD5',new Uint8Array()),/Unsupported/);
});
test('existing WebCrypto implementations are preserved',()=>{
 const target={crypto:{getRandomValues:()=>{},subtle:{digest:()=>{}}}},random=target.crypto.getRandomValues,digest=target.crypto.subtle.digest;installNativeCrypto(target,{});assert.equal(target.crypto.getRandomValues,random);assert.equal(target.crypto.subtle.digest,digest);
});
