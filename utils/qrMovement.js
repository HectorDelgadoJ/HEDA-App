import {validateAppAction} from '../supabase/functions/heda-ai/actions';
export function encodeMovementQR(id,action){const clean=validateAppAction(action);if(clean.kind!=='movement'||clean.card_id)throw new Error('Comparte solo movimientos de Mi saldo.');return JSON.stringify({app:'HEDA',version:1,id,movement:clean});}
export function decodeMovementQR(text){
 if(typeof text!=='string'||text.length>1800)throw new Error('El código es demasiado largo o no es compatible con HEDA.');
 let data;try{data=JSON.parse(text);}catch{throw new Error('Este QR no es un movimiento de HEDA. No se abrirán enlaces externos.');}
 if(data?.app==='HEDA'&&data.version===2&&typeof data.id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id)&&Object.keys(data).every(k=>['app','version','id'].includes(k)))return {id:data.id,verifiedRequest:true};
 if(data?.app!=='HEDA'||data.version!==1||typeof data.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id)||Object.keys(data).some(k=>!['app','version','id','movement'].includes(k)))throw new Error('El QR no corresponde al formato de movimientos de HEDA.');
 let action;try{action=validateAppAction(data.movement);}catch{throw new Error('El QR contiene datos inválidos. No se guardó nada.');}
 if(action.kind!=='movement'||action.card_id)throw new Error('El QR solo puede contener un movimiento de Mi saldo.');
 return {id:data.id,action};
}
