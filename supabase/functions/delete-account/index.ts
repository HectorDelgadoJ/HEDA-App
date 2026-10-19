import { withSupabase } from "npm:@supabase/server@1";
import { createClient } from "npm:@supabase/supabase-js@2.112.2";
import { handleDeleteAccount, readDeleteBody } from "./handler.js";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS"};
const json=(status:number,body:unknown)=>Response.json(body,{status,headers:{...cors,'Cache-Control':'no-store'}});
const authenticated=withSupabase({auth:'user'},async(req,ctx)=>{
 try{
  const body=await readDeleteBody(req);
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_ANON_KEY'),adminKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!key||!adminKey)return json(503,{ok:false,error:'NOT_CONFIGURED',message:'La eliminación todavía no está configurada.'});
  const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
  const proof=createClient(url,key,options),admin=createClient(url,adminKey,options);
  const result=await handleDeleteAccount(body,{
   getUser:()=>ctx.supabase.auth.getUser(),
   sendCode:(email:string,captchaToken?:string)=>proof.auth.signInWithOtp({email,options:{shouldCreateUser:false,...(captchaToken?{captchaToken}:{})}}),
   verifyCode:(email:string,token:string)=>proof.auth.verifyOtp({email,token,type:'email'}),
   deleteUser:(id:string,soft:boolean)=>admin.auth.admin.deleteUser(id,soft),
   closeProof:()=>proof.auth.signOut({scope:'local'}),
  });
  return json(result.status,result.body);
 }catch(error){const status=(error as {status?:number})?.status;return json(status||500,{ok:false,error:'DELETE_REQUEST_FAILED',message:status?'Revisa la solicitud e inténtalo de nuevo.':'No pudimos confirmar la operación. Revisa tu cuenta antes de volver a intentar.'});}
});
export default {fetch:(req:Request)=>req.method==='OPTIONS'?new Response(null,{headers:cors}):req.method==='POST'?authenticated(req):json(405,{ok:false,error:'METHOD_NOT_ALLOWED',message:'Método no permitido.'})};
