export async function confirmRecurring(client, ownerId, rule) {
 const {data:{user},error:authError}=await client.auth.getUser();
 if(authError||!user||user.id!==ownerId)throw new Error('Tu sesión cambió. Vuelve a abrir tus recurrentes.');
 // The RPC reads card_id from the owned rule. Its signature has only these two arguments.
 const {data,error}=await client.rpc('heda_confirm_recurring',{p_id:rule.id,p_date:rule.next_date});
 if(error){
  if(error.code==='42501')throw new Error('No tienes permiso para confirmar este registro. Vuelve a iniciar sesión.');
  if(error.code==='P0001'&&/fecha cambió|no vence|pausada/i.test(error.message||''))throw new Error('La fecha o el estado del recurrente cambió. Actualiza la lista antes de confirmar.');
  throw new Error('No pudimos comprobar la confirmación. Actualiza la lista y revisa el historial antes de reintentar.');
 }
 if(typeof data!=='string'||!data)throw new Error('No se recibió la confirmación del registro. Revisa el historial antes de reintentar.');
 return data;
}
