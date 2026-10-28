import {contributionPatch,validateGoalDate} from '../utils/goalPlan';
export const GOAL_COLUMNS='id,user_id,name,target_amount,current_amount,target_date,status,created_at';
async function ownUser(client,ownerId){const {data:{user},error}=await client.auth.getUser();if(error||!user||user.id!==ownerId)throw new Error('Tu sesión cambió. Vuelve a abrir tus metas.');return user;}
export async function addGoalContribution(client,ownerId,goal,value){
 const patch=contributionPatch(goal,value);await ownUser(client,ownerId);
 const {data,error}=await client.from('goals').update({...patch,updated_at:new Date().toISOString()}).eq('id',goal.id).eq('user_id',ownerId).eq('status','active').eq('current_amount',goal.current_amount).eq('target_amount',goal.target_amount).select(GOAL_COLUMNS).single();
 if(error||!data||data.id!==goal.id||data.user_id!==ownerId)throw new Error('No se pudo comprobar el ahorro. El avance pudo cambiar en otro dispositivo. Actualiza y revisa la cantidad acumulada antes de repetirlo.');
 return data;
}
export async function setGoalDeadline(client,ownerId,goal,value,today){
 const validation=validateGoalDate(value,today);if(validation)throw new Error(validation);await ownUser(client,ownerId);
 const {data,error}=await client.from('goals').update({target_date:value||null,updated_at:new Date().toISOString()}).eq('id',goal.id).eq('user_id',ownerId).eq('status','active').select(GOAL_COLUMNS).single();
 if(error||!data||data.id!==goal.id||data.user_id!==ownerId)throw new Error('No pudimos guardar la fecha. Actualiza tus metas e inténtalo de nuevo.');return data;
}
