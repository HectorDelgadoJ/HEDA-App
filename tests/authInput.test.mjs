import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {authAutofillProps,dismissFocusedKeyboard}=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../utils/authInput.js',import.meta.url),'utf8')).toString('base64'));
test('iOS secure fields suppress conflicting password autofill hints even if a caller requests them',()=>{
 for(const autoComplete of ['current-password','new-password'])assert.deepEqual(authAutofillProps('ios',{password:true,autoComplete,textContentType:'newPassword'}),{textContentType:'none'});
});
test('other platforms keep password managers and normal email fields receive only one autofill hint',()=>{
 assert.deepEqual(authAutofillProps('android',{password:true,autoComplete:'current-password'}),{autoComplete:'current-password'});
 assert.deepEqual(authAutofillProps('ios',{autoComplete:'email',textContentType:'emailAddress'}),{autoComplete:'email'});
});
test('authentication removes native focus before dismissing the keyboard',()=>{
 const calls=[];dismissFocusedKeyboard({dismiss:()=>calls.push('dismiss')},{currentlyFocusedInput:()=>({blur:()=>calls.push('blur')})});assert.deepEqual(calls,['blur','dismiss']);
});
test('keyboard dismissal still runs if the old input is already unmounted or native blur fails',()=>{
 let calls=0;const keyboard={dismiss:()=>calls++};dismissFocusedKeyboard(keyboard,{});dismissFocusedKeyboard(keyboard,{currentlyFocusedInput:()=>{throw new Error('unmounted');}});assert.equal(calls,2);
});

test('web username registration uses a valid HTML autocomplete token',()=>{assert.deepEqual(authAutofillProps('web',{autoComplete:'username-new'}),{autoComplete:'username'});assert.deepEqual(authAutofillProps('android',{autoComplete:'username-new'}),{autoComplete:'username-new'});});
