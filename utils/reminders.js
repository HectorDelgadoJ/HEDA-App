import { cardDebt } from './finance';
// Only the next unconfirmed occurrence is scheduled. Opening a notice never records money.
export function reminderPlan({ rules = [], cards = [], rows = [], goals = [] }, now = new Date()) {
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const recorded = rows.filter(row => row.transaction_date <= today);
  const confirmed = new Set(rows.filter(row => row.recurring_movement_id && row.recurring_date).map(row => `${row.recurring_movement_id}:${row.recurring_date}`));
  const plan = [];
  function add(kind, id, date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return;
    const due = new Date(`${date}T09:00:00`);
    if (!Number.isFinite(due.getTime()) || due < now) return;
    for (const days of [1, 0]) {
      const at = new Date(due); at.setDate(at.getDate()-days);
      if (at <= now) continue;
      plan.push({ key: `${kind}:${id}:${date}:${days}`, at: at.getTime(), kind,
        title: 'HEDA · Recordatorio',
        body: kind === 'card' ? 'Revisa una fecha de pago de tarjeta en HEDA.' : kind === 'goal' ? 'Se acerca una fecha meta. Revisa tu avance en HEDA.' : 'Tienes un pago o ingreso programado. Confírmalo en HEDA solo si ya ocurrió.' });
    }
  }
  rules.filter(rule => rule.active && !confirmed.has(`${rule.id}:${rule.next_date}`)).forEach(rule => add('recurring',rule.id,rule.next_date));
  cards.filter(card => card.reminder && cardDebt(card,recorded)>0).forEach(card => add('card',card.id,card.due_date));
  goals.filter(goal => goal.status==='active' && Number(goal.current_amount)<Number(goal.target_amount)).forEach(goal => add('goal',goal.id,goal.target_date));
  return plan.sort((a,b)=>a.at-b.at || a.key.localeCompare(b.key));
}
