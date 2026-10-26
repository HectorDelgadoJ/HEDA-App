import {withSupabase} from "npm:@supabase/server@1.9.2";
import bundle from "./models.json" with {type:"json"};
import {createEthereumService} from "./inference.js";
const getForecast=createEthereumService(bundle);
const ethCors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const ethJson=(status:number,body:unknown)=>Response.json(body,{status,headers:ethCors});
const ethAuthenticated=withSupabase({auth:"user"},async(_req,ctx)=>{
 const {data,error}=await ctx.supabase.auth.getUser();if(error||!data.user)return ethJson(401,{ok:false,message:'Inicia sesión para consultar Ethereum.'});
 const active=await ctx.supabase.rpc('heda_account_active');if(active.error||active.data!==true)return ethJson(403,{ok:false,message:'Cuenta no disponible o falta SQL 013.'});
 try{return ethJson(200,await getForecast());}catch{return ethJson(503,{ok:false,message:'No pudimos obtener datos válidos de Ethereum. Inténtalo más tarde.'});}
});
export default {fetch:(req:Request)=>req.method==='OPTIONS'?new Response(null,{headers:ethCors}):req.method!=='POST'?ethJson(405,{ok:false,message:'Método no permitido.'}):ethAuthenticated(req)};
