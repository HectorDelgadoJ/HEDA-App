import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {ethFeatures,ethLSTM,ethReference,forecastEthereum,createEthereumService,parseYahooEth,validateEthBars} from '../supabase/functions/ethereum-forecast/inference.js';
const bundle=JSON.parse(readFileSync(new URL('../supabase/functions/ethereum-forecast/models.json',import.meta.url)));
for(const horizon of ['1','7'])test(`LSTM ${horizon}d matches actual PyTorch output`,()=>{
 const reference=bundle.parity[horizon];const actual=ethLSTM(reference.input,bundle.models[horizon]);actual.forEach((p,i)=>assert.ok(Math.abs(p-reference.probabilities[i])<1e-5));
 const model=bundle.models[horizon],rows=ethFeatures(bundle.referenceBars).slice(-bundle.window).map(row=>row.map((v,i)=>(v-model.mean[i])/model.scale[i]));rows.forEach((row,j)=>row.forEach((v,i)=>assert.ok(Math.abs(v-reference.input[j][i])<1e-4)));
});
test('forecast has both horizons, actual dates and transparent evaluation',()=>{const f=forecastEthereum(bundle,bundle.referenceBars,{now:new Date('2026-10-26T00:00:00Z')});assert.equal(f.forecasts.length,2);assert.deepEqual(f.forecasts.map(x=>x.horizonDays),[1,7]);assert.equal(f.lastCandle.close,bundle.referenceBars.at(-1).close);assert.equal(f.model.reports['7'].models.LSTM.test.macroF1,bundle.reports['7'].models.LSTM.test.macroF1);assert.ok(f.model.limitations.length>=4);});
test('invalid candle and missing daily data are rejected',()=>{let bars=structuredClone(bundle.referenceBars);bars[30].close=-1;assert.throws(()=>validateEthBars(bars));bars=structuredClone(bundle.referenceBars);bars.splice(30,1);assert.throws(()=>validateEthBars(bars),/MISSING_DAYS/);});
test('Yahoo parser excludes unclosed current candle',()=>{const bars=bundle.referenceBars;const last=bars.at(-1);const rows=[...bars,{...last,date:'2026-10-25'}];const value={chart:{result:[{meta:{currency:'USD'},timestamp:rows.map(b=>Date.parse(b.date)/1000),indicators:{quote:[Object.fromEntries(['open','high','low','close','volume'].map(k=>[k,rows.map(b=>b[k])]))]}}]}};assert.equal(parseYahooEth(value,new Date('2026-10-25T12:00:00Z')).at(-1).date,last.date);});
test('provider failure uses marked historical snapshot and caches',async()=>{let calls=0;const service=createEthereumService(bundle,async()=>{calls++;throw new Error('offline');},()=>new Date('2026-10-26T12:00:00Z'));const data=await service();assert.equal(data.dataMode,'training_snapshot');assert.equal(data.stale,true);assert.match(data.warning,/histórica/);assert.equal((await service()).asOf,data.asOf);assert.equal(calls,3);});
test('dashboard bundle has no relative dependencies and parses as TypeScript',()=>{const code=readFileSync('supabase/ethereum-forecast-dashboard.ts','utf8');assert.doesNotMatch(code,/from "\.\//);const out=ts.transpileModule(code,{reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});assert.equal(out.diagnostics.filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);});

test('Yahoo trailing unpublished slot is omitted, internal empty candle is rejected',()=>{
 const rows=[...bundle.referenceBars,{date:'2026-10-25',open:null,high:null,low:null,close:null,volume:null}];const response=()=>({chart:{result:[{meta:{currency:'USD'},timestamp:rows.map(b=>Date.parse(b.date)/1000),indicators:{quote:[Object.fromEntries(['open','high','low','close','volume'].map(k=>[k,rows.map(b=>b[k])]))]}}]}});
 assert.equal(parseYahooEth(response(),new Date('2026-10-26T12:00:00Z')).at(-1).date,'2026-10-24');rows[20]={...rows[20],close:null};assert.throws(()=>parseYahooEth(response(),new Date('2026-10-26T12:00:00Z')));
});

for(const h of ['1','7'])test(`reference model ${h}d matches sklearn`,()=>{const m=bundle.comparators[h],probs=ethReference([m.parity.input],m);m.classes.forEach((label,i)=>assert.ok(Math.abs(probs[label]-m.parity.probabilities[i])<1e-6));});
test('Coinbase fallback declares its source and training distribution limitation',async()=>{const service=createEthereumService(bundle,async url=>url.includes('yahoo')?new Response('',{status:429}):Response.json(bundle.referenceBars.map(b=>[Date.parse(b.date)/1000,b.low,b.high,b.open,b.close,b.volume])),()=>new Date('2026-10-25T12:00:00Z'));const data=await service();assert.equal(data.source,'Coinbase Exchange');assert.equal(data.dataMode,'provider');assert.match(data.warning,/cambio de fuente/);assert.equal(data.providerStatus.length,2);});
