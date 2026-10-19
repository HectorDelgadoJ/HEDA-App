import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const birth=url(readFileSync(new URL('../utils/birthDate.js',import.meta.url),'utf8'));
const experience=url(readFileSync(new URL('../utils/experience.js',import.meta.url),'utf8'));
const auth=url(readFileSync(new URL('../utils/auth.js',import.meta.url),'utf8').replace("'./experience'",JSON.stringify(experience)).replace("'./birthDate'",JSON.stringify(birth)));
const {validateLogin,validateRegistration,signupPreferences,authErrorMessage}=await import(auth);
const {loginAccount,registerAccount:registerRaw,checkUsername}=await import(url(readFileSync(new URL('../services/authActions.js',import.meta.url),'utf8').replace("'../utils/auth'",JSON.stringify(auth))));
const registerAccount=(client,...args)=>registerRaw({rpc:async()=>({data:true}),...client},...args);
const form={fullName:' Vicente ',username:'@vicente',birthDate:'15/06/2000',email:' Vic@Example.com ',password:'A long phrase 2026',confirmPassword:'A long phrase 2026'};
test('registration requires age and handle, normalizes email and preserves password spaces',async()=>{
 let sent;const client={auth:{signUp:async body=>{sent=body;return {data:{user:{id:'A'},session:{user:{id:'A'}}}};}}};
 const result=await registerAccount(client,{...form,password:' phrase with spaces ',confirmPassword:' phrase with spaces '});
 assert.equal(result.needsConfirmation,false);assert.equal(sent.email,'vic@example.com');assert.equal(sent.password,' phrase with spaces ');assert.equal(sent.options.data.full_name,'Vicente');assert.equal(sent.options.data.username,'vicente');assert.equal(sent.options.data.birth_date,'2000-06-15');
});
test('signup stores initial preferences but leaves first-login setup pending',async()=>{
 let sent;await registerAccount({auth:{signUp:async body=>{sent=body;return {data:{user:{id:'A'},session:{user:{id:'A'}}}};}}},form,{mode:'complete',priority:'saving'});
 assert.deepEqual(sent.options.data.heda_experience,signupPreferences('complete','saving'));assert.equal(sent.options.data.heda_experience.configured,false);assert.equal(sent.options.data.heda_experience.widgets.goals,true);
 assert.deepEqual(signupPreferences('invalid','invalid'),signupPreferences());
});
test('invalid registration or mismatched passwords never reach Supabase',async()=>{
 let calls=0;const client={auth:{signUp:async()=>calls++}};
 for(const change of [{birthDate:''},{birthDate:'31/02/2000'},{birthDate:'01/01/2100'},{username:''},{fullName:''},{email:'bad'},{username:'bad username'},{password:'short'},{password:'        ',confirmPassword:'        '},{confirmPassword:'different'}])await assert.rejects(registerAccount(client,{...form,...change}),error=>!!error.fields);
 assert.equal(calls,0);assert.equal(validateRegistration({...form,username:' Alias_01 '}).username,'alias_01');
});
test('confirmation required by Supabase is handled honestly without a fake session or second login request',async()=>{
 let calls=0;const result=await registerAccount({auth:{signUp:async()=>{calls++;return {data:{user:{id:'A'},session:null}};}}},form);
 assert.equal(result.needsConfirmation,true);assert.equal(calls,1);
});
test('legacy login keeps short passwords and returns only an actual authenticated session',async()=>{
 let sent;const client={auth:{signInWithPassword:async body=>{sent=body;return {data:{user:{id:'A'},session:{access_token:'test-only'}}};}}};
 await loginAccount(client,' USER@example.com ','old123');assert.deepEqual(sent,{email:'user@example.com',password:'old123'});
 assert.equal(Object.keys(validateLogin('good@example.com','old123').errors).length,0);
 await assert.rejects(loginAccount({auth:{signInWithPassword:async()=>({data:{user:{id:'A'},session:null}})}},'good@example.com','old123'),/abrir la sesión/);
});
test('invalid login does not call Supabase and server failures are translated without leaking raw messages',async()=>{
 let calls=0;await assert.rejects(loginAccount({auth:{signInWithPassword:async()=>calls++}},'bad',''),error=>!!error.fields);assert.equal(calls,0);
 assert.match(authErrorMessage({code:'invalid_credentials',message:'raw secret'}),/no coinciden/);
 assert.match(authErrorMessage({status:429}),/Espera/);assert.match(authErrorMessage({code:'email_not_confirmed'}),/confirmación/);
 for(const action of [()=>loginAccount({auth:{signInWithPassword:async()=>{throw new Error('raw private detail');}}},'good@example.com','old123'),()=>registerAccount({auth:{signUp:async()=>({error:{code:'unknown',message:'raw private detail'}})}},form)])await assert.rejects(action(),error=>!error.message.includes('raw private detail')&&/conexión/.test(error.message));
});

test('CAPTCHA tokens reach Supabase for verification but never become user metadata',async()=>{
 let login,signup;const client={auth:{signInWithPassword:async body=>{login=body;return {data:{user:{id:'A'},session:{}}};},signUp:async body=>{signup=body;return {data:{user:{id:'A'},session:{}}};}}};
 await loginAccount(client,'a@example.com','password',{captchaToken:'test-challenge'});await registerAccount(client,form,{captchaToken:'test-challenge'});
 assert.equal(login.options.captchaToken,'test-challenge');assert.equal(signup.options.captchaToken,'test-challenge');assert.ok(!JSON.stringify(signup.options.data).includes('test-challenge'));
});

test('occupied usernames block signup; unavailable RPC fails closed',async()=>{
 let calls=0;const auth={signUp:async()=>{calls++;}};
 await assert.rejects(registerRaw({auth,rpc:async()=>({data:false})},form),e=>!!e.fields?.username);
 await assert.rejects(registerRaw({auth,rpc:async()=>({error:{code:'missing'}})},form),/SQL de registro/);
 assert.equal(calls,0);
});
test('signup race is translated into a field error after database rejection',async()=>{
 let checks=0;
 await assert.rejects(registerRaw({rpc:async()=>({data:++checks===1}),auth:{signUp:async()=>({error:{code:'unexpected_failure'}})}},form),e=>!!e.fields?.username);
 assert.equal(checks,2);
});
