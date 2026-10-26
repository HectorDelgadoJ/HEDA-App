import {supabase} from './supabase';
export async function getEthereumForecast({signal}={}) {
 const {data:{session}}=await supabase.auth.getSession();
 if(!session)throw new Error('Inicia sesión para consultar Ethereum.');
 const controller=new AbortController(),abort=()=>controller.abort();
 if(signal?.aborted)controller.abort();else signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(abort,18000);
 try{
  const {data,error}=await supabase.functions.invoke('ethereum-forecast',{body:{},signal:controller.signal});
  if(error){if(error.context?.status===404)throw new Error('Falta publicar ethereum-forecast en Supabase.');if(error.context?.status===401)throw new Error('Tu sesión venció. Vuelve a iniciar sesión.');throw new Error('No pudimos consultar Ethereum. Revisa tu conexión y reintenta.');}
  if(data?.ethereumVersion!==1||!data.ok||!Array.isArray(data.history)||data.history.length<2||!Array.isArray(data.forecasts)||data.forecasts.length!==2||!data.model?.reports)throw new Error('La respuesta de Ethereum no es válida.');
  const {data:{session:current}}=await supabase.auth.getSession();if(current?.user?.id!==session.user.id)throw new Error('Tu sesión cambió. Abre nuevamente Ethereum.');
  return data;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
