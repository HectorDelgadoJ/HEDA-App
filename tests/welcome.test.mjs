import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=async file=>import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL(file,import.meta.url),'utf8')).toString('base64'));
const {welcomeStage,tourStops}=await load('../utils/welcome.js');
const {normalizeExperience,experienceDefaults,resetExperienceView}=await load('../utils/experience.js');
test('legacy configured accounts still receive welcome once; saved account state suppresses repeat',()=>{
 const old=normalizeExperience({version:1,configured:true});assert.equal(welcomeStage(old),'personalize');
 const setup=normalizeExperience({...old,welcomeDone:true});assert.equal(welcomeStage(setup),'tour');
 const finished=normalizeExperience({...setup,tourDone:true});assert.equal(welcomeStage(JSON.parse(JSON.stringify(finished))),'done');
 assert.equal(welcomeStage(experienceDefaults(),{ready:false}),'idle');assert.equal(welcomeStage(old,{deferred:true}),'idle');
 assert.equal(welcomeStage(normalizeExperience(undefined)),'personalize');
});
test('customization reset and serialization retain completed welcome and tour',()=>{
 const state={...experienceDefaults(),welcomeDone:true,tourDone:true};
 assert.equal(resetExperienceView(state).tourDone,true);assert.equal(normalizeExperience({...state,tourDone:'true'}).tourDone,false);
 assert.deepEqual(tourStops.map(x=>x.route),['Inicio','Movimientos','Reportes','IA','Herramientas','Perfil']);
});
