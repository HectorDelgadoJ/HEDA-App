import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../supabase/functions/heda-ai/foundry.js', import.meta.url), 'utf8');
const { createFoundryClient, foundryError } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const config = { FOUNDRY_PROJECT_ENDPOINT: 'https://test.services.ai.azure.com/api/projects/test', FOUNDRY_AGENT_NAME:'heda-asistente', AZURE_TENANT_ID:'tenant', AZURE_CLIENT_ID:'client', AZURE_CLIENT_SECRET:'secret' };
const env = name => config[name];
const token = () => Response.json({access_token:'server-token',expires_in:3600});
const answer = () => Response.json({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'Respuesta',annotations:[{type:'url_citation',url:'https://example.org/source',title:'Fuente'},{type:'url_citation',url:'javascript:alert(1)'},{type:'url_citation',url:'https://example.org/source',title:'Duplicada'}]}]}]});
test('agent endpoint preserves saved instructions, sends only the question, and returns safe citations', async () => {
 const calls=[];const ask=createFoundryClient(env,async (url,init)=>{calls.push({url,init});return calls.length===1?token():answer();});
 const result=await ask('¿Qué es inflación?');assert.equal(result.message,'Respuesta');assert.equal(result.sources.length,1);
 assert.match(calls[1].url,/agents\/heda-asistente\/endpoint\/protocols\/openai\/responses\?api-version=v1$/);
 assert.deepEqual(JSON.parse(calls[1].init.body),{input:[{role:'user',content:'¿Qué es inflación?'}]});
 assert.equal(calls[1].init.headers.Authorization,'Bearer server-token');assert.equal(calls[0].init.body.get('scope'),'https://ai.azure.com/.default');
});
test('cached server token is reused but conversations and previous responses are never shared',async()=>{
 let tokenCalls=0;const bodies=[];const ask=createFoundryClient(env,async(url,init)=>{if(url.includes('login.microsoftonline.com')){tokenCalls++;return token();}bodies.push(JSON.parse(init.body));return answer();});
 await ask('Pregunta A');await ask('Pregunta B');assert.equal(tokenCalls,1);assert.equal(bodies[1].input[0].content,'Pregunta B');assert.equal(bodies[1].conversation,undefined);
});
test('missing credentials and invalid endpoints fail before network access',async()=>{
 let calls=0;for(const override of [{AZURE_CLIENT_SECRET:''},{FOUNDRY_PROJECT_ENDPOINT:'https://evil.example/api/projects/test'},{FOUNDRY_PROJECT_ENDPOINT:''}]){const ask=createFoundryClient(name=>({...config,...override})[name],async()=>{calls++;return token();});await assert.rejects(ask('Pregunta'),/AZURE_NOT_CONFIGURED/);}assert.equal(calls,0);
});
test('provider failures map to actionable errors without leaking response bodies',async()=>{
 for(const [status,code] of [[401,'AZURE_AUTH_ERROR'],[403,'AZURE_PERMISSION_ERROR'],[404,'AZURE_AGENT_NOT_FOUND'],[429,'AI_RATE_LIMIT'],[500,'AI_PROVIDER_ERROR']]){const ask=createFoundryClient(env,async url=>url.includes('login.microsoftonline.com')?token():new Response('private-provider-details',{status}));await assert.rejects(ask('Pregunta'),error=>{assert.equal(error.message,code);assert.ok(!foundryError(error).message.includes('private-provider-details'));return true;});}
});
test('failed token acquisition, incomplete and empty answers never appear as success',async()=>{
 const badAuth=createFoundryClient(env,async()=>new Response('secret',{status:401}));await assert.rejects(badAuth('Pregunta'),/AZURE_AUTH_ERROR/);
 for(const [data,code] of [[{status:'incomplete',output:[]},'AI_INCOMPLETE'],[{status:'completed',output:[]},'AI_EMPTY_RESPONSE']]){const ask=createFoundryClient(env,async url=>url.includes('login.microsoftonline.com')?token():Response.json(data));await assert.rejects(ask('Pregunta'),new RegExp(code));}
 assert.equal(foundryError({name:'TimeoutError'}).status,504);
});
