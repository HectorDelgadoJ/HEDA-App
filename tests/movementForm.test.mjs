import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const source = readFileSync(new URL('../utils/movementForm.js', import.meta.url), 'utf8');
const { localDate, calendarDays, categoryOptions, rankedCategories, validateMovement, restoreCategoryPreferences } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('dates use the local calendar day, including near midnight', () => {
  assert.equal(localDate(new Date(2026, 9, 11, 23, 59)), '2026-10-11');
  assert.equal(localDate(new Date(2026, 0, 1, 0, 1)), '2026-01-01');
});

test('calendar handles leap years, week alignment and month boundaries', () => {
  assert.equal(calendarDays(2024, 2).filter(Boolean).length, 29);
  assert.equal(calendarDays(2026, 2).filter(Boolean).length, 28);
  assert.deepEqual(calendarDays(2026, 6).slice(0, 2), [1, 2]);
  assert.deepEqual(calendarDays(2026, 3).slice(0, 7), [null, null, null, null, null, null, 1]);
  assert.equal(calendarDays(2026, 12).at(-1), 31);
  assert.equal(calendarDays(2027, 1).filter(Boolean).length, 31);
});

test('income and expense categories cover distinct transaction types', () => {
  const income = categoryOptions('Ingreso').map(([name]) => name);
  const expense = categoryOptions('Gasto').map(([name]) => name);
  assert.ok(income.includes('Salario') && income.includes('Venta'));
  assert.ok(expense.includes('Comida') && expense.includes('Servicios'));
  assert.ok(!income.includes('Comida') && !expense.includes('Salario'));
});


test('frequent categories are ranked by type, including custom categories, with stable ties', () => {
  const transactions = [
    { type: 'expense', category: 'Mascotas' },
    { type: 'expense', category: 'Mascotas' },
    { type: 'expense', category: 'Salud' },
    { type: 'expense', category: 'Comida' },
    { type: 'income', category: 'Venta' },
    { type: 'income', category: 'Venta' },
    { type: 'income', category: 'Venta' },
  ];
  const expense = rankedCategories('Gasto', transactions).map(([name]) => name);
  assert.deepEqual(expense.slice(0, 3), ['Mascotas', 'Comida', 'Salud']);
  assert.ok(!expense.includes('Venta'));
  assert.equal(rankedCategories('Ingreso', transactions)[0][0], 'Venta');
  assert.equal(categoryOptions('Gasto')[0][0], 'Comida');
});

test('field validation accepts peso amounts and rejects invalid or missing fields together', () => {
  assert.deepEqual(validateMovement(' 125,50 ', 'Salario'), { errors: {}, numericAmount: 125.5 });
  assert.deepEqual(validateMovement('0.01', 'Comida').errors, {});
  for (const amount of ['', '0', '-5', 'Infinity', 'NaN', '0x20', '1e4', '3.999', 'abc']) {
    assert.ok(validateMovement(amount, 'Comida').errors.amount, amount);
  }
  const errors = validateMovement('0', '  ').errors;
  assert.ok(errors.amount && errors.category);
});

test('saved preferences retain independent types and never replace a category already chosen', () => {
  const current = { Gasto: 'Comida', Ingreso: 'Salario' };
  assert.deepEqual(restoreCategoryPreferences({ Gasto: ' Mascotas ', Ingreso: 'Venta' }, current, new Set()), { Gasto: 'Mascotas', Ingreso: 'Venta' });
  assert.deepEqual(restoreCategoryPreferences({ Gasto: 'Salud', Ingreso: 'Venta' }, current, new Set(['Gasto'])), { Gasto: 'Comida', Ingreso: 'Venta' });
  assert.deepEqual(restoreCategoryPreferences(null, current, new Set()), current);
  assert.deepEqual(restoreCategoryPreferences({ Gasto: '', Ingreso: 42 }, current, new Set()), current);
});
