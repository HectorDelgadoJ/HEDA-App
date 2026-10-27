// Public market data only. Freeze predictions before their target daily candle closes.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createEthereumService} from '../supabase/functions/ethereum-forecast/inference.js';
const raw=readFileSync(new URL('../supabase/functions/ethereum-forecast/models.json',import.meta.url),'utf8'),bundle=JSON.parse(raw),hash=createHash('sha256').update(raw).digest('hex'),result=await createEthereumService(bundle)();
if(result.stale||result.dataMode!=='provider')throw Error('No current provider data; no prospective record was added.');
const path=new URL('../ml/ethereum/reports/prospective_predictions.json',import.meta.url),old=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{purpose:'Frozen prospective predictions, not a backtest. Unresolved targets have no measured score.',records:[]};
for(const f of result.forecasts){const deadline=Date.parse(f.targetDate)+86400000;if(Date.now()>=deadline)continue;const key=[hash,result.source,result.asOf,f.horizonDays].join('|');if(old.records.some(r=>r.key===key))continue;old.records.push({key,recordedAt:new Date().toISOString(),modelVersion:bundle.modelVersion,modelSha256:hash,source:result.source,originDate:result.asOf,originClose:result.lastCandle.close,targetDate:f.targetDate,targetClosesAt:new Date(deadline).toISOString(),horizonDays:f.horizonDays,threshold:bundle.threshold,trend:f.trend,comparison:f.comparison?{name:f.comparison.name,trend:f.comparison.trend}:null,outcome:null});}
writeFileSync(path,JSON.stringify(old,null,2)+'\n');console.log(JSON.stringify({source:result.source,origin:result.asOf,stored:old.records.length,nextTargets:result.forecasts.map(f=>f.targetDate)}));
