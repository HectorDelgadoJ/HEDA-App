// Aggregate only server-selected fields. No descriptions, names, emails or raw IDs leave this module.
const money = value => Math.round(Number(value || 0) * 100);
const amount = value => value / 100;
const safeCategories = new Set(['Comida','Compras','Transporte','Hogar','Servicios','Salud','Educación','Entretenimiento']);
export function summaryDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const get = name => parts.find(part=>part.type===name).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function calculateFinancialSummary(transactions, cards, goals, today, budgets = []) {
  if ([...transactions.map(row=>row.amount),...cards.map(row=>row.opening_balance ?? 0),...goals.flatMap(row=>[row.target_amount,row.current_amount]),...budgets.map(row=>row.monthly_limit)].some(value=>!Number.isFinite(Number(value)))) throw new Error('SUMMARY_INVALID_DATA');
  const start = today.slice(0,7) + '-01';
  const recorded = transactions.filter(row=>row.transaction_date <= today);
  const month = recorded.filter(row=>row.transaction_date >= start);
  const spending = row=>row.type==='expense' && !row.is_card_payment;
  const sum = rows=>rows.reduce((total,row)=>total+money(row.amount),0);
  const cash = rows=>rows.filter(row=>!row.card_id || row.is_card_payment).reduce((total,row)=>total+(row.type==='income'?1:-1)*money(row.amount),0);
  const categories = new Map();
  for (const row of month.filter(spending)) {
    const category = safeCategories.has(row.category)?row.category:'Otros';
    categories.set(category,(categories.get(category)||0)+money(row.amount));
  }
  let debt = 0, credit = 0;
  const tracked = cards.filter(card=>card.ledger_enabled);
  for (const card of tracked) {
    const balance = money(card.opening_balance) + recorded.filter(row=>row.card_id===card.id).reduce((total,row)=>total+(row.is_card_payment?-1:1)*money(row.amount),0);
    debt += Math.max(0,balance); credit += Math.max(0,-balance);
  }
  const activeGoals = goals.filter(goal=>goal.status==='active');
  const target = activeGoals.reduce((total,goal)=>total+money(goal.target_amount),0);
  const saved = activeGoals.reduce((total,goal)=>total+money(goal.current_amount),0);
  const remaining = activeGoals.reduce((total,goal)=>total+Math.max(0,money(goal.target_amount)-money(goal.current_amount)),0);
  const income = sum(month.filter(row=>row.type==='income'));
  const expenses = sum(month.filter(spending));
  const categoryKey=value=>String(value||'').trim().toLocaleLowerCase('es-MX');
  const budgetTotals=new Map();
  for(const row of month.filter(spending)){const key=categoryKey(row.category);budgetTotals.set(key,(budgetTotals.get(key)||0)+money(row.amount));}
  const budgetStats=budgets.map(budget=>{const limit=money(budget.monthly_limit),spent=budgetTotals.get(categoryKey(budget.category))||0;return {limit,spent};}).filter(item=>item.limit>0);
  return {
    coverage:{recordedTransactionCount:recorded.length,firstRecordedDate:recorded.length?recorded.map(row=>row.transaction_date).sort()[0]:null,sparseMonth:month.length<5},
    budgets:{configuredCount:budgetStats.length,nearCount:budgetStats.filter(item=>item.spent<item.limit && item.spent*100>=item.limit*80).length,reachedCount:budgetStats.filter(item=>item.spent>=item.limit).length,monthlyLimitTotal:amount(budgetStats.reduce((sum,item)=>sum+item.limit,0)),spentInBudgetedCategories:amount(budgetStats.reduce((sum,item)=>sum+item.spent,0))},
    currency:'MXN',period:{start,end:today,timeZone:'America/Mexico_City'},
    availableBalance:amount(cash(recorded)),
    monthly:{income:amount(income),expenses:amount(expenses),result:amount(income-expenses),cashChange:amount(cash(month)),cardPayments:amount(sum(month.filter(row=>row.is_card_payment))),transactionCount:month.length,
      categories:[...categories].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([category,cents])=>({category,amount:amount(cents),percent:expenses?Math.round(cents/expenses*100):0}))},
    cards:{trackedCount:tracked.length,debt:amount(debt),credit:amount(credit),untrackedReminderCount:cards.filter(card=>!card.ledger_enabled && !card.paid).length},
    goals:{activeCount:activeGoals.length,target:amount(target),saved:amount(saved),remaining:amount(remaining),progressPercent:target?Math.min(100,Math.round(saved/target*100)):0},
    limitations:['Solo registros hasta la fecha indicada; no incluye movimientos futuros ni recurrentes pendientes.','El resultado mensual no es dinero libre garantizado.','La deuda solo incluye tarjetas con seguimiento de cargos; otros recordatorios no representan deuda calculada.','El avance de metas es progreso registrado, no dinero separado del saldo.','Categorías personalizadas agrupadas en Otros.','Los presupuestos cubren solo las categorías configuradas; su límite no es dinero separado.','Con pocos registros no se pueden inferir hábitos ni tendencias; los registros no prueban que estén todas las finanzas.'],
  };
}
async function readSummaryRows(client, table, columns, userId, today) {
  const rows=[];
  while (rows.length <= 20000) {
    let query=client.from(table).select(columns,{count:'exact'}).eq('user_id',userId).order('id').range(rows.length,rows.length+999);
    if (table==='transactions') query=query.lte('transaction_date',today);
    const {data,error,count}=await query.abortSignal(AbortSignal.timeout(15000));
    if (error || !Array.isArray(data) || !Number.isInteger(count)) throw new Error('SUMMARY_LOAD_FAILED');
    rows.push(...data);
    if (rows.length>20000) throw new Error('SUMMARY_TOO_LARGE');
    if (rows.length>=count) return rows;
    if (!data.length) throw new Error('SUMMARY_LOAD_FAILED');
  }
  throw new Error('SUMMARY_TOO_LARGE');
}
export async function loadFinancialPreview(client, userId, now = new Date()) {
  const today=summaryDate(now);
  const [transactions,cards,goals,budgets]=await Promise.all([
    readSummaryRows(client,'transactions','id,type,amount,category,transaction_date,card_id,is_card_payment',userId,today),
    readSummaryRows(client,'card_payments','id,ledger_enabled,opening_balance,paid',userId,today),
    readSummaryRows(client,'goals','id,target_amount,current_amount,status',userId,today),
    readSummaryRows(client,'budgets','id,category,monthly_limit',userId,today),
  ]);
  const summary=calculateFinancialSummary(transactions,cards,goals,today,budgets);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(userId+'\n'+JSON.stringify(summary)));
  const summaryDigest=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  return {ok:true,financialVersion:1,summary,summaryDigest};
}

export async function handleHedaBody(body, ctx, ask, enabled, now = new Date()) {
  if (!ctx.userClaims?.id) return {status:401,body:{ok:false,message:'Vuelve a iniciar sesión para usar HEDA IA.'}};
  if (!enabled) return {status:503,body:{ok:false,message:'El asistente está temporalmente desactivado.'}};
  if (body?.action==='financial_preview') return {status:200,body:await loadFinancialPreview(ctx.supabase,ctx.userClaims.id,now)};
  if (body?.action !== undefined) return {status:400,body:{ok:false,message:'Solicitud no válida.'}};
  const message=typeof body?.message==='string'?body.message.trim():'';
  if (!message || message.length>2000) return {status:400,body:{ok:false,message:'Escribe una pregunta de hasta 2000 caracteres.'}};
  let financialSummary=null;
  if (body.financialConsent === true) {
    if (typeof body.summaryDigest !== 'string' || !/^[a-f0-9]{64}$/.test(body.summaryDigest)) return {status:400,body:{ok:false,message:'Revisa y autoriza el resumen antes de compartirlo.'}};
    const preview=await loadFinancialPreview(ctx.supabase,ctx.userClaims.id,now);
    if (preview.summaryDigest!==body.summaryDigest) return {status:409,body:{ok:false,error:'SUMMARY_CHANGED',message:'Tus registros cambiaron. Revisa y autoriza el resumen actualizado antes de continuar.'}};
    if (!preview.summary.monthly.transactionCount) return {status:422,body:{ok:false,error:'SUMMARY_NO_DATA',message:'Todavía no tienes movimientos de este mes para analizar. Registra tus ingresos o gastos, o consulta una duda general sin compartir el resumen.'}};
    financialSummary=preview.summary;
  } else if (body.summaryDigest !== undefined) {
    return {status:400,body:{ok:false,message:'Falta autorizar el resumen financiero.'}};
  }
  const result=await ask(message,body.history,financialSummary);
  return {status:200,body:{...result,financialVersion:1,financialSummaryUsed:!!financialSummary}};
}
