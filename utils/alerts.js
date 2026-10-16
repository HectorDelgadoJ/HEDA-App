import { cents, isSpending, cardDebt } from './finance';
import { localDate } from './movementForm';
const keyCategory = category => String(category || '').trim().toLocaleLowerCase('es-MX');
const amount = value => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
const labelDate = key => new Date(`${key}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);

export function budgetProgress(budgets, rows, now = new Date()) {
  const today = localDate(now), month = today.slice(0, 7), totals = new Map();
  rows.filter(row => isSpending(row) && row.transaction_date >= `${month}-01` && row.transaction_date <= today).forEach(row => {
    const key = keyCategory(row.category); totals.set(key, (totals.get(key) || 0) + cents(row.amount));
  });
  return budgets.filter(budget => Number(budget.monthly_limit) > 0).map(budget => {
    const limit = cents(budget.monthly_limit), spent = totals.get(keyCategory(budget.category)) || 0;
    const status = spent >= limit ? 'exceeded' : spent * 100 >= limit * 80 ? 'near' : 'normal';
    return { ...budget, spent: spent / 100, limit: limit / 100, remaining: (limit - spent) / 100,
      percent: Math.floor(spent / limit * 100), status, month };
  });
}

// Alerts describe current records; they never confirm, charge or pay anything.
export function financialAlerts({ rows = null, budgets = null, rules = null, cards = null, goals = null }, now = new Date()) {
  const today = localDate(now), alerts = [];
  if (rows && budgets) budgetProgress(budgets, rows, now).forEach(budget => {
    if (budget.status === 'normal') return;
    alerts.push({ id: `budget:${budget.id}:${budget.month}:${budget.status}:${cents(budget.limit)}`, type: 'Presupuestos',
      severity: budget.status === 'exceeded' ? 'danger' : 'warning', icon: 'pie-chart-outline', route: 'budgets',
      title: `${budget.category}: ${budget.status === 'exceeded' ? (budget.remaining === 0 ? 'límite alcanzado' : 'límite superado') : 'cerca del límite'}`,
      message: `Llevas ${amount(budget.spent)} de ${amount(budget.limit)} este mes (${budget.percent}%).`, date: today });
  });
  if (rules) rules.filter(rule => rule.active && rule.next_date && daysBetween(today, rule.next_date) <= 7).forEach(rule => {
    const days = daysBetween(today, rule.next_date), income = rule.type === 'income';
    alerts.push({ id: `recurring:${rule.id}:${rule.next_date}:${days < 0 ? 'overdue' : days === 0 ? 'today' : 'soon'}:${cents(rule.amount)}`,
      type: 'Pagos', severity: income ? 'info' : days <= 0 ? 'danger' : 'warning', icon: income ? 'arrow-down-circle-outline' : 'repeat-outline',
      title: `${rule.name}: ${days < 0 ? 'pendiente de confirmar' : days === 0 ? 'programado para hoy' : 'próximo movimiento'}`,
      message: `${income ? 'Ingreso' : 'Gasto'} de ${amount(rule.amount)} · ${labelDate(rule.next_date)}. Confírmalo en Programados solo si ya ocurrió.`,
      route: 'recurring', date: rule.next_date });
  });
  if (rows && cards) cards.filter(card => card.reminder && (card.ledger_enabled || !card.paid) && card.due_date && daysBetween(today, card.due_date) <= 7).forEach(card => {
    const debt = cardDebt(card, rows.filter(row => row.transaction_date <= today));
    if (debt <= 0) return;
    const days = daysBetween(today, card.due_date);
    alerts.push({ id: `card:${card.id}:${card.due_date}:${days < 0 ? 'overdue' : days === 0 ? 'today' : 'soon'}:${cents(debt)}`,
      type: 'Pagos', severity: days <= 0 ? 'danger' : 'warning', icon: 'card-outline', route: 'cards',
      title: `${card.name}: ${days < 0 ? 'fecha de pago transcurrida' : days === 0 ? 'fecha de pago hoy' : 'pago próximo'}`,
      message: `Deuda registrada: ${amount(debt)} · Fecha de pago: ${labelDate(card.due_date)}. Revisa tu estado de cuenta para confirmar el monto exigible.`, date: card.due_date });
  });
  if (goals) goals.filter(goal => goal.status === 'active' && Number(goal.target_amount) > 0).forEach(goal => {
    const target = cents(goal.target_amount), saved = cents(goal.current_amount), days = goal.target_date ? daysBetween(today, goal.target_date) : null;
    const progress = Math.round(saved / target * 100);
    if (saved < target && !(saved * 100 >= target * 80) && !(days !== null && days <= 7)) return;
    const reached = saved >= target, due = days !== null && days <= 7;
    alerts.push({ id: `goal:${goal.id}:${reached ? 'reached' : due ? `due:${goal.target_date}` : 'near'}`,
      type: 'Metas', severity: reached ? 'success' : due ? 'warning' : 'success', icon: 'flag-outline', route: 'goals', date: goal.target_date || today,
      title: `${goal.name}: ${reached ? 'monto objetivo alcanzado' : due ? (days < 0 ? 'revisa tu fecha meta' : days === 0 ? 'tu fecha meta es hoy' : 'tu fecha meta se acerca') : 'cada vez más cerca'}`,
      message: `${amount(saved)} de ${amount(target)} registrados (${progress}%).${goal.target_date ? ` Fecha meta: ${labelDate(goal.target_date)}.` : ''}` });
  });
  const order = { danger: 0, warning: 1, success: 2, info: 3 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity] || a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}
