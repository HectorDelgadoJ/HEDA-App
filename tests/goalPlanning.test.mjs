import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const {goalPlan,contributionPatch,validateGoalDate}=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../utils/goalPlan.js',import.meta.url),'utf8')).toString('base64'));
const goal={target_amount:10000,current_amount:4000,created_at:'2026-10-01',target_date:'2026-10-31'};
test('progress follows cents, clamps excess savings and keeps a completed goal at 100 percent',()=>{
 assert.equal(goalPlan({...goal,current_amount:2500},'2026-10-11').percent,25);
 const done=goalPlan({...goal,current_amount:11000},'2026-10-11');assert.equal(done.percent,100);assert.equal(done.remaining,0);assert.equal(done.status,'complete');
 assert.deepEqual(contributionPatch({...goal,current_amount:0.1,target_amount:1},'0,20'),{current_amount:0.3,status:'active'});
});
test('dated goals compare a disclosed average against the required pace',()=>{
 const on=goalPlan(goal,'2026-10-11');assert.equal(on.status,'onTrack');assert.equal(on.projectedAmount,12000);assert.equal(on.estimatedDate,'2026-10-26');assert.equal(on.weeklyRequired,2100);
 const behind=goalPlan({...goal,current_amount:1000},'2026-10-11');assert.equal(behind.status,'behind');assert.equal(behind.projectedAmount,3000);assert.equal(behind.weeklyRequired,3150);
});
test('new or empty savings histories do not manufacture an estimated pace',()=>{
 for(const data of [{...goal,created_at:'2026-10-10'},{...goal,current_amount:0},{...goal,created_at:null}]){const plan=goalPlan(data,'2026-10-11');assert.equal(plan.status,'insufficient');assert.equal(plan.estimatedDate,null);assert.equal(plan.projectedAmount,null);}
 assert.equal(goalPlan({...goal,target_date:null},'2026-10-11').status,'noDate');
});
test('today, overdue dates, leap days and invalid data are handled separately',()=>{
 const now=goalPlan({...goal,target_date:'2026-10-11'},'2026-10-11');assert.equal(now.status,'today');assert.equal(now.weeklyRequired,6000);
 assert.equal(goalPlan({...goal,target_date:'2026-10-10'},'2026-10-11').status,'overdue');
 assert.equal(goalPlan({...goal,target_date:'2028-03-01'},'2028-02-28').daysLeft,2);
 assert.equal(goalPlan({...goal,target_amount:0},'2026-10-11').status,'unavailable');
 assert.equal(validateGoalDate('2026-02-30','2026-01-01'),'Elige una fecha válida.');assert.equal(validateGoalDate('','2026-10-11'),'');assert.ok(validateGoalDate('2026-10-10','2026-10-11'));
});
test('weekly suggestions never exceed the outstanding goal and contributions reject invalid precision',()=>{
 const near=goalPlan({...goal,current_amount:9999.99,target_date:'2026-10-12'},'2026-10-11');assert.equal(near.weeklyRequired,0.01);
 for(const value of ['0','-10','1.001','1e4','NaN','9999999999999'])assert.throws(()=>contributionPatch(goal,value));
 assert.equal(contributionPatch(goal,'6000').status,'completed');
});
