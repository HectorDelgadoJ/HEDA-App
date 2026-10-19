import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../utils/experience.js', import.meta.url), 'utf8');
const { experienceDefaults, normalizeExperience, visibleCategories, isCustomizedExperience, resetExperienceView } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('new accounts start simple with financial detail hidden and setup not completed', () => {
  const preferences = normalizeExperience(undefined);
  assert.equal(preferences.mode, 'simple'); assert.equal(preferences.configured, false);
  assert.deepEqual(preferences.widgets, { metrics: false, cards: false, budgets: false, goals: false, payments: true });
});
test('complete view exposes optional blocks and a savings priority enables the goal in simple view', () => {
  assert.ok(Object.values(experienceDefaults('complete').widgets).every(Boolean));
  assert.equal(experienceDefaults('simple', 'saving').widgets.goals, true);
  assert.equal(experienceDefaults('simple', 'saving').widgets.metrics, false);
});
test('account preferences preserve explicit hidden blocks after serialization and restore', () => {
  const saved = { ...experienceDefaults('complete', 'payments'), configured: true, widgets: { metrics: false, cards: true, budgets: false, goals: false, payments: true } };
  assert.deepEqual(normalizeExperience(JSON.parse(JSON.stringify(saved))), saved);
});
test('malformed and unknown fields cannot become UI flags or financial account settings', () => {
  const normalized = normalizeExperience({ version: 1, mode: 'cards', priority: 'admin', configured: 'true', widgets: { cards: 'false', metrics: false, is_admin: true }, movement_mode: 'cards', balance: 100000 });
  assert.equal(normalized.mode, 'simple'); assert.equal(normalized.priority, 'expenses'); assert.equal(normalized.configured, false);
  assert.equal(normalized.widgets.cards, false); assert.equal(normalized.widgets.metrics, false);
  assert.equal('movement_mode' in normalized, false); assert.equal('balance' in normalized, false); assert.equal('is_admin' in normalized.widgets, false);
  assert.equal(normalizeExperience({ version: 99, configured: true }).configured, false);
});
test('compact categories retain a selected uncommon category and never lose the original options', () => {
  const options = ['Comida', 'Compras', 'Transporte', 'Hogar', 'Mascotas', 'Salud'].map(name => [name, 'icon']);
  const before = JSON.stringify(options);
  assert.deepEqual(visibleCategories(options, 'Mascotas', false).map(([name]) => name), ['Comida', 'Compras', 'Transporte', 'Hogar', 'Mascotas']);
  assert.equal(visibleCategories(options, 'Comida', false).length, 4);
  assert.equal(visibleCategories(options, '', false).length, 4);
  assert.equal(visibleCategories(options, 'Mascotas', true), options);
  assert.equal(JSON.stringify(options), before);
});

test('card reminders are optional and disabled by default even in complete view', () => {
  assert.equal(experienceDefaults().tools.cardPayments, false);
  assert.equal(experienceDefaults('complete').tools.cardPayments, false);
  const legacy = { version: 1, mode: 'complete', configured: true, widgets: { cards: true } };
  assert.equal(normalizeExperience(legacy).tools.cardPayments, false);
  assert.equal(normalizeExperience({ ...legacy, tools: { cardPayments: true } }).tools.cardPayments, true);
  assert.equal(normalizeExperience({ ...legacy, tools: { cardPayments: 'true' } }).tools.cardPayments, false);
  assert.equal(normalizeExperience({ ...legacy, tools: { cardPayments: false } }).widgets.cards, true);
});

test('theme defaults to light for legacy accounts and persists dark without changing view or accounting', () => {
  assert.equal(normalizeExperience({ version: 1, mode: 'complete', configured: true }).theme, 'light');
  const dark = normalizeExperience({ ...experienceDefaults('simple', 'saving'), theme: 'dark', configured: true });
  assert.equal(dark.theme, 'dark'); assert.equal(dark.mode, 'simple'); assert.equal(dark.widgets.goals, true);
  assert.equal(normalizeExperience({ ...dark, theme: 'invalid' }).theme, 'light');
  assert.deepEqual(normalizeExperience(JSON.parse(JSON.stringify(dark))), dark);
});
test('customized is a derived state, not a third view, and appearance alone is not customization', () => {
  const base = experienceDefaults('simple');
  assert.equal(isCustomizedExperience(base), false);
  assert.equal(isCustomizedExperience({ ...base, theme: 'dark' }), false);
  assert.equal(isCustomizedExperience({ ...base, widgets: { ...base.widgets, cards: true } }), true);
  assert.equal(isCustomizedExperience({ ...base, tools: { cardPayments: true } }), true);
});
test('reset recovers visibility defaults while preserving theme, priority, configuration and original object', () => {
  const original = { ...experienceDefaults('simple', 'saving'), theme: 'dark', configured: true, widgets: { metrics: true, cards: true, goals: false, payments: false, budgets: true }, tools: { cardPayments: true } };
  const before = JSON.stringify(original), restored = resetExperienceView(original);
  assert.equal(restored.mode, 'simple'); assert.equal(restored.priority, 'saving'); assert.equal(restored.theme, 'dark'); assert.equal(restored.configured, true);
  assert.deepEqual(restored.widgets, experienceDefaults('simple', 'saving').widgets); assert.equal(restored.tools.cardPayments, false);
  assert.equal(isCustomizedExperience(restored), false); assert.equal(JSON.stringify(original), before);
});
