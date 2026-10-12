import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const financeUrl = 'data:text/javascript;base64,' + Buffer.from(readFileSync(new URL('../utils/finance.js', import.meta.url), 'utf8')).toString('base64');
const source = readFileSync(new URL('../utils/cardPayments.js', import.meta.url), 'utf8').replace("'./finance'", JSON.stringify(financeUrl));
const { cardSummary } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
test('reserves unpaid cards without changing the current balance', () => {
  assert.deepEqual(cardSummary([{ amount: 100 }, { amount: 1000 }], [{ type: 'income', amount: 10000 }]), { balance: 10000, pending: 1100, remaining: 8900 });
});
test('paid cards are excluded after their expense is registered', () => {
  assert.deepEqual(cardSummary([{ amount: 100, paid: true }, { amount: 1000 }], [{ type: 'income', amount: 10000 }, { type: 'expense', amount: 100 }]), { balance: 9900, pending: 1000, remaining: 8900 });
});
test('handles cents and a shortfall without clamping the balance', () => {
  assert.deepEqual(cardSummary([{ amount: '0.30' }], [{ type: 'income', amount: '0.10' }, { type: 'income', amount: '0.10' }]), { balance: 0.2, pending: 0.3, remaining: -0.1 });
});
