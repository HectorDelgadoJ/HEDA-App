import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const financeSource = readFileSync(new URL('../utils/finance.js', import.meta.url), 'utf8');
const financeUrl = 'data:text/javascript;base64,' + Buffer.from(financeSource).toString('base64');
const { cashBalance, cardDebt, spendingTotal, financialTotals } = await import(financeUrl);
const recurringSource = readFileSync(new URL('../utils/recurringMovements.js', import.meta.url), 'utf8').replace("'./finance'", JSON.stringify(financeUrl));
const { balanceForecast } = await import('data:text/javascript;base64,' + Buffer.from(recurringSource).toString('base64'));
const card = { id: 'nu', ledger_enabled: true, opening_balance: 1000, due_date: '2026-10-20' };
const income = { type: 'income', amount: 10000 };
const charge = { type: 'expense', amount: 100, card_id: 'nu' };
const payment = { type: 'expense', amount: 1100, card_id: 'nu', is_card_payment: true };
test('credit charge increases debt and spending without reducing cash', () => {
  const rows = [income, charge];
  assert.equal(cashBalance(rows), 10000);
  assert.equal(cardDebt(card, rows), 1100);
  assert.equal(spendingTotal(rows), 100);
});
test('paying the card reduces cash and debt without counting the purchase twice', () => {
  const rows = [income, charge, payment];
  assert.equal(cashBalance(rows), 8900);
  assert.equal(cardDebt(card, rows), 0);
  assert.equal(spendingTotal(rows), 100);
});
test('editing or deleting a charge automatically changes the debt', () => {
  assert.equal(cardDebt(card, [income, { ...charge, amount: 200 }]), 1200);
  assert.equal(cardDebt(card, [income]), 1000);
  assert.equal(cardDebt(card, [{ ...charge, card_id: 'other' }]), 1000);
});
test('existing cash records preserve their balance and cents', () => {
  const rows = [{ type: 'income', amount: '0.30' }, { type: 'expense', amount: '0.10' }];
  assert.equal(cashBalance(rows), 0.2);
  assert.equal(spendingTotal(rows), 0.1);
});
test('forecast reserves card debt once and keeps future card charges separate', () => {
  const rule = { id: 'netflix', name: 'Netflix', type: 'expense', amount: 200, card_id: 'nu', frequency: 'monthly', interval_count: 1, next_date: '2026-10-15', anchor_day: 15, anchor_month: 10, active: true };
  const forecast = balanceForecast([rule], [income, charge], '2026-10-11', false, [card]);
  assert.equal(forecast.currentBalance, 10000);
  assert.equal(forecast.cardCharges, 400);
  assert.equal(forecast.cardPayments, 1100);
  assert.equal(forecast.expenses, 1100);
  assert.equal(forecast.estimatedBalance, 8900);
});
test('a paid card is not deducted again from the forecast', () => {
  const forecast = balanceForecast([], [income, charge, payment], '2026-10-11', false, [card]);
  assert.equal(forecast.expenses, 0);
  assert.equal(forecast.estimatedBalance, 8900);
});
test('overdue card debt is included only when requested; later due dates are excluded', () => {
  const overdue = { ...card, due_date: '2026-10-01' };
  assert.equal(balanceForecast([], [income], '2026-10-11', false, [overdue]).estimatedBalance, 10000);
  assert.equal(balanceForecast([], [income], '2026-10-11', true, [overdue]).estimatedBalance, 9000);
  assert.equal(balanceForecast([], [income], '2026-10-11', true, [{ ...card, due_date: '2026-12-01' }]).estimatedBalance, 10000);
});

test('current totals exclude future records and retain exact income/expense cents',()=>{
 const rows=[{type:'income',amount:0.3,transaction_date:'2026-10-17'},{type:'expense',amount:0.1,transaction_date:'2026-10-17'},{type:'income',amount:999,transaction_date:'2026-10-18'}];
 assert.deepEqual(financialTotals(rows,'2026-10-17'),{income:0.3,expenses:0.1,balance:0.2,result:0.2});
});
test('forecast includes future dated cash records once and never treats them as current balance',()=>{
 const rule={id:'salary',name:'Salario',type:'income',amount:2000,frequency:'monthly',interval_count:1,next_date:'2026-11-15',anchor_day:15,anchor_month:11,active:true};
 const rows=[{id:'i',type:'income',amount:10000,transaction_date:'2026-10-17'},{id:'future',type:'income',amount:2000,transaction_date:'2026-11-15',recurring_movement_id:'salary',recurring_date:'2026-11-15'}];
 const result=balanceForecast([rule],rows,'2026-10-17');assert.equal(result.currentBalance,10000);assert.equal(result.income,2000);assert.equal(result.estimatedBalance,12000);
});
test('future recorded payment and card reserve cannot subtract the same debt twice',()=>{
 const rows=[{id:'i',type:'income',amount:10000,transaction_date:'2026-10-17'},{id:'p',type:'expense',card_id:'nu',is_card_payment:true,amount:1000,transaction_date:'2026-10-20'}];
 const result=balanceForecast([],rows,'2026-10-17',false,[card]);assert.equal(result.currentBalance,10000);assert.equal(result.expenses,1000);assert.equal(result.cardPayments,1000);assert.equal(result.estimatedBalance,9000);
});
