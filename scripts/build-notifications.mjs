import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const form=read('utils/movementForm.js');
const dateHelper=form.slice(form.indexOf('export function localDate'),form.indexOf('// Monday-first'));
const shared=read('utils/finance.js')+'\n'+dateHelper+'\n'+read('utils/alerts.js').replace(/^import[^\n]+\n/gm,'');
writeFileSync(new URL('../supabase/functions/heda-notify/alerts.js',import.meta.url),shared);
writeFileSync(new URL('../supabase/heda-notify-dashboard.ts',import.meta.url),'// Edge Function heda-notify, NOT SQL.\nconst marketBundle='+JSON.stringify(JSON.parse(read('supabase/functions/ethereum-forecast/models.json')))+';\n'+read('supabase/functions/ethereum-forecast/inference.js')+'\n'+shared+'\n'+read('supabase/functions/heda-notify/index.ts').replace(/^import \{financialAlerts\}[^\n]+\n/gm,'').replace(/^import \{createEthereumService\}[^\n]+\n/gm,'').replace(/^import marketBundle[^\n]+\n/gm,''));
console.log('Notification worker generated.');
