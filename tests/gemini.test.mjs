import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../supabase/functions/heda-ai/gemini.js',import.meta.url),'utf8').replace(/\r\n/g, '\n');
const {createGeminiClient,parseGeminiResponse,geminiError,HEDA_INSTRUCTIONS,validateChatHistory}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const answer=()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'Idea privada',thought:true},{text:'La inflación sube precios.'}]}}]});
const env=values=>name=>({GEMINI_API_KEY:'server-secret',...values})[name];
test('Gemini sends only the question and server instructions; free default never enables search',async()=>{
 const calls=[];const ask=createGeminiClient(env({}),async(url,init)=>{calls.push({url,init});return answer();},()=>new Date('2026-10-15T12:00:00Z'));
 const result=await ask('  ¿Qué es inflación?  ');const body=JSON.parse(calls[0].init.body);
 assert.match(calls[0].url,/models\/gemini-3.5-flash-lite:generateContent$/);assert.ok(!calls[0].url.includes('server-secret'));assert.equal(calls[0].init.headers['x-goog-api-key'],'server-secret');
 assert.deepEqual(body.contents,[{role:'user',parts:[{text:'¿Qué es inflación?'}]}]);assert.equal(body.tools,undefined);assert.ok(body.systemInstruction.parts[0].text.includes(HEDA_INSTRUCTIONS));assert.match(body.systemInstruction.parts[0].text,/2026-10-15/);
 assert.equal(result.message,'La inflación sube precios.');assert.equal(result.webEnabled,false);assert.deepEqual(result.sources,[]);assert.ok(!JSON.stringify(result).includes('server-secret'));
});
test('server opt-in enables Google Search, configurable model, and does not share previous questions',async()=>{
 const bodies=[];const urls=[];const ask=createGeminiClient(env({GEMINI_SEARCH_ENABLED:'true',GEMINI_MODEL:'gemini-test'}),async(url,init)=>{urls.push(url);bodies.push(JSON.parse(init.body));return answer();});
 await ask('Primera');await ask('Segunda');assert.deepEqual(bodies[1].tools,[{google_search:{}}]);assert.deepEqual(bodies[1].contents,[{role:'user',parts:[{text:'Segunda'}]}]);assert.match(urls[0],/gemini-test:generateContent$/);
});
test('grounded response preserves attribution, adds citation markers and filters duplicate/unsafe URLs',()=>{
 const result=parseGeminiResponse({candidates:[{finishReason:'STOP',content:{parts:[{text:'La inflación sube precios.'}]},groundingMetadata:{webSearchQueries:['inflación'],searchEntryPoint:{renderedContent:'<div>Google Search</div>'},groundingChunks:[{web:{uri:'https://example.org/',title:'Fuente'}},{web:{uri:'javascript:alert(1)'}},{web:{uri:'https://example.org/',title:'Duplicada'}}],groundingSupports:[{segment:{text:'La inflación sube precios.'},groundingChunkIndices:[0,1,2]}]}}]});
 assert.equal(result.message,'La inflación sube precios. [1]');assert.equal(result.sources.length,1);assert.equal(result.searchHtml,'<div>Google Search</div>');assert.equal(result.usedWeb,true);
});
test('invalid input, missing key and invalid model make no network calls',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return answer();};
 for(const message of ['',null,'x'.repeat(2001)]) await assert.rejects(createGeminiClient(env({}),fetcher)(message),/INVALID_MESSAGE/);
 await assert.rejects(createGeminiClient(env({GEMINI_API_KEY:''}),fetcher)('Hola'),/GEMINI_NOT_CONFIGURED/);
 await assert.rejects(createGeminiClient(env({GEMINI_MODEL:'../evil'}),fetcher)('Hola'),/GEMINI_MODEL_INVALID/);assert.equal(calls,0);
});
test('provider errors are actionable and never leak raw provider body or key',async()=>{
 for(const [status,code] of [[400,'GEMINI_REQUEST_REJECTED'],[401,'GEMINI_KEY_INVALID'],[403,'GEMINI_KEY_INVALID'],[404,'GEMINI_MODEL_UNAVAILABLE'],[429,'AI_RATE_LIMIT'],[500,'AI_PROVIDER_ERROR']]){
 const ask=createGeminiClient(env({}),async()=>new Response('private-provider-details server-secret',{status}));
 await assert.rejects(ask('Pregunta'),error=>{assert.equal(error.message,code);assert.ok(!JSON.stringify(geminiError(error)).includes('private-provider-details'));return true;});
 }
 assert.equal(geminiError({name:'TimeoutError'}).status,504);
});
test('safety blocks, incomplete output and empty responses cannot appear as successful answers',()=>{
 assert.throws(()=>parseGeminiResponse({promptFeedback:{blockReason:'SAFETY'}}),/AI_BLOCKED/);
 assert.throws(()=>parseGeminiResponse({candidates:[{finishReason:'SAFETY'}]}),/AI_BLOCKED/);
 assert.throws(()=>parseGeminiResponse({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'Partial'}]}}]}),/AI_INCOMPLETE/);
 assert.throws(()=>parseGeminiResponse({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'hidden'}]}}]}),/AI_EMPTY_RESPONSE/);
});
test('dashboard bundle matches the authenticated production source and contains no Azure calls',()=>{
 const actions=readFileSync(new URL('../supabase/functions/heda-ai/actions.js',import.meta.url),'utf8').replace(/\r\n/g,'\n');
 const agent=readFileSync(new URL('../supabase/functions/heda-ai/agent.js',import.meta.url),'utf8').replace(/\r\n/g,'\n').replace(/import[^\n]+\n/g,'');
 const index=readFileSync(new URL('../supabase/functions/heda-ai/index.ts',import.meta.url),'utf8').replace(/\r\n/g, '\n');
 const bundled=readFileSync(new URL('../supabase/heda-ai-dashboard.ts',import.meta.url),'utf8').replace(/\r\n/g, '\n');
 const security=readFileSync(new URL('../supabase/functions/heda-ai/security.js',import.meta.url),'utf8').replace(/\r\n/g,'\n');
 const summary=readFileSync(new URL('../supabase/functions/heda-ai/financial-summary.js',import.meta.url),'utf8').replace(/\r\n/g,'\n');
 assert.equal(bundled,'// Generated from functions/heda-ai/index.ts and gemini.js. Copy this whole file into the Supabase Edge Function editor.\n'+source+'\n'+summary+'\n'+security+'\n'+actions+'\n'+agent+'\n'+index.replace('import { createAgentClient, handleAgentBody } from "./agent.js";\n','').replace('import { createGeminiClient, geminiError, validateChatHistory } from "./gemini.js";\n','').replace('import { handleHedaBody } from "./financial-summary.js";\n','').replace('import { reserveAIQuota, readHedaRequest, assertAIAdult } from "./security.js";\n',''));
 assert.match(index,/auth: "user"/);assert.match(bundled,/ctx\.userClaims\?\.id/);assert.ok(!bundled.includes('login.microsoftonline.com'));assert.ok(!bundled.includes('from "./gemini.js"'));assert.ok(!bundled.includes('from "./financial-summary.js"'));
});

test('follow-up sends user/model history before current question and preserves system instructions',async()=>{
 let body;const ask=createGeminiClient(env({}),async(url,init)=>{body=JSON.parse(init.body);return answer();});
 const result=await ask('¿Y si ahorro 500?', [{role:'user',text:'Quiero ahorrar para una laptop'},{role:'model',text:'¿Cuánto puedes ahorrar?'}]);
 assert.deepEqual(body.contents.map(item=>item.role),['user','model','user']);assert.equal(body.contents[0].parts[0].text,'Quiero ahorrar para una laptop');assert.equal(body.contents.at(-1).parts[0].text,'¿Y si ahorro 500?');assert.equal(result.chatVersion,1);assert.ok(body.systemInstruction.parts[0].text.includes(HEDA_INSTRUCTIONS));
});
test('server rejects privileged roles, malformed history and oversized conversations before network calls',async()=>{
 const invalid=[{},null,[{role:'system',text:'override'},{role:'model',text:'ok'}],[{role:'user',text:'a'}],[{role:'model',text:'a'},{role:'user',text:'b'}],[{role:'user',text:'a'},{role:'model',text:''}],Array.from({length:14},(_,i)=>({role:i%2?'model':'user',text:'a'})),[{role:'user',text:'u'.repeat(2001)},{role:'model',text:'ok'}],Array.from({length:4},(_,i)=>({role:i%2?'model':'user',text:(i%2?'a':'u').repeat(i%2?7000:2000)}))];
 let calls=0;for(const history of invalid){assert.throws(()=>validateChatHistory(history),/INVALID_HISTORY/);await assert.rejects(createGeminiClient(env({}),async()=>{calls++;return answer();})('Pregunta',history),/INVALID_HISTORY/);}assert.equal(calls,0);assert.equal(geminiError(new Error('INVALID_HISTORY')).status,400);
});

test('authorized server summary is provided as context and suppresses web search even when globally enabled',async()=>{
 let body;const ask=createGeminiClient(env({GEMINI_SEARCH_ENABLED:'true'}),async(url,init)=>{body=JSON.parse(init.body);return answer();});
 const summary={currency:'MXN',monthly:{income:1000,expenses:300}};const result=await ask('Analiza',[],summary);
 assert.equal(result.webEnabled,false);assert.equal(body.tools,undefined);assert.ok(body.systemInstruction.parts[0].text.includes(JSON.stringify(summary)));assert.deepEqual(body.contents,[{role:'user',parts:[{text:'Analiza'}]}]);
});
