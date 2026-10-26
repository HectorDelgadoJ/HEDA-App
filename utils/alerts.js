import { cents, isSpending, cardDebt } from './finance';
import { localDate } from './movementForm';
const keyCategory = category => String(category || '').trim().toLocaleLowerCase('es-MX');
const amount = value => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
const labelDate = key => new Date(`${key}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);

export function budgetProgress(budgets, rows, now = new Date()) {
  const today = localDate(now), month = today.slice(0, 7), totals = new Map();
  return budgets.filter(b=>Number(b.monthly_limit)>0).map(budget=>{
    const from=budget.starts_on||`${month}-01`,to=budget.ends_on||today,active=from<=today&&(!budget.ends_on||budget.ends_on>=today);
    const spent=rows.filter(row=>isSpending(row)&&keyCategory(row.category)===keyCategory(budget.category)&&row.transaction_date>=from&&row.transaction_date<=to&&row.transaction_date<=today).reduce((sum,row)=>sum+cents(row.amount),0),limit=cents(budget.monthly_limit);
    const status=!active?'inactive':spent>=limit?'exceeded':spent*100>=limit*80?'near':'normal';
    return {...budget,spent:spent/100,limit:limit/100,remaining:(limit-spent)/100,percent:Math.floor(spent/limit*100),status,month:budget.starts_on?`${from}:${to}`:month,periodLabel:budget.starts_on?`${from} al ${to}`:'este mes'};
  });
}

// Alerts describe current records; they never confirm, charge or pay anything.
export function financialAlerts({ rows = null, budgets = null, rules = null, cards = null, goals = null, ethereum = null }, now = new Date()) {
  const today = localDate(now), alerts = [];
  if (rows && budgets) budgetProgress(budgets, rows, now).forEach(budget => {
    if (['normal','inactive'].includes(budget.status)) return;
    alerts.push({ id: `budget:${budget.id}:${budget.month}:${budget.status}:${cents(budget.limit)}`, type: 'Presupuestos',
      severity: budget.status === 'exceeded' ? 'danger' : 'warning', icon: 'pie-chart-outline', route: 'budgets',
      title: `${budget.category}: ${budget.status === 'exceeded' ? (budget.remaining === 0 ? 'límite alcanzado' : 'límite superado') : 'cerca del límite'}`,
      message: `Llevas ${amount(budget.spent)} de ${amount(budget.limit)} ${budget.periodLabel} (${budget.percent}%).`, date: today });
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
  if(rows){
    const current=rows.filter(r=>r.transaction_date>=today.slice(0,7)+'-01'&&r.transaction_date<=today),spending=current.filter(isSpending),income=current.filter(r=>r.type==='income').reduce((n,r)=>n+cents(r.amount),0),expense=spending.reduce((n,r)=>n+cents(r.amount),0);
    if(current.length>=5&&income>0&&expense>income)alerts.push({id:`imbalance:${today.slice(0,7)}`,type:'Hábitos',severity:'warning',icon:'analytics-outline',route:'habits',date:today,title:'Tus gastos registrados superan tus ingresos',message:'Revisa el balance del mes y los gastos que puedes ajustar. Solo considera lo que anotaste en HEDA.'});
    if(current.length>=5&&income>0&&expense<=income&&expense>income*.9&&Number(today.slice(-2))>=15)alerts.push({id:`low-saving:${today.slice(0,7)}`,type:'Recomendaciones',severity:'info',icon:'bulb-outline',route:'education',date:today,title:'Revisa cuánto puedes separar para ahorrar',message:'La diferencia entre tus ingresos y gastos registrados es menor al 10% de tus ingresos. Es una observación de tus registros, no una medida de tu situación financiera real.'});
    const past=rows.filter(r=>isSpending(r)&&r.transaction_date<today&&r.transaction_date>=new Date(Date.parse(today)-30*86400000).toISOString().slice(0,10)).map(r=>cents(r.amount)).sort((a,b)=>a-b);
    if(past.length>=10){const median=(past[Math.floor((past.length-1)/2)]+past[Math.floor(past.length/2)])/2;for(const r of spending.filter(r=>r.transaction_date===today&&cents(r.amount)>median*3&&cents(r.amount)>=10000))alerts.push({id:`unusual:${r.id||r.transaction_date+':'+r.amount}`,type:'Hábitos',severity:'warning',icon:'alert-circle-outline',route:'habits',date:today,title:'Un gasto es mayor a lo habitual en tus registros',message:'Supera tres veces la mediana de tus gastos de los 30 días anteriores. Revísalo; no significa que sea un error ni un cargo no reconocido.'});}
    if(current.length>=5)alerts.push({id:`education:${today.slice(0,7)}`,type:'Recomendaciones',severity:'info',icon:'school-outline',route:'education',date:today,title:'Continúa tu aprendizaje financiero',message:'Abre Educación para ver contenido recomendado según tu perfil y registros.'});
  }
  if(ethereum?.ok&&!ethereum.stale&&ethereum.lastCandle?.open>0){const change=ethereum.lastCandle.close/ethereum.lastCandle.open-1;if(Math.abs(change)>=.05)alerts.push({id:`eth-volatility:${ethereum.asOf}`,type:'Ethereum',severity:'warning',icon:'analytics-outline',route:'ethereum',date:ethereum.asOf,title:'Ethereum tuvo una variación diaria importante',message:`Cambio entre apertura y cierre: ${(change*100).toFixed(1)}% (${ethereum.asOf}, UTC; ${ethereum.source}). Es información histórica de mercado, no una señal para comprar o vender.`});}
  const order = { danger: 0, warning: 1, success: 2, info: 3 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity] || a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}
