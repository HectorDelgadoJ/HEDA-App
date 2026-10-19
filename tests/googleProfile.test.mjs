import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const birth='data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../utils/birthDate.js',import.meta.url),'utf8')).toString('base64');
const source=readFileSync(new URL('../services/googleProfile.js',import.meta.url),'utf8').replace("'../utils/birthDate'",JSON.stringify(birth));
const {completeGoogleProfile,needsGoogleProfile,validateGoogleProfile}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const user={id:'owner',app_metadata:{providers:['google']}};
test('Google only needs completion when profile lacks name, age or handle',()=>{
 assert.equal(needsGoogleProfile(user,{full_name:'Ana',username:'ana',birth_date:'2000-06-15'}),false);
 for(const profile of [null,{full_name:'Ana',username:'ana'},{full_name:'Ana',birth_date:'2000-06-15'}])assert.equal(needsGoogleProfile(user,profile),true);
 assert.equal(needsGoogleProfile({app_metadata:{provider:'email'}},null),true);
 assert.equal(validateGoogleProfile({fullName:' Ana ',username:'@ANA',birthDate:'15/06/2000'}).username,'ana');
 assert.ok(validateGoogleProfile({fullName:'',username:'x',birthDate:'31/02/2000'}).errors.birthDate);
});
test('profile completion never submits an ID and refuses a changed session',async()=>{
 let called=0;const values={fullName:'Ana',username:'ana',birthDate:'15/06/2000'};
 await assert.rejects(completeGoogleProfile({auth:{getUser:async()=>({data:{user:{id:'other'}}})},rpc:async()=>{called++;}},'owner',values),/sesión/);
 assert.equal(called,0);
 const profile={id:'owner',full_name:'Ana',username:'ana',birth_date:'2000-06-15'};
 const result=await completeGoogleProfile({auth:{getUser:async()=>({data:{user}})},rpc:async(name,args)=>{assert.equal(name,'heda_complete_own_birth_profile');assert.deepEqual(args,{p_full_name:'Ana',p_username:'ana',p_birth_date:'2000-06-15'});return {data:[profile]};}},'owner',values);
 assert.equal(result,profile);
 await assert.rejects(completeGoogleProfile({auth:{getUser:async()=>({data:{user}})},rpc:async()=>({error:{code:'23505'}})},'owner',values),e=>!!e.fields.username);
});
