import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const url = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const finance = url(readFileSync(new URL('../utils/finance.js', import.meta.url), 'utf8'));
const source = readFileSync(new URL('../utils/reports.js', import.meta.url), 'utf8').replace("'./finance'", JSON.stringify(finance));
const {reportPeriod, reportData} = await import(url(source));
test('weekly period uses Monday to Sunday across year boundaries', () => {
 const p=reportPeriod('weekly',0,new Date(2027,0,1));
 assert.equal(p.start,'2026-12-28'); assert.equal(p.end,'2027-01-03'); assert.equal(p.buckets.length,7);
});
test('previous month handles leap February and assigns every day once', () => {
 const p=reportPeriod('monthly',-1,new Date(2028,2,15));
 assert.equal(p.start,'2028-02-01'); assert.equal(p.end,'2028-02-29');
 const rows=Array.from({length:29},(_,i)=>({type:'income',amount:0.1,transaction_date:`2028-02-${String(i+1).padStart(2,'0')}`}));
 const data=reportData(rows,p); assert.equal(data.income,2.9);assert.equal(Math.round(data.buckets.reduce((s,b)=>s+b.income,0)*100),290);
});
test('report includes credit purchases once and separates payments from spending', () => {
 const p=reportPeriod('monthly',0,new Date(2026,9,15));
 const data=reportData([{type:'income',amount:1000,transaction_date:'2026-10-01'},{type:'expense',amount:100,card_id:'nu',transaction_date:'2026-10-02'},{type:'expense',amount:100,card_id:'nu',is_card_payment:true,transaction_date:'2026-10-03'},{type:'expense',amount:999,transaction_date:'2026-09-30'}],p);
 assert.equal(data.income,1000);assert.equal(data.expenses,100);assert.equal(data.result,900);assert.equal(data.cardPayments,100);assert.equal(data.cashChange,900);
 assert.equal(data.buckets.reduce((s,b)=>s+b.expenses,0),100);
});
test('yearly reports have twelve buckets and exclude neighbouring years', () => {
 const p=reportPeriod('yearly',-1,new Date(2026,9,15));assert.equal(p.start,'2025-01-01');assert.equal(p.end,'2025-12-31');assert.equal(p.buckets.length,12);
 const d=reportData([{type:'income',amount:10,transaction_date:'2025-12-31'},{type:'income',amount:20,transaction_date:'2026-01-01'}],p);assert.equal(d.income,10);assert.equal(d.buckets[11].income,10);
});

test('current reports share the same today cutoff as balance, budgets and AI',()=>{
 const p=reportPeriod('monthly',0,new Date(2026,9,17));
 const data=reportData([{type:'income',amount:100,transaction_date:'2026-10-17'},{type:'income',amount:999,transaction_date:'2026-10-18'}],p,'2026-10-17');assert.equal(data.income,100);assert.equal(data.rows.length,1);
});
