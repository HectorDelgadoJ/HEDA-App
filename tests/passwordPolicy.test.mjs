import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {passwordAssessment,newPasswordError}=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../utils/passwordPolicy.js',import.meta.url),'utf8')).toString('base64'));
test('new credentials require every displayed character class and enforce length bounds',()=>{
 for(const password of ['',null,'Ab1!short','abcdefghijkl!2','ABCDEFGHIJKL!2','Abcdefghijklmn!','Abcdefghijklmn2','Ab1!'.repeat(33)]) assert.ok(newPasswordError(password));
 assert.equal(newPasswordError('Brisa!72Piedras'),'');
 assert.equal(passwordAssessment('Brisa!72Piedras').requirements.every(r=>r.met),true);
});
test('password content is never trimmed or returned by the assessment',()=>{
 const value=' Brisa!72Piedras ';
 assert.equal(newPasswordError(value),'');
 assert.ok(!JSON.stringify(passwordAssessment(value)).includes(value));
 assert.equal(passwordAssessment('a'.repeat(128)+'!A2').valid,false);
});
test('strength is only guidance and obvious patterns do not receive a high rating',()=>{
 assert.equal(passwordAssessment('').level,0);
 assert.equal(passwordAssessment('Brisa!72Piedras').level,2);
 assert.equal(passwordAssessment('Brisa!72Piedras_Luz').level,3);
 assert.equal(passwordAssessment('Password123456789!').level,1);
 assert.match(passwordAssessment('Password123456789!').warning,/Evita/);
});
