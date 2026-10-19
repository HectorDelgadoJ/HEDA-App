import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const finance=url(readFileSync(new URL('../utils/finance.js',import.meta.url),'utf8'));
const {reminderPlan}=await import(url(readFileSync(new URL('../utils/reminders.js',import.meta.url),'utf8').replace("'./finance'",JSON.stringify(finance))));
const now=new Date(2026,9,17,12);
const rule={id:'r',name:'Private name',active:true,next_date:'2026-10-20',amount:999};
test('next pending recurrence has two local-time notices and exposes no name or amount',()=>{
 const plan=reminderPlan({rules:[rule]},now);assert.equal(plan.length,2);
 assert.equal(new Date(plan[0].at).getDate(),19);assert.equal(new Date(plan[0].at).getHours(),9);
 assert.equal(new Date(plan[1].at).getDate(),20);assert.ok(!JSON.stringify(plan).includes('Private name'));assert.ok(!JSON.stringify(plan).includes('999'));
 assert.deepEqual(reminderPlan({rules:[rule]},now),plan);
});
test('paused, confirmed, overdue and invalid dates create no scheduled notices',()=>{
 for(const rules of [[{...rule,active:false}],[{...rule,next_date:'2026-10-16'}],[{...rule,next_date:null}]])assert.equal(reminderPlan({rules},now).length,0);
 assert.equal(reminderPlan({rules:[rule],rows:[{recurring_movement_id:'r',recurring_date:'2026-10-20'}]},now).length,0);
});
test('paid debt cancels card notices; future purchases do not become debt today',()=>{
 const card={id:'c',ledger_enabled:true,opening_balance:100,reminder:true,due_date:'2026-10-20'};
 assert.equal(reminderPlan({cards:[card]},now).length,2);
 assert.equal(reminderPlan({cards:[card],rows:[{card_id:'c',is_card_payment:true,amount:100,transaction_date:'2026-10-17'}]},now).length,0);
 assert.equal(reminderPlan({cards:[{...card,opening_balance:0}],rows:[{card_id:'c',amount:100,transaction_date:'2026-10-18'}]},now).length,0);
 assert.equal(reminderPlan({cards:[{...card,reminder:false}]},now).length,0);
});
test('goals without dates or already achieved do not notify; monthly dates cross year boundaries',()=>{
 const goal={id:'g',status:'active',current_amount:10,target_amount:100,target_date:'2027-01-01'};
 const plan=reminderPlan({goals:[goal]},now);assert.equal(new Date(plan[0].at).getFullYear(),2026);assert.equal(new Date(plan[0].at).getMonth(),11);assert.equal(new Date(plan[0].at).getDate(),31);
 assert.equal(reminderPlan({goals:[{...goal,target_date:null},{...goal,current_amount:100},{...goal,status:'completed'}]},now).length,0);
});
const service=readFileSync(new URL('../services/phoneReminders.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replaceAll('export ','');
function scheduler(initial=[],allowed=true,presented=[]){
 const scheduled=[...initial],cancelled=[],added=[],dismissed=[];
 const api={IosAuthorizationStatus:{PROVISIONAL:3},SchedulableTriggerInputTypes:{DATE:'date'},getAllScheduledNotificationsAsync:async()=>[...scheduled],getPermissionsAsync:async()=>({granted:allowed}),getPresentedNotificationsAsync:async()=>presented,cancelScheduledNotificationAsync:async id=>{cancelled.push(id);scheduled.splice(scheduled.findIndex(x=>x.identifier===id),1);},dismissNotificationAsync:async id=>dismissed.push(id),scheduleNotificationAsync:async item=>{added.push(item);scheduled.push({identifier:String(added.length),content:item.content});}};
 const reconcile=new Function('Platform','reminderPlan','api',service+'; modulePromise=Promise.resolve(api); return {reconcileReminders,clearForeignReminders,cancelAccountReminders};')({OS:'ios'},data=>data.plan,api);
 return {cancelOwned:reconcile.cancelAccountReminders,reconcile:reconcile.reconcileReminders,clearForeign:reconcile.clearForeignReminders,scheduled,cancelled,added,dismissed};
}
const item=(key='one')=>({key,at:Date.now()+86400000,title:'HEDA',body:'Reminder',kind:'card'});
test('schedule reconciliation is idempotent, cancels removed/foreign notices and preserves unrelated ones',async()=>{
 const other={identifier:'unrelated',content:{data:{other:true}}};const s=scheduler([other,{identifier:'foreign',content:{data:{hedaReminder:true,owner:'B',key:'one'}}}]);
 await s.reconcile('A',{plan:[item()]});await s.reconcile('A',{plan:[item()]});assert.equal(s.added.length,1);assert.deepEqual(s.cancelled,['foreign']);
 await s.reconcile('A',{plan:[]});assert.equal(s.scheduled.length,1);assert.equal(s.scheduled[0],other);
});
test('revoked permission or logout cancels HEDA schedules; limits are explicit and no money mutation occurs',async()=>{
 const s=scheduler();const plan=Array.from({length:70},(_,i)=>item(String(i)));const result=await s.reconcile('A',{plan});assert.equal(result.count,60);assert.equal(result.total,70);
 await s.reconcile(null,null);assert.equal(s.scheduled.length,0);
 const denied=scheduler([{identifier:'old',content:{data:{hedaReminder:true,owner:'A',key:'one'}}}],false);await denied.reconcile('A',{plan:[item()]});assert.equal(denied.added.length,0);assert.equal(denied.scheduled.length,0);
});

test('startup preserves this account schedules offline while removing foreign schedules',async()=>{
 const own={identifier:'a',content:{data:{hedaReminder:true,owner:'A',key:'one'}}},foreign={identifier:'b',content:{data:{hedaReminder:true,owner:'B',key:'one'}}};
 const s=scheduler([own,foreign]);await s.clearForeign('A');assert.deepEqual(s.scheduled,[own]);assert.deepEqual(s.cancelled,['b']);
});
test('stale synchronization cannot overwrite a newer account schedule',async()=>{
 const own={identifier:'b',content:{data:{hedaReminder:true,owner:'B',key:'one'}}};const s=scheduler([own]);await s.reconcile('A',{plan:[]},()=>false);assert.deepEqual(s.scheduled,[own]);
});

test('refresh preserves a pending test notification, but logout cancels it',async()=>{
 const sample={identifier:'test',content:{data:{hedaReminder:true,owner:'A',key:'test',test:true,expiresAt:Date.now()+30000}}};
 const s=scheduler([sample]);await s.reconcile('A',{plan:[]});assert.equal(s.scheduled.length,1);await s.reconcile(null,null);assert.equal(s.scheduled.length,0);
});

test('deleting an account cancels only its own scheduled and delivered notices',async()=>{
 const own={identifier:'own',content:{data:{hedaReminder:true,owner:'A'}}},foreign={identifier:'foreign',content:{data:{hedaReminder:true,owner:'B'}}},other={identifier:'other',content:{data:{other:true}}};
 const s=scheduler([own,foreign,other],true,[{request:own},{request:foreign},{request:other}]);await s.cancelOwned('A');
 assert.deepEqual(s.cancelled,['own']);assert.deepEqual(s.dismissed,['own']);assert.deepEqual(s.scheduled,[foreign,other]);
});
