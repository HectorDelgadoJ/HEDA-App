import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const models=JSON.parse(readFileSync(new URL('supabase/functions/ethereum-forecast/models.json',root),'utf8'));
const inference=readFileSync(new URL('supabase/functions/ethereum-forecast/inference.js',root),'utf8').replace(/\r\n/g,'\n');
const news=readFileSync(new URL('supabase/functions/ethereum-forecast/news.js',root),'utf8').replace(/\r\n/g,'\n');
const index=readFileSync(new URL('supabase/functions/ethereum-forecast/index.ts',root),'utf8').replace(/\r\n/g,'\n').replace(/^import bundle[^\n]+\n/gm,'').replace(/^import \{createEthereumService\}[^\n]+\n/gm,'').replace(/^import \{createEthereumNewsService\}[^\n]+\n/gm,'');
writeFileSync(new URL('supabase/ethereum-forecast-dashboard.ts',root),'// Paste this entire TypeScript file into Edge Functions > ethereum-forecast. NOT SQL.\nconst bundle='+JSON.stringify(models)+';\n'+inference+'\n'+news+'\n'+index);
console.log('Ethereum Edge Function generated from trained artifacts.');
