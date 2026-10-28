export const accountDeviceKeys=id=>[`heda:first-use:v1:${id}`,`heda:chats:v1:${id}`,`heda:education:v1:${id}`,`heda:alerts:read:v1:${id}`,`heda:movement-categories:${id}`,`heda:phone-reminders:v1:${id}`,`heda:noticed:v1:${id}`];
export async function invokeAccountDeletion(client,ownerId,body,{timeoutMs=45000}={}){
 const {data:{session},error}=await client.auth.getSession();
 if(error||!session||session.user.id!==ownerId)throw new Error('Tu sesión cambió. Vuelve a abrir Perfil.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 let response;
 try{response=await client.functions.invoke('delete-account',{body,headers:{Authorization:`Bearer ${session.access_token}`},signal:controller.signal});}catch{throw new Error('No pudimos confirmar la operación. Revisa tu cuenta antes de volver a intentar.');}finally{clearTimeout(timer);}
 if(controller.signal.aborted)throw new Error('La solicitud tardó demasiado. Comprueba si tu cuenta sigue activa antes de repetirla.');
 if(response.error){let backend;try{backend=await response.error.context?.clone().json();}catch{}
  const status=response.error.context?.status;
  const failure=new Error(status===404?'Falta desplegar delete-account en Supabase.':status===401?'Tu sesión venció. Vuelve a entrar.':backend?.message||'No pudimos confirmar la operación. Revisa tu cuenta antes de volver a intentar.');failure.code=backend?.error;failure.retryAfter=status===429?60:undefined;throw failure;
 }
 if(!response.data?.ok||(body.action==='delete'&&response.data.deleted!==true)||(body.action==='send_code'&&response.data.sent!==true))throw new Error('No pudimos confirmar la operación. Revisa tu cuenta antes de volver a intentar.');
 return response.data;
}
export async function finishDeletedAccount(client,ownerId,{storage,cancelReminders}){
 const warnings=[];
 try{const {data:{session}}=await client.auth.getSession();if(session?.user?.id===ownerId){const {error}=await client.auth.signOut({scope:'local'});if(error)warnings.push('Vuelve a iniciar la app si aún aparece tu sesión.');}}catch{warnings.push('Vuelve a iniciar la app si aún aparece tu sesión.');}
 // Only this device and this account's optional cache keys. Never clear another user's storage.
 try{await storage.multiRemove(accountDeviceKeys(ownerId));}catch{warnings.push('No se pudo limpiar todo el almacenamiento local.');}
 try{await cancelReminders(ownerId);}catch{warnings.push('Revisa los avisos pendientes del teléfono.');}
 return warnings;
}
