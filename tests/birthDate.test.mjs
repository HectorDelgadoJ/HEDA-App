import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {ageFromBirthDate,validateBirthDate,birthDateISO,maskBirthDate}=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../utils/birthDate.js',import.meta.url),'utf8')).toString('base64'));
test('age changes on birthday, not January 1; handles leap dates without timezone parsing',()=>{
 assert.equal(ageFromBirthDate('2000-10-18','2026-10-17'),25);assert.equal(ageFromBirthDate('2000-10-18','2026-10-18'),26);
 assert.equal(ageFromBirthDate('2004-02-29','2025-02-28'),20);assert.equal(ageFromBirthDate('2004-02-29','2025-03-01'),21);
 assert.equal(ageFromBirthDate('2026-10-18','2026-10-18'),0);assert.equal(birthDateISO('18/10/2000'),'2000-10-18');
 for(const value of ['', '31/02/2000','29/02/2001','01/01/2100','01/01/1800'])assert.ok(validateBirthDate(value,'2026-10-18').error);
 assert.equal(maskBirthDate('18102000'),'18/10/2000');
});
