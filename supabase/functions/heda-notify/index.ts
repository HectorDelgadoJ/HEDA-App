import {createEthereumService} from '../ethereum-forecast/inference.js';
import marketBundle from '../ethereum-forecast/models.json' with {type:'json'};
import {withSupabase} from "npm:@supabase/server@1.9.2";
import {createClient} from "npm:@supabase/supabase-js@2.118.0";
import webpush from "npm:web-push@3.6.7";
import {financialAlerts} from './alerts.js';
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const reply=(status:number,data:unknown)=>Response.json(data,{status,headers:cors});
const getMarket=createEthereumService(marketBundle);
const publicKey=Deno.env.get('HEDA_VAPID_PUBLIC_KEY'),privateKey=Deno.env.get('HEDA_VAPID_PRIVATE_KEY');
const subject=Deno.env.get('HEDA_VAPID_SUBJECT');
const authenticated=withSupabase({auth:'user'},async(req,ctx)=>{const active=await ctx.supabase.rpc('heda_account_active');if(active.error||!active.data)return reply(403,{ok:false});let body;try{body=await req.json();}catch{return reply(400,{ok:false});}if(!body||typeof body!=='object'||Array.isArray(body))return reply(400,{ok:false});if(body.action==='config')return reply(200,{ok:true,configured:!!publicKey&&!!privateKey&&!!subject,publicKey:publicKey||null});return reply(400,{ok:false});});
async function runWorker(){
 if(!publicKey||!privateKey||!subject)return reply(503,{ok:false,message:'Falta configurar VAPID.'});
 const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 webpush.setVapidDetails(subject,publicKey,privateKey);
 const {data:subs,error}=await client.from('heda_web_push').select('user_id').limit(501);if(error||subs.length>500)return reply(503,{ok:false,message:'Revisar suscripciones o paginación del piloto.'});
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),day=['year','month','day'].map(k=>parts.find(p=>p.type===k)!.value).join('-'),now=new Date(day+'T12:00:00Z');let generationErrors=0;
 async function rows(table:string,owner:string){let all=[];for(let i=0;i<20000;i+=1000){const r=await client.from(table).select('*').eq('user_id',owner).order('id').range(i,i+999);if(r.error)throw Error('LOAD_FAILED');all.push(...r.data);if(r.data.length<1000)return all;}throw Error('COVERAGE_LIMIT');}
 for(const owner of new Set(subs.map(s=>s.user_id))){try{const state=await client.from('heda_account_state').select('enabled').eq('user_id',owner).maybeSingle();if(state.error||state.data?.enabled===false)continue;const [transactions,budgets,rules,cards,goals]=await Promise.all(['transactions','budgets','recurring_movements','card_payments','goals'].map(t=>rows(t,owner)));const preference=await client.from('heda_alert_preferences').select('ethereum').eq('user_id',owner).maybeSingle();const ethereum=preference.data?.ethereum?await getMarket():null;const alerts=financialAlerts({rows:transactions,budgets,rules,cards,goals,ethereum},now);if(alerts.length){const stored=await client.from('heda_notifications').upsert(alerts.slice(0,100).map(a=>({user_id:owner,id:a.id,kind:a.type,title:a.title,body:a.message,route:a.route})),{onConflict:'user_id,id',ignoreDuplicates:true});if(stored.error)throw Error('STORE_FAILED');}}catch{generationErrors++;}}
 const jobs=await client.rpc('heda_claim_push');if(jobs.error)return reply(503,{ok:false,message:'Falta SQL 014.'});let accepted=0,failed=0;
 await Promise.all(jobs.data.map(async(job)=>{const targets=await client.from('heda_web_push').select('*').eq('user_id',job.user_id);let delivered=false;await Promise.all((targets.data||[]).map(async(sub)=>{try{await webpush.sendNotification({endpoint:sub.endpoint,keys:sub.keys},JSON.stringify({title:'HEDA · Revisa tus avisos',body:'Hay una actualización de tus registros. Abre HEDA para revisarla.'}),{TTL:3600,timeout:4000});delivered=true;}catch(e){const status=(e as {statusCode?:number})?.statusCode;if(status===404||status===410)await client.from('heda_web_push').delete().eq('id',sub.id);}}));
 if(delivered){const saved=await client.from('heda_notifications').update({notified_at:new Date().toISOString()}).eq('user_id',job.user_id).eq('id',job.id);if(saved.error)failed++;else accepted++;}else failed++;}));
 return reply(200,{ok:true,accepted,failed,generationErrors});
}
export default {fetch:async(req:Request)=>{if(req.method==='OPTIONS')return new Response(null,{headers:cors});if(req.method!=='POST')return reply(405,{ok:false});const worker=Deno.env.get('HEDA_NOTIFICATION_WORKER_KEY');if(worker&&worker.length>=32&&req.headers.get('x-heda-worker')===worker){try{return await runWorker();}catch{return reply(503,{ok:false,message:'No se completó el procesamiento de avisos.'});}}return authenticated(req);}};
