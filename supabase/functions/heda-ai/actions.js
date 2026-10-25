// Pure allowlist shared with the app: never accept owner IDs or raw SQL.
export function validateAppAction(input){
 const fail=()=>{throw new Error('ACTION_INVALID');};
 if(!input||typeof input!=='object'||Array.isArray(input))fail();
 const fields={movement:['kind','type','amount','category','description','date','card_id'],goal:['kind','name','amount','date'],budget:['kind','category','amount'],recurring:['kind','name','type','amount','category','description','date','frequency','interval_count','card_id']};
 if(!fields[input.kind]||Object.keys(input).some(k=>!fields[input.kind].includes(k)))fail();
 const value={...input};
 if(typeof value.amount!=='number'||!Number.isFinite(value.amount)||value.amount<=0||value.amount>9999999999.99||Math.abs(value.amount*100-Math.round(value.amount*100))>0.00001)fail();
 for(const [key,max] of [['name',80],['category',60],['description',300]])if(value[key]!==undefined&&value[key]!==null){if(typeof value[key]!=='string'||value[key].trim().length>max||(!value[key].trim()&&key!=='description'))fail();value[key]=value[key].trim();}
 if(['movement','recurring'].includes(value.kind)&&!['income','expense'].includes(value.type))fail();
 if(['movement','budget','recurring'].includes(value.kind)&&!value.category)fail();
 if(['goal','recurring'].includes(value.kind)&&!value.name)fail();
 if(value.date&&typeof value.date!=='string')fail();
 if(value.date){const date=new Date(value.date+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(value.date)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value.date||value.date<'1900-01-01'||value.date>'2200-12-31')fail();}
 if(['movement','recurring'].includes(value.kind)&&!value.date)fail();
 if(value.card_id!=null&&(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.card_id)||value.type!=='expense'))fail();
 if(value.kind==='recurring'&&(!['daily','weekly','biweekly','monthly','yearly'].includes(value.frequency)||!Number.isInteger(value.interval_count)||value.interval_count<1||value.interval_count>365))fail();
 return value;
}
export function appActionRows(action){
 const a=validateAppAction(action),units={daily:['día','días'],weekly:['semana','semanas'],biweekly:['quincena','quincenas'],monthly:['mes','meses'],yearly:['año','años']},money='$'+a.amount.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
 return [['Acción',{movement:'Registrar movimiento',goal:'Crear meta',budget:'Crear presupuesto mensual',recurring:'Programar recurrente'}[a.kind]],...(a.name?[['Nombre',a.name]]:[]),...(a.type?[['Tipo',a.type==='income'?'Ingreso':'Gasto']]:[]),[a.kind==='goal'?'Objetivo':a.kind==='budget'?'Límite mensual':'Importe',money+' MXN'],...(a.category?[['Categoría',a.category]]:[]),...(a.date?[['Fecha',a.date.split('-').reverse().join('/')]]:[]),...(a.frequency?[['Se repite',`Cada ${a.interval_count} ${units[a.frequency][a.interval_count===1?0:1]}`]]:[]),...(a.description?[['Concepto',a.description]]:[]),...(['movement','recurring'].includes(a.kind)?[['Origen',a.card_id?'Tarjeta seleccionada':'Mi saldo']]:[])];
}
