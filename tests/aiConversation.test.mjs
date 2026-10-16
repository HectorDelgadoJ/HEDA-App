import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../utils/aiConversation.js',import.meta.url),'utf8');
const {conversationHistory,beginChatTurn}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const pair=(n)=>[{id:`u${n}`,role:'user',status:'complete',text:`Pregunta ${n}`},{id:`a${n}`,role:'assistant',status:'complete',text:`Respuesta ${n}`,sources:[{url:'https://example.org'}]}];
test('context contains recent completed turns only, with no UI metadata or failed messages',()=>{
 const messages=[...pair(1),{id:'failed',role:'user',status:'failed',text:'Falló'},{id:'pending',role:'user',status:'pending',text:'En curso'}];
 assert.deepEqual(conversationHistory(messages),[{role:'user',text:'Pregunta 1'},{role:'model',text:'Respuesta 1'}]);
});
test('context keeps at most six complete pairs without splitting a turn',()=>{
 const messages=Array.from({length:10},(_,i)=>pair(i)).flat();const history=conversationHistory(messages);
 assert.equal(history.length,12);assert.equal(history[0].text,'Pregunta 4');assert.equal(history.at(-1).text,'Respuesta 9');
});
test('context respects character budget and a new empty conversation has no history',()=>{
 const messages=Array.from({length:6},(_,i)=>[{...pair(i)[0],text:'u'.repeat(2000)},{...pair(i)[1],text:'a'.repeat(6000)}]).flat();
 const history=conversationHistory(messages);assert.equal(history.length,4);assert.ok(history.reduce((s,m)=>s+m.text.length,0)<=16000);assert.deepEqual(conversationHistory([]),[]);
});
test('retry replaces the failed outgoing bubble while preserving previous answers',()=>{
 const messages=[...pair(1),{id:'failed',role:'user',status:'failed',text:'Pregunta fallida'}];const next=beginChatTurn(messages,'Pregunta corregida','new');
 assert.equal(next.length,3);assert.equal(next.at(-1).status,'pending');assert.equal(next.at(-1).text,'Pregunta corregida');assert.deepEqual(next.slice(0,2),pair(1));assert.equal(messages.at(-1).text,'Pregunta fallida');
});
test('visible transcript remains bounded while retaining full recent pairs',()=>{
 const messages=Array.from({length:25},(_,i)=>pair(i)).flat();const next=beginChatTurn(messages,'Nueva','new');assert.equal(next.length,39);assert.equal(next[0].role,'user');assert.equal(next.at(-1).status,'pending');
});
