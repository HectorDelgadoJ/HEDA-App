import {validateAppAction} from '../supabase/functions/heda-ai/actions';
export async function applyOwnAction(client,ownerId,requestId,input){
 const action=validateAppAction(input);if(!/^[0-9a-f-]{36}$/i.test(requestId))throw new Error('Propuesta no válida. Solicítala otra vez.');
 const {data,error}=await client.auth.getUser();if(error||!ownerId||data?.user?.id!==ownerId)throw new Error('Tu sesión cambió. Vuelve a abrir esta pantalla.');
 const result=await client.rpc('heda_apply_own_action',{p_request_id:requestId,p_action:action});
 if(result.error)throw new Error(result.error.code==='23505'?'Ya hay un presupuesto para esa categoría. Modifícalo desde Presupuestos.':result.error.code==='42501'?'La cuenta o tarjeta no está disponible. Revisa la propuesta.':'No pudimos confirmar el guardado. Puedes reintentar esta misma propuesta sin duplicarla. Revisa tu conexión y que esté aplicado el SQL 012.');
 if(result.data?.ok!==true||typeof result.data.id!=='string')throw new Error('No pudimos comprobar el guardado. Reintenta esta misma propuesta.');
 return result.data;
}
