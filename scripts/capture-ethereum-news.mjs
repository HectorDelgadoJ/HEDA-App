import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createEthereumNewsService,headlineTone} from '../supabase/functions/ethereum-forecast/news.js';
const toneVersion=createHash('sha256').update(readFileSync(new URL('../supabase/functions/ethereum-forecast/news.js',import.meta.url))).digest('hex');
const result=await createEthereumNewsService()();
if(!result.sources.some(s=>s.ok))throw Error('No sources responded; no observation was recorded.');
const file=new URL('../ml/ethereum/data/news_observations.json',import.meta.url);
const old=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{version:1,purpose:'Prospective observed headlines, never retroactively available training data.',captures:[],items:[]};
const seen=new Set(old.items.map(i=>i.url));
for(const item of result.items)if(!seen.has(item.url)){old.items.push({...item,observedAt:result.fetchedAt,toneVersion});seen.add(item.url);}
// Reclassification is explicit; first observation/publication timestamps never change.
for(const item of old.items)if(!item.toneVersion){item.tone=headlineTone(item.title);item.toneVersion=toneVersion;item.toneComputedAt=result.fetchedAt;}
old.captures.push({observedAt:result.fetchedAt,sources:result.sources,headlines:result.items.length});
writeFileSync(file,JSON.stringify(old,null,2)+'\n');
console.log(JSON.stringify({observedAt:result.fetchedAt,headlines:result.items.length,archiveItems:old.items.length,sources:result.sources}));
