import {readFileSync,writeFileSync} from 'node:fs';
import {createEthereumService} from '../supabase/functions/ethereum-forecast/inference.js';
import {prospectiveOutcome} from '../utils/ethereumProspective.js';
const bundle=JSON.parse(readFileSync(new URL('../supabase/functions/ethereum-forecast/models.json',import.meta.url),'utf8'));
const result=await createEthereumService(bundle)();if(result.dataMode!=='provider'||result.stale)throw Error('No current verified provider data; outcomes unchanged.');
const path=new URL('../ml/ethereum/reports/prospective_predictions.json',import.meta.url),archive=JSON.parse(readFileSync(path,'utf8'));let resolved=0;const review=[];
for(const record of archive.records){if(record.outcome)continue;try{const outcome=prospectiveOutcome(record,result.history,result.source);if(outcome){record.outcome=outcome;resolved++;}}catch(error){review.push({origin:record.originDate,horizon:record.horizonDays,reason:error.message});}}
writeFileSync(path,JSON.stringify(archive,null,2)+'\n');console.log(JSON.stringify({resolved,pending:archive.records.filter(r=>!r.outcome).length,review,note:'Few observations do not establish predictive quality. Predictions may have been issued partway through a target day.'}));
