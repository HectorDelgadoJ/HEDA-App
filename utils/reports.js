import { cents, isSpending, cashBalance } from './finance';
const key = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function reportPeriod(filter, offset = 0, now = new Date()) {
  let start, end, buckets = [];
  if (filter === 'weekly') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay()+6)%7 + offset*7);
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate()+6);
    for (let i=0;i<7;i++) { const d=new Date(start.getFullYear(), start.getMonth(), start.getDate()+i); buckets.push({start:key(d),end:key(d),label:d.toLocaleDateString('es-MX',{weekday:'short'}).replace('.','')}); }
  } else if (filter === 'yearly') {
    start = new Date(now.getFullYear()+offset,0,1); end = new Date(start.getFullYear(),11,31);
    for(let i=0;i<12;i++) { const d=new Date(start.getFullYear(),i,1); buckets.push({start:key(d),end:key(new Date(d.getFullYear(),i+1,0)),label:d.toLocaleDateString('es-MX',{month:'short'}).replace('.','')}); }
  } else {
    start = new Date(now.getFullYear(),now.getMonth()+offset,1); end = new Date(start.getFullYear(),start.getMonth()+1,0);
    for(let day=1;day<=end.getDate();day+=7) buckets.push({start:key(new Date(start.getFullYear(),start.getMonth(),day)),end:key(new Date(start.getFullYear(),start.getMonth(),Math.min(day+6,end.getDate()))),label:`${day}–${Math.min(day+6,end.getDate())}`});
  }
  return {start:key(start),end:key(end),buckets};
}
export function reportData(rows, period) {
  const selected=rows.filter(row=>row.transaction_date>=period.start && row.transaction_date<=period.end);
  const sum=items=>items.reduce((total,row)=>total+cents(row.amount),0)/100;
  const income=sum(selected.filter(row=>row.type==='income'));
  const expenses=sum(selected.filter(isSpending));
  return {rows:selected,income,expenses,result:(cents(income)-cents(expenses))/100,cashChange:cashBalance(selected),cardPayments:sum(selected.filter(row=>row.is_card_payment)),buckets:period.buckets.map(bucket=>{const entries=selected.filter(row=>row.transaction_date>=bucket.start && row.transaction_date<=bucket.end);return {...bucket,income:sum(entries.filter(row=>row.type==='income')),expenses:sum(entries.filter(isSpending))};})};
}
