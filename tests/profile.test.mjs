import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const birth='data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../utils/birthDate.js',import.meta.url),'utf8')).toString('base64');
const moduleFrom = path => import('data:text/javascript;base64,' + Buffer.from(readFileSync(new URL(path, import.meta.url), 'utf8').replace("'./birthDate'",JSON.stringify(birth))).toString('base64'));
const { validateProfile, validatePassword, profileInitials } = await moduleFrom('../utils/profile.js');
const { saveOwnProfile, changeOwnPassword } = await moduleFrom('../services/profileActions.js');

test('profile validation trims names, normalizes alias and preserves unicode without altering credentials', () => {
  const d = validateProfile({ full_name: '  José María  ', username: '  VIC.DA_17 ', occupation: ' Estudiante ',birth_date:'15/06/2000', email: 'other@example.org', password: 'secret' });
  assert.deepEqual(d.errors, {}); assert.deepEqual(d.payload, { full_name: 'José María', username: 'vic.da_17', occupation: 'Estudiante',birth_date:'2000-06-15' });
  assert.ok(validateProfile({full_name:'Vicente',username:'',occupation:''}).errors.username);
});
test('invalid profile fields block saving and initials do not require personal data', () => {
  const d = validateProfile({ full_name: ' ', username: 'bad name', occupation: 'x'.repeat(101) });
  assert.deepEqual(Object.keys(d.errors).sort(), ['birth_date', 'full_name', 'occupation', 'username']);
  assert.equal(profileInitials('Vicente   Jimenez'), 'VJ'); assert.equal(profileInitials('Ana'), 'AN'); assert.equal(profileInitials(''), 'HE');
});
test('password checks require current password, matching confirmation and a different sufficiently long new password', () => {
  assert.ok(validatePassword('', '123', '456').current);
  assert.ok(validatePassword('samepassword', 'samepassword', 'samepassword').next);
  assert.ok(validatePassword('oldpassword', 'newpassword', 'different').confirmation);
  assert.deepEqual(validatePassword('oldpassword', 'newpassword', 'newpassword'), {});
});
test('profile update uses authenticated owner and an explicit allowlist of columns', async () => {
  const calls = [], saved = { full_name: 'Vicente', username: 'vic', occupation: null,birth_date:'2000-06-15' };
  const query = { update(value) { calls.push(['update', value]); return this; }, eq(...args) { calls.push(['eq', ...args]); return this; }, select() { return this; }, async single() { return { data: saved, error: null }; } };
  const client = { auth: { getUser: async () => ({ data: { user: { id: 'owner' } }, error: null }) }, from(table) { calls.push(['from', table]); return query; } };
  assert.deepEqual(await saveOwnProfile(client, 'owner', { ...saved, id: 'other', financial_level: 'admin', email: 'malicious@example.org' }), saved);
  assert.deepEqual(calls, [['from', 'profiles'], ['update', saved], ['eq', 'id', 'owner']]);
});
test('changed account is rejected before a profile update or password check', async () => {
  const client = { auth: { getUser: async () => ({ data: { user: { id: 'other', email: 'other@example.org' } } }) }, from() { assert.fail('must not update another account'); } };
  await assert.rejects(saveOwnProfile(client, 'owner', {}), /sesión cambió/);
  await assert.rejects(changeOwnPassword(client, 'owner', 'old', 'newpassword'), /sesión cambió/);
});
test('password update verifies current credentials before sending the new password', async () => {
  const calls = [], user = { id: 'owner', email: 'owner@example.org' };
  const client = { auth: {
    getUser: async () => ({ data: { user } }),
    signInWithPassword: async input => { calls.push(['verify', input]); return { data: { user } }; },
    updateUser: async input => { calls.push(['update', input]); return { data: { user } }; },
  } };
  await changeOwnPassword(client, 'owner', 'old-password', 'new-password');
  assert.deepEqual(calls, [['verify', { email: user.email, password: 'old-password' }], ['update', { password: 'new-password', current_password: 'old-password' }]]);
});
test('wrong current password or unexpected reauthenticated account never updates credentials', async () => {
  const user = { id: 'owner', email: 'owner@example.org' };
  for (const verified of [{ error: { message: 'invalid credentials' } }, { data: { user: { id: 'other' } } }]) {
    const client = { auth: { getUser: async () => ({ data: { user } }), signInWithPassword: async () => verified, updateUser() { assert.fail('must not update password'); } } };
    await assert.rejects(changeOwnPassword(client, 'owner', 'wrong', 'newpassword'), /verificar/);
  }
});
test('provider rejection is surfaced as failure without exposing passwords', async () => {
  const user = { id: 'owner', email: 'owner@example.org' };
  const client = { auth: { getUser: async () => ({ data: { user } }), signInWithPassword: async () => ({ data: { user } }), updateUser: async () => ({ error: { message: 'provider diagnostic' } }) } };
  await assert.rejects(changeOwnPassword(client, 'owner', 'secret-old', 'secret-new'), error => !error.message.includes('secret') && /No pudimos cambiar/.test(error.message));
});
