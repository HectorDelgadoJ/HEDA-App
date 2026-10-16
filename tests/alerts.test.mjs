import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const url = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const finance = url(readFileSync(new URL('../utils/finance.js', import.meta.url), 'utf8'));
const form = url(readFileSync(new URL('../utils/movementForm.js', import.meta.url), 'utf8'));
const source = readFileSync(new URL('../utils/alerts.js', import.meta.url), 'utf8').replace("'./finance'", JSON.stringify(finance)).replace("'./movementForm'", JSON.stringify(form));
const { budgetProgress, financialAlerts } = await import(url(source));
const now = new Date(2026, 9, 15, 12);
const budget = { id: 'b', category: 'Comida', monthly_limit: 100 };
const expense = (amount, fields = {}) => ({ type: 'expense', amount, category: 'Comida', transaction_date: '2026-10-15', ...fields });

test('budget threshold uses cents and does not alert early because of rounded percentages', () => {
  assert.equal(budgetProgress([budget], [expense(79.99)], now)[0].status, 'normal');
  assert.equal(budgetProgress([budget], [expense(79.99)], now)[0].percent, 79);
  assert.equal(budgetProgress([budget], [expense(80)], now)[0].status, 'near');
  assert.equal(budgetProgress([budget], [expense(100)], now)[0].status, 'exceeded');
  assert.equal(budgetProgress([budget], [expense(101)], now)[0].remaining, -1);
});
test('budget uses the calendar month, excludes future spending, income and card repayment', () => {
  const d = budgetProgress([budget], [expense(40, { card_id: 'card' }), expense(40, { is_card_payment: true }), expense(999, { type: 'income' }), expense(999, { transaction_date: '2026-09-30' }), expense(999, { transaction_date: '2026-10-16' }), expense(0.1), expense(0.2)], now)[0];
  assert.equal(d.spent, 40.3); assert.equal(d.remaining, 59.7);
  assert.equal(budgetProgress([budget], [expense(90)], new Date(2026, 10, 1))[0].spent, 0);
});
test('custom category matching ignores whitespace and case while keeping unrelated categories separate', () => {
  assert.equal(budgetProgress([budget], [expense(80, { category: ' comida ' }), expense(10, { category: 'Compras' })], now)[0].spent, 80);
});
test('missing sources produce no invented alerts; threshold and new month give distinct read identities', () => {
  assert.deepEqual(financialAlerts({}, now), []);
  const warning = financialAlerts({ budgets: [budget], rows: [expense(80)] }, now)[0];
  const reached = financialAlerts({ budgets: [budget], rows: [expense(100)] }, now)[0];
  assert.equal(warning.severity, 'warning'); assert.equal(reached.severity, 'danger'); assert.notEqual(warning.id, reached.id);
  const november = financialAlerts({ budgets: [budget], rows: [expense(80, { transaction_date: '2026-11-15' })] }, new Date(2026, 10, 15))[0];
  assert.notEqual(warning.id, november.id);
});
test('programmed alerts include overdue and next seven days, exclude paused and distant rules', () => {
  const rules = [
    { id: 'overdue', name: 'Renta', type: 'expense', amount: 500, next_date: '2026-10-10', active: true },
    { id: 'today', name: 'Salario', type: 'income', amount: 1000, next_date: '2026-10-15', active: true },
    { id: 'soon', name: 'Netflix', type: 'expense', amount: 100, next_date: '2026-10-22', active: true },
    { id: 'distant', name: 'Otro', type: 'expense', amount: 100, next_date: '2026-10-23', active: true },
    { id: 'paused', name: 'Pausa', type: 'expense', amount: 100, next_date: '2026-10-15', active: false },
  ];
  const alerts = financialAlerts({ rules }, now);
  assert.equal(alerts.length, 3); assert.equal(alerts[0].severity, 'danger'); assert.ok(alerts.some(item => item.message.includes('Ingreso')));
});
test('card alerts compute actual ledger debt, ignore future charges and do not trust stale paid flag', () => {
  const cards = [{ id: 'card', name: 'Tarjeta', ledger_enabled: true, paid: true, reminder: true, opening_balance: 100, due_date: '2026-10-15' }];
  const rows = [expense(50, { card_id: 'card' }), expense(30, { card_id: 'card', is_card_payment: true }), expense(999, { card_id: 'card', transaction_date: '2026-10-16' })];
  const alerts = financialAlerts({ rows, cards }, now);
  assert.equal(alerts.length, 1); assert.match(alerts[0].message, /120\.00/);
  assert.equal(financialAlerts({ rows: [...rows, expense(120, { card_id: 'card', is_card_payment: true })], cards }, now).length, 0);
  assert.equal(financialAlerts({ cards }, now).length, 0);
});
test('paid reminders, disabled reminders and distant cards do not generate notices', () => {
  const base = { id: 'c', name: 'Visa', amount: 100, due_date: '2026-10-15', reminder: true, ledger_enabled: false };
  assert.equal(financialAlerts({ rows: [], cards: [{ ...base, paid: true }, { ...base, reminder: false }, { ...base, due_date: '2026-10-23' }] }, now).length, 0);
});
test('goal notices come from active progress or date; cancelled and completed goals are excluded', () => {
  const base = { id: 'g', name: 'Laptop', target_amount: 1000, current_amount: 800, status: 'active' };
  assert.equal(financialAlerts({ goals: [base] }, now)[0].severity, 'success');
  assert.equal(financialAlerts({ goals: [{ ...base, current_amount: 10, target_date: '2026-10-16' }] }, now)[0].severity, 'warning');
  assert.equal(financialAlerts({ goals: [{ ...base, status: 'completed' }, { ...base, status: 'cancelled' }] }, now).length, 0);
});
