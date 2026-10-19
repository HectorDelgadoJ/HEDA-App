import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {oauthCode}=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../utils/oauth.js',import.meta.url),'utf8')).toString('base64'));
const redirect='heda://auth/callback';
test('OAuth accepts only the expected callback and a single authorization code, never tokens from fragments',()=>{
 assert.equal(oauthCode(redirect+'?code=one-time',redirect),'one-time');
 for(const url of ['evil://auth/callback?code=x','heda://other/callback?code=x',redirect+'?code=x&code=y',redirect+'#access_token=x',redirect+'?error=denied',redirect+'?code=x#extra','https://evil.test/?code=x'])assert.throws(()=>oauthCode(url,redirect));
});
const source=readFileSync(new URL('../services/googleAuth.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replaceAll('export ','');
function mock({expoGo=false,cancel=false}={}){let requests=[],exchanges=0;
 const client={auth:{signInWithOAuth:async body=>{requests.push(body);return {data:{url:'https://project.supabase.co/auth/v1/authorize'}};},exchangeCodeForSession:async()=>{exchanges++;return {};}}};
 const methods=new Function('Platform','Constants','WebBrowser','makeRedirectUri','supabase','oauthCode','setTimeout',source+';return {signInWithGoogle,completeGoogleSignIn};')({OS:'ios'},{executionEnvironment:expoGo?'storeClient':'standalone'},{maybeCompleteAuthSession(){},openAuthSessionAsync:async()=>cancel?{type:'cancel'}:{type:'success',url:redirect+'?code=one-time'}},()=>redirect,client,oauthCode,()=>{});
 return {...methods,requests,get exchanges(){return exchanges;}};}
test('Google requests only identity scopes and exchanges a code, while repeated callbacks do not create another exchange',async()=>{
 const m=mock();await m.signInWithGoogle();await m.completeGoogleSignIn(redirect+'?code=one-time');assert.equal(m.exchanges,1);assert.equal(m.requests[0].provider,'google');assert.equal(m.requests[0].options.scopes,'openid email profile');assert.equal(m.requests[0].options.redirectTo,redirect);assert.equal(m.requests[0].options.skipBrowserRedirect,true);
});
test('Expo Go and cancelled OAuth do not fabricate sessions',async()=>{
 const go=mock({expoGo:true});await assert.rejects(go.signInWithGoogle(),/Expo Go/);assert.equal(go.requests.length,0);
 const cancelled=mock({cancel:true});assert.equal((await cancelled.signInWithGoogle()).cancelled,true);assert.equal(cancelled.exchanges,0);
});

test('Supabase SDK authorization URL uses PKCE S256 with a stored verifier',async()=>{
 const {createClient}=await import('@supabase/supabase-js'),values=new Map();
 const client=createClient('https://example.supabase.co','public-test-only',{auth:{flowType:'pkce',autoRefreshToken:false,persistSession:true,detectSessionInUrl:false,storage:{getItem:async key=>values.get(key)??null,setItem:async(key,value)=>values.set(key,value),removeItem:async key=>values.delete(key)}}});
 const {data,error}=await client.auth.signInWithOAuth({provider:'google',options:{skipBrowserRedirect:true,redirectTo:'heda://auth/callback'}});assert.equal(error,null);const url=new URL(data.url);assert.equal(url.searchParams.get('code_challenge_method'),'s256');assert.ok(url.searchParams.get('code_challenge'));assert.ok(values.size>0);
});
