import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=async name=>import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL(name,import.meta.url),'utf8')).toString('base64'));
const {priorityGuide}=await load('../utils/priorityGuide.js');
const {firstUseKey,normalizeSeenHelp,firstUseTips}=await load('../utils/firstUseHelp.js');
const {experienceDefaults,normalizeExperience,resetExperienceView}=await load('../utils/experience.js');
const {tourStopsForPriority}=await load('../utils/welcome.js');
test('priorities route to actual first tasks and existing records without financial writes',()=>{
 assert.deepEqual(priorityGuide('saving').params,{goalAction:'create',goalId:undefined});
 const goal={id:'own-goal',name:'Una bici'};assert.deepEqual(priorityGuide('saving',{goal}).params,{goalAction:'contribute',goalId:'own-goal'});
 assert.deepEqual(priorityGuide('payments').params,{openSection:'Recurrentes',newRecurring:true});
 assert.equal(priorityGuide('payments',{payment:{name:'Renta'}}).params.newRecurring,false);
 assert.equal(priorityGuide('expenses').params.movementType,'Gasto');assert.equal(priorityGuide('expenses',{spent:100}).route,'Alertas');
 assert.equal(priorityGuide('unknown').route,'Movimientos');assert.deepEqual(goal,{id:'own-goal',name:'Una bici'});
});
test('help state is per account, only accepts known tips and stores no financial fields',()=>{
 assert.notEqual(firstUseKey('A'),firstUseKey('B'));assert.equal(firstUseKey(null),null);
 assert.deepEqual(normalizeSeenHelp({goal:true,savings:'true',balance:100,password:'secret',unknown:true}),{goal:true});
 assert.deepEqual(normalizeSeenHelp(null),{});assert.ok(Object.keys(firstUseTips).length>=10);
});
test('guidance respects explicit opt-outs without changing visibility or accessibility',()=>{
 const initial=experienceDefaults('simple','saving'),saved=normalizeExperience({...initial,guidance:{firstUse:false,priority:false}});
 assert.deepEqual(saved.guidance,{firstUse:false,priority:false});assert.deepEqual(saved.widgets,initial.widgets);
 assert.deepEqual(resetExperienceView(saved).guidance,saved.guidance);
 assert.deepEqual(normalizeExperience({...initial,guidance:{firstUse:'false',priority:'false'}}).guidance,{firstUse:true,priority:true});
});
test('tour emphasizes the chosen goal and retains skip-safe account completion behavior',()=>{
 const basic=tourStopsForPriority('expenses'),saving=tourStopsForPriority('saving');
 assert.equal(basic.length,6);assert.equal(saving[1].route,'Reportes');assert.equal(basic[1].route,'Movimientos');
 assert.match(tourStopsForPriority('payments')[0].text,/recurrentes/);
 assert.equal(saving[1].params.goalAction,'create');assert.equal(basic[1].route,'Movimientos');
 assert.equal(basic.at(-1).settingsSection,'accessibility');
});

test('new simple view reduces duplicate shortcuts while legacy and explicit selections remain visible',()=>{
 const fresh=experienceDefaults();assert.equal(Object.values(fresh.shortcuts).filter(Boolean).length,3);
 assert.equal(normalizeExperience({version:1,mode:'simple',configured:true}).shortcuts.ethereum,true);
 assert.equal(normalizeExperience({...fresh,shortcuts:{...fresh.shortcuts,qr:true}}).shortcuts.qr,true);
});
