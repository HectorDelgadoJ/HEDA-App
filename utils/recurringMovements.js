import { cashBalance, cardDebt, cents as moneyCents, recordedRows } from './finance';
export const frequencies = [
  ['monthly', 'Cada mes'], ['weekly', 'Cada semana'],
  ['biweekly', 'Cada 14 días'], ['yearly', 'Cada año'],
];
export const intervalUnits = [['daily', 'Días'], ['weekly', 'Semanas'], ['monthly', 'Meses'], ['yearly', 'Años']];

export function validateIntervalCount(value) {
  return /^\d+$/.test(String(value)) && Number(value) >= 1 && Number(value) <= 365;
}

export function frequencyLabel(frequency, intervalCount = 1) {
  const count = Number(intervalCount);
  if (frequency === 'biweekly') return `Cada ${14 * count} días`;
  const unit = { daily: ['día', 'días'], weekly: ['semana', 'semanas'], monthly: ['mes', 'meses'], yearly: ['año', 'años'] }[frequency];
  return unit ? `Cada ${count === 1 ? '' : `${count} `}${unit[count === 1 ? 0 : 1]}` : '';
}

export function recurringPayload({ name, type, amount, category, description, frequency, date, intervalCount = 1, existing, cardId }) {
  const [, month, day] = date.split('-').map(Number);
  const count = Number(intervalCount);
  const unchangedSchedule = existing && existing.next_date === date && existing.frequency === frequency;
  return { name: name.trim(), type: type === 'Ingreso' ? 'income' : 'expense', amount,
    category: category.trim(), description: description.trim() || null, frequency,
    interval_count: count, next_date: date,
    ...(cardId !== undefined ? { card_id: type === 'Ingreso' ? null : cardId } : {}),
    anchor_day: unchangedSchedule ? existing.anchor_day : day,
    anchor_month: unchangedSchedule ? existing.anchor_month : month };
}

export function nextOccurrence(date, frequency, anchorDay, anchorMonth, intervalCount = 1) {
  const [year, month, day] = date.split('-').map(Number);
  const count = Number(intervalCount);
  let next;
  if (['daily', 'weekly', 'biweekly'].includes(frequency)) {
    const days = { daily: 1, weekly: 7, biweekly: 14 }[frequency] * count;
    next = new Date(year, month - 1, day + days, 12);
  } else {
    next = frequency === 'yearly' ? new Date(year + count, anchorMonth - 1, 1, 12) : new Date(year, month - 1 + count, 1, 12);
    next.setDate(Math.min(anchorDay, new Date(next.getFullYear(), next.getMonth() + 1, 0, 12).getDate()));
  }
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}


export function forecastPeriod(today) {
  const [year, month] = today.split('-').map(Number);
  const end = new Date(year, month + 1, 0, 12);
  return { start: today, end: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}` };
}

export function balanceForecast(rules, transactions, today, includeOverdue = false, cards = []) {
  const period = forecastPeriod(today);
  const confirmed = new Set(transactions.filter((row) => row.recurring_movement_id && row.recurring_date)
    .map((row) => `${row.recurring_movement_id}:${row.recurring_date}`));
  const recorded = recordedRows(transactions, today);
  const balanceCents = moneyCents(cashBalance(recorded));
  let incomeCents = 0;
  let expenseCents = 0;
  let overdueCount = 0;
  let overdueIncomeCents = 0;
  let overdueExpenseCents = 0;
  const occurrences = [];
  let cardChargesCents = 0;
  let cardPaymentsCents = 0;
  for (const rule of rules) {
    if (!rule.active) continue;
    if (rule.card_id) {
      // Future credit charges do not leave available cash until a card payment.
      let chargeDate = rule.next_date;
      while (chargeDate <= period.end) {
        if ((chargeDate >= period.start || includeOverdue) && !confirmed.has(`${rule.id}:${chargeDate}`)) cardChargesCents += moneyCents(rule.amount);
        const next = nextOccurrence(chargeDate, rule.frequency, rule.anchor_day, rule.anchor_month, rule.interval_count || 1);
        if (next <= chargeDate) throw new Error('La programación no avanza a la siguiente fecha.');
        chargeDate = next;
      }
      continue;
    }
    let date = rule.next_date;
    const cents = Math.round(Number(rule.amount) * 100);
    while (date <= period.end) {
      const overdue = date < period.start;
      if (!confirmed.has(`${rule.id}:${date}`)) {
        if (overdue) {
          overdueCount++;
          if (rule.type === 'income') overdueIncomeCents += cents;
          else overdueExpenseCents += cents;
        }
        if (!overdue || includeOverdue) {
          if (rule.type === 'income') incomeCents += cents;
          else expenseCents += cents;
          occurrences.push({ ruleId: rule.id, name: rule.name, type: rule.type, amount: cents / 100, date, overdue });
        }
      }
      const next = nextOccurrence(date, rule.frequency, rule.anchor_day, rule.anchor_month, rule.interval_count || 1);
      if (next <= date) throw new Error('La programación no avanza a la siguiente fecha.');
      date = next;
    }
  }
  // Future dated records are projected once, outside the current balance.
  const future = transactions.filter(row => row.transaction_date > today && row.transaction_date <= period.end);
  for (const row of future) {
    if (row.card_id && !row.is_card_payment) { cardChargesCents += moneyCents(row.amount); continue; }
    if (row.type === 'income') incomeCents += moneyCents(row.amount);
    else expenseCents += moneyCents(row.amount);
    if (row.is_card_payment) cardPaymentsCents += moneyCents(row.amount);
    occurrences.push({ruleId:`transaction:${row.id}`,name:row.is_card_payment?'Pago de tarjeta registrado a futuro':'Movimiento registrado a futuro',type:row.type,amount:Number(row.amount),date:row.transaction_date,overdue:false});
  }
  for (const card of cards) {
    const futurePayments = future.filter(row => row.card_id === card.id && row.is_card_payment).reduce((sum,row)=>sum+moneyCents(row.amount),0);
    const debt = Math.max(0, moneyCents(cardDebt(card, recorded))-futurePayments);
    if (!debt || !card.due_date || card.due_date > period.end) continue;
    const overdue = card.due_date < period.start;
    if (overdue) { overdueCount++; overdueExpenseCents += debt; }
    if (!overdue || includeOverdue) {
      expenseCents += debt;
      cardPaymentsCents += debt;
      occurrences.push({ ruleId: `card:${card.id}`, name: `Pago de ${card.name}`, type: 'expense', amount: debt / 100, date: card.due_date, overdue });
    }
  }
  occurrences.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  return { ...period, currentBalance: balanceCents / 100, income: incomeCents / 100, expenses: expenseCents / 100,
    estimatedBalance: (balanceCents + incomeCents - expenseCents) / 100, occurrences,
    cardCharges: cardChargesCents / 100, cardPayments: cardPaymentsCents / 100, overdueCount, overdueIncome: overdueIncomeCents / 100, overdueExpenses: overdueExpenseCents / 100 };
}
