import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const url = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const finance = url(readFileSync(new URL('../utils/finance.js', import.meta.url), 'utf8'));
const source = readFileSync(new URL('../utils/habits.js', import.meta.url), 'utf8').replace("'./finance'", JSON.stringify(finance));
const { habitsData } = await import(url(source));
const row = (date, amount, fields = {}) => ({ transaction_date: date, type: 'expense', amount, category: 'Comida', ...fields });

test('habits include credit purchases once, exclude repayments, future rows and invalid amounts', () => {
  const d = habitsData([row('2026-10-01', 100, { type: 'income' }), row('2026-10-02', 0.1, { card_id: 'card' }), row('2026-10-02', 0.2), row('2026-10-03', 0.3, { is_card_payment: true }), row('2026-10-16', 999), row('2026-10-04', 'invalid'), row('2026-10-05', -100)], new Date(2026, 9, 15));
  assert.equal(d.expenses, 0.3); assert.equal(d.income, 100); assert.equal(d.result, 99.7);
  assert.equal(d.categories[0].amount, 0.3); assert.equal(d.categories[0].percent, 100);
  assert.equal(d.transactionCount, 4); assert.equal(d.activeDays, 3);
});

test('comparison aligns short months, leap years and year boundaries', () => {
  const d = habitsData([row('2028-02-29', 100), row('2028-03-29', 150), row('2028-03-30', 500)], new Date(2028, 2, 31));
  assert.equal(d.expenses, 650); assert.equal(d.comparison.days, 29);
  assert.equal(d.comparison.currentExpenses, 150); assert.equal(d.comparison.previousExpenses, 100); assert.equal(d.comparison.changePercent, 50);
  const january = habitsData([row('2025-12-01', 20), row('2026-01-01', 10)], new Date(2026, 0, 1));
  assert.equal(january.comparison.previousStart, '2025-12-01'); assert.equal(january.comparison.changePercent, -50);
});

test('no prior spending has no fabricated percentage and empty data has no invented patterns', () => {
  const empty = habitsData([], new Date(2026, 9, 15));
  assert.equal(empty.comparison.changePercent, null); assert.deepEqual(empty.categories, []); assert.equal(empty.streak, 0); assert.equal(empty.recordingPercent, 0);
  const current = habitsData([row('2026-10-01', 100)], new Date(2026, 9, 15));
  assert.equal(current.comparison.changePercent, null);
});

test('recording streak counts distinct transaction dates ending today or yesterday', () => {
  const rows = [row('2026-09-30', 1), row('2026-10-01', 2), row('2026-10-01', 3), row('2026-10-02', 4)];
  const d = habitsData(rows, new Date(2026, 9, 3));
  assert.equal(d.activeDays, 2); assert.equal(d.streak, 3); assert.equal(d.recordingPercent, 67);
  assert.equal(habitsData(rows, new Date(2026, 9, 4)).streak, 0);
});

test('weekly chart assigns each expense once across a year boundary and marks partial weeks', () => {
  const d = habitsData([row('2025-12-28', 5), row('2025-12-29', 7), row('2026-01-01', 11), row('2026-01-02', 999)], new Date(2026, 0, 1));
  assert.equal(d.weeks.length, 6); assert.equal(d.weeks[5].start, '2025-12-29'); assert.equal(d.weeks[5].end, '2026-01-01');
  assert.equal(d.weeks[5].amount, 18); assert.equal(d.weeks[4].amount, 5); assert.equal(d.weeks[5].partial, true);
  assert.equal(d.weeks.reduce((sum, week) => sum + week.amount, 0), 23);
  assert.equal(habitsData([], new Date(2026, 0, 4)).weeks[5].partial, false);
});

test('category grouping retains custom categories and resolves equal totals consistently', () => {
  const d = habitsData([row('2026-10-01', 10, { category: 'Z' }), row('2026-10-02', 10, { category: 'A' }), row('2026-10-03', 20, { category: '' })], new Date(2026, 9, 15));
  assert.deepEqual(d.categories.map(category => [category.name, category.percent]), [['Sin categoría', 50], ['A', 25], ['Z', 25]]);
});
