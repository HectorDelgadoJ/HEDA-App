import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
const financeUrl = 'data:text/javascript;base64,' + Buffer.from(readFileSync(new URL('../utils/finance.js', import.meta.url), 'utf8')).toString('base64');
const source = readFileSync(new URL('../utils/recurringMovements.js', import.meta.url), 'utf8').replace("'./finance'", JSON.stringify(financeUrl));
const { nextOccurrence, recurringPayload, validateIntervalCount, frequencyLabel, balanceForecast, forecastPeriod } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('monthly schedules clamp shorter months and restore the original day', () => {
  assert.equal(nextOccurrence('2026-01-31', 'monthly', 31, 1), '2026-02-28');
  assert.equal(nextOccurrence('2026-02-28', 'monthly', 31, 1), '2026-03-31');
  assert.equal(nextOccurrence('2024-01-31', 'monthly', 31, 1), '2024-02-29');
  assert.equal(nextOccurrence('2026-12-31', 'monthly', 31, 12), '2027-01-31');
});
test('weekly and every-14-days schedules cross month and year boundaries', () => {
  assert.equal(nextOccurrence('2026-12-28', 'weekly', 28, 12), '2027-01-04');
  assert.equal(nextOccurrence('2026-01-25', 'biweekly', 25, 1), '2026-02-08');
});
test('annual leap-day schedules keep their original anniversary', () => {
  assert.equal(nextOccurrence('2024-02-29', 'yearly', 29, 2), '2025-02-28');
  assert.equal(nextOccurrence('2027-02-28', 'yearly', 29, 2), '2028-02-29');
});
test('editing the amount of a clamped schedule preserves its day-of-month', () => {
  const form = { name: ' Renta ', type: 'Gasto', amount: 8000, category: ' Hogar ', description: '', frequency: 'monthly', date: '2026-02-28' };
  const payload = recurringPayload({ ...form, existing: { next_date: '2026-02-28', frequency: 'monthly', anchor_day: 31, anchor_month: 1 } });
  assert.equal(payload.anchor_day, 31);
  assert.equal(payload.type, 'expense');
  assert.equal(payload.name, 'Renta');
  assert.equal(payload.category, 'Hogar');
  assert.equal(payload.description, null);
  assert.equal(recurringPayload({ ...form, date: '2026-02-15', existing: { next_date: '2026-02-28', frequency: 'monthly', anchor_day: 31, anchor_month: 1 } }).anchor_day, 15);
});


test('custom intervals support days, weeks, months and years', () => {
  assert.equal(nextOccurrence('2026-10-11', 'daily', 11, 10, 3), '2026-10-14');
  assert.equal(nextOccurrence('2026-12-28', 'weekly', 28, 12, 2), '2027-01-11');
  assert.equal(nextOccurrence('2026-12-31', 'monthly', 31, 12, 2), '2027-02-28');
  assert.equal(nextOccurrence('2027-02-28', 'monthly', 31, 12, 2), '2027-04-30');
  assert.equal(nextOccurrence('2024-02-29', 'yearly', 29, 2, 4), '2028-02-29');
});

test('repeat counts require positive whole numbers and preserve legacy frequencies', () => {
  for (const value of ['1', '2', '365']) assert.equal(validateIntervalCount(value), true);
  for (const value of ['', '0', '-2', '1.5', '366', 'Infinity', '1e2']) assert.equal(validateIntervalCount(value), false);
  assert.equal(nextOccurrence('2026-10-11', 'biweekly', 11, 10), '2026-10-25');
  assert.equal(frequencyLabel('monthly', 1), 'Cada mes');
  assert.equal(frequencyLabel('monthly', 2), 'Cada 2 meses');
  assert.equal(frequencyLabel('weekly', 3), 'Cada 3 semanas');
  assert.equal(frequencyLabel('daily', 1), 'Cada día');
});

test('changing the interval keeps the original calendar day if the next date is unchanged', () => {
  const payload = recurringPayload({ name: 'Renta', type: 'Gasto', amount: 1000, category: 'Hogar', description: '', frequency: 'monthly', date: '2026-02-28', intervalCount: '2', existing: { next_date: '2026-02-28', frequency: 'monthly', anchor_day: 31, anchor_month: 1, interval_count: 1 } });
  assert.equal(payload.interval_count, 2);
  assert.equal(payload.anchor_day, 31);
  assert.equal(nextOccurrence(payload.next_date, payload.frequency, payload.anchor_day, payload.anchor_month, payload.interval_count), '2026-04-30');
});


test('forecast starts today and ends on the last day of the next month, including year boundaries', () => {
  assert.deepEqual(forecastPeriod('2026-10-11'), { start: '2026-10-11', end: '2026-11-30' });
  assert.deepEqual(forecastPeriod('2026-12-15'), { start: '2026-12-15', end: '2027-01-31' });
  assert.equal(forecastPeriod('2024-01-31').end, '2024-02-29');
});

const scheduled = (overrides = {}) => ({ id: 'rule', name: 'Renta', type: 'expense', amount: 6000, active: true, next_date: '2026-11-11', frequency: 'monthly', interval_count: 1, anchor_day: 11, anchor_month: 11, ...overrides });

test('forecast combines the current balance and all active occurrences inside the period', () => {
  const result = balanceForecast([
    scheduled(),
    scheduled({ id: 'salary', name: 'Salario', type: 'income', amount: 15000 }),
    scheduled({ id: 'paused', active: false, amount: 8000 }),
    scheduled({ id: 'later', next_date: '2026-12-01', anchor_day: 1 }),
  ], [{ type: 'income', amount: 11000 }, { type: 'expense', amount: 1000 }], '2026-10-11');
  assert.equal(result.currentBalance, 10000);
  assert.equal(result.income, 15000);
  assert.equal(result.expenses, 6000);
  assert.equal(result.estimatedBalance, 19000);
  assert.equal(result.occurrences.length, 2);
});

test('daily repetitions include both period endpoints and use exact cents', () => {
  const result = balanceForecast([scheduled({ frequency: 'daily', amount: 0.1, next_date: '2026-10-11' })], [], '2026-10-11');
  assert.equal(result.occurrences.length, 51);
  assert.equal(result.expenses, 5.1);
  assert.equal(result.occurrences.at(-1).date, '2026-11-30');
});

test('overdue occurrences are separate and only enter the estimate when selected', () => {
  const rules = [scheduled({ next_date: '2026-09-11', anchor_month: 9 })];
  const result = balanceForecast(rules, [], '2026-10-11');
  assert.equal(result.overdueCount, 1);
  assert.equal(result.overdueExpenses, 6000);
  assert.equal(result.expenses, 12000);
  assert.equal(balanceForecast(rules, [], '2026-10-11', true).expenses, 18000);
});

test('confirmed occurrences cannot be counted twice, even with an outdated schedule snapshot', () => {
  const rules = [scheduled({ next_date: '2026-10-11' })];
  const transactions = [{ type: 'expense', amount: 6000, recurring_movement_id: 'rule', recurring_date: '2026-10-11' }];
  const result = balanceForecast(rules, transactions, '2026-10-11');
  assert.equal(result.currentBalance, -6000);
  assert.equal(result.expenses, 6000);
  assert.equal(result.estimatedBalance, -12000);
  assert.equal(result.occurrences[0].date, '2026-11-11');
});

test('custom month intervals respect the original day through short months in the forecast', () => {
  const result = balanceForecast([scheduled({ next_date: '2026-01-31', anchor_day: 31, anchor_month: 1 })], [], '2026-01-15');
  assert.deepEqual(result.occurrences.map((row) => row.date), ['2026-01-31', '2026-02-28']);
});
