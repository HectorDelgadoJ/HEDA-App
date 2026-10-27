import {supabase} from './supabase';
let cached=null;
export async function getEthereumForecast({signal,force=false}={}) {
 const {data:{session}}=await supabase.auth.getSession();
 if(!session){cached=null;throw new Error('Inicia sesión para consultar Ethereum.');}
 if(signal?.aborted)throw new Error('Consulta cancelada.');
 if(!force&&cached?.owner===session.user.id&&Date.now()-cached.time<300000)return cached.data;
 const controller=new AbortController(),abort=()=>controller.abort();
 if(signal?.aborted)controller.abort();else signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(abort,18000);
 try{
  const {data,error}=await supabase.functions.invoke('ethereum-forecast',{body:{},signal:controller.signal});
  if(error){if(error.context?.status===404)throw new Error('Falta publicar ethereum-forecast en Supabase.');if(error.context?.status===403)throw new Error('Cuenta no disponible o falta aplicar SQL 013.');if(error.context?.status===401)throw new Error('Tu sesión venció. Vuelve a iniciar sesión.');throw new Error('No pudimos consultar Ethereum. Revisa tu conexión y reintenta.');}
  if(data?.ethereumVersion!==1||!data.ok||!Array.isArray(data.history)||data.history.length<2||!Array.isArray(data.forecasts)||data.forecasts.length!==2||!data.model?.reports)throw new Error('La respuesta de Ethereum no es válida.');
  const {data:{session:current}}=await supabase.auth.getSession();if(current?.user?.id!==session.user.id)throw new Error('Tu sesión cambió. Abre nuevamente Ethereum.');
  cached={owner:session.user.id,time:Date.now(),data};return data;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}

let newsCache=null;
export async function getEthereumNews({signal,force=false}={}){
 const {data:{session}}=await supabase.auth.getSession();if(!session){newsCache=null;throw new Error('Inicia sesión para consultar noticias.');}
 if(signal?.aborted)throw new Error('Consulta cancelada.');
 if(!force&&newsCache?.owner===session.user.id&&Date.now()-newsCache.time<600000)return newsCache.data;
 const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,12000);
 try{const {data,error}=await supabase.functions.invoke('ethereum-forecast',{body:{action:'news'},signal:controller.signal});
 if(error)throw new Error('No pudimos consultar noticias. Puedes reintentar.');
 if(data?.newsVersion!==1||!data.ok||!Array.isArray(data.items)||data.forecastUsesNews!==false)throw new Error('La sección de noticias todavía no está disponible.');
 const {data:{session:current}}=await supabase.auth.getSession();if(current?.user?.id!==session.user.id)throw new Error('Tu sesión cambió.');
 const hosts=['blog.ethereum.org','www.coindesk.com','cointelegraph.com'];
 const items=data.items.slice(0,12).filter(item=>{try{const url=new URL(item.url);return url.protocol==='https:'&&hosts.includes(url.hostname)&&!url.username&&!url.password&&!url.port&&typeof item.title==='string'&&Number.isFinite(Date.parse(item.publishedAt));}catch{return false;}});
 const safe={...data,items};if(data.sources?.some(s=>s.ok))newsCache={owner:session.user.id,time:Date.now(),data:safe};return safe;
 }catch(error){if(controller.signal.aborted)throw new Error('La consulta de noticias tardó demasiado. Intenta de nuevo.');throw error;}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
