// Public RSS headlines only. Never receives account data or changes forecasts.
export const ETH_NEWS_SOURCES=[
 {name:'Ethereum Foundation',url:'https://blog.ethereum.org/en/feed.xml',host:'blog.ethereum.org',institutional:true},
 {name:'CoinDesk',url:'https://www.coindesk.com/arc/outboundfeeds/rss',host:'www.coindesk.com'},
 {name:'Cointelegraph',url:'https://cointelegraph.com/rss/tag/ethereum',host:'cointelegraph.com'}
];
const ethNewsRelevant=/\b(ethereum|ether|eth|erc[- ]?\d+|vitalik|buterin|pectra|fusaka)\b/i;
function newsText(value){return String(value||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ').replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>{const v=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return v>0&&v<=0x10ffff?String.fromCodePoint(v):' ';}).replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/\s+/g,' ').trim();}
export function headlineTone(title){
 // Transparent English-title lexicon, not a trained sentiment model or price signal.
 if(/\b(not|no|never|without|despite|resolved|unconfirmed|rumor)\b|\?/.test(title.toLowerCase()))return {label:'sin clasificar',score:0};
 const positive=/\b(approval|approved|growth|gains?|surge[sd]?|rall(?:y|ies)|upgrade|adoption|inflows?)\b/gi;
 const negative=/\b(hack(?:ed)?|exploit|outage|lawsuit|fraud|loss(?:es)?|crash|drop[sp]?|decline[sd]?|outflows?|attack|stolen|slump[sd]?|delays?|risks?)\b/gi;
 const p=(title.match(positive)||[]).length,n=(title.match(negative)||[]).length;
 return {label:p&&n?'mixto':p?'favorable':n?'desfavorable':'sin clasificar',score:p&&n?0:p?1:n?-1:0};
}
export function parseEthereumNews(xml,source,now=new Date()){
 if(typeof xml!=='string'||xml.length>2000000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('NEWS_INVALID_FEED');
 if(!/<rss\b|<feed\b/i.test(xml))throw new Error('NEWS_INVALID_FEED');
 const blocks=xml.match(/<item\b[^>]*>[\s\S]*?<\/item>|<entry\b[^>]*>[\s\S]*?<\/entry>/gi)||[];
 const tag=(b,k)=>b.match(new RegExp(`<${k}\\b[^>]*>([\\s\\S]*?)<\\/${k}>`,'i'))?.[1]||'';
 const rows=[];
 for(const block of blocks.slice(0,100)){
  const title=newsText(tag(block,'title')).slice(0,240);if(!title||(!source.institutional&&!ethNewsRelevant.test(title)))continue;
  const raw=newsText(tag(block,'link'))||block.match(/<link\b[^>]*href=["']([^"']+)["']/i)?.[1];
  let url;try{url=new URL(raw);if(url.protocol!=='https:'||url.hostname!==source.host||url.username||url.password||url.port)continue;url.hash='';for(const key of [...url.searchParams.keys()])if(key.startsWith('utm_'))url.searchParams.delete(key);}catch{continue;}
  const time=Date.parse(newsText(tag(block,'pubDate')||tag(block,'published')||tag(block,'updated')));
  if(!Number.isFinite(time)||time>now.getTime()||time<now.getTime()-30*86400000)continue;
  rows.push({title,url:url.href,source:source.name,institutional:!!source.institutional,publishedAt:new Date(time).toISOString(),observedAt:now.toISOString(),tone:headlineTone(title)});
 }
 return rows;
}
async function readNewsFeed(response){
 if(!response.ok)throw new Error('NEWS_HTTP');
 const reader=response.body?.getReader();if(!reader)throw new Error('NEWS_EMPTY');
 const chunks=[];let bytes=0;try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2000000)throw new Error('NEWS_TOO_LARGE');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
 const all=new Uint8Array(bytes);let i=0;for(const chunk of chunks){all.set(chunk,i);i+=chunk.length;}return new TextDecoder().decode(all);
}
export function createEthereumNewsService(fetcher=fetch,clock=()=>new Date()){
 let cached=null,inFlight=null;
 return async function(){
  const now=clock();if(cached&&now.getTime()-Date.parse(cached.fetchedAt)<600000)return cached;
  if(inFlight)return inFlight;
  inFlight=(async()=>{
   const results=await Promise.all(ETH_NEWS_SOURCES.map(async source=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);try{const response=await fetcher(source.url,{signal:controller.signal,redirect:'error',headers:{'User-Agent':'HEDA-Academic-Research/1.0','Accept':'application/rss+xml, application/atom+xml, application/xml'}});return {source:source.name,ok:true,items:parseEthereumNews(await readNewsFeed(response),source,now)};}catch{return {source:source.name,ok:false,items:[]};}finally{clearTimeout(timer);}}));
   const seen=new Set();const items=results.flatMap(r=>r.items).sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)).filter(item=>{const key=item.url;if(seen.has(key))return false;seen.add(key);return true;}).slice(0,12);
   const result={ok:true,newsVersion:1,fetchedAt:now.toISOString(),items,sources:results.map(({source,ok})=>({source,ok})),method:'headline-lexicon-en-v1',forecastUsesNews:false};
   // Do not retain a failed refresh as if it were current news.
   if(results.some(r=>r.ok))cached=result;
   return result;
  })();try{return await inFlight;}finally{inFlight=null;}
 };
}
