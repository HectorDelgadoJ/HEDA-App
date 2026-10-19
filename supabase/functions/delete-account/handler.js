export async function readDeleteBody(req){
 if(req.headers.get('content-type')?.toLowerCase().split(';')[0].trim()!=='application/json')throw {status:415,message:'Se requiere JSON.'};
 const reader=req.body?.getReader();if(!reader)throw {status:400,message:'Falta la solicitud.'};
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();throw {status:413,message:'Solicitud demasiado grande.'};}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
 let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{throw {status:400,message:'Solicitud inválida.'};}
 if(!body||Array.isArray(body)||typeof body!=='object')throw {status:400,message:'Solicitud inválida.'};
 return body;
}
export async function handleDeleteAccount(body,api){
 const reply=(status,error,message)=>({status,body:{ok:false,error,message}});
 const {data,error}=await api.getUser();const user=data?.user;
 if(error||!user?.id||!user.email)return reply(401,'AUTH_REQUIRED','Tu sesión venció. Vuelve a iniciar sesión.');
 if(Object.keys(body).some(key=>!['action','confirmation','code','captchaToken'].includes(key)))return reply(400,'INVALID_REQUEST','Solicitud inválida.');
 if(body.action==='send_code'){
  if(body.captchaToken!==undefined&&(typeof body.captchaToken!=='string'||body.captchaToken.length>4096))return reply(400,'INVALID_REQUEST','Verificación inválida.');
  const {error}=await api.sendCode(user.email,body.captchaToken);
  if(error)return reply(error.status===429?429:400,'CODE_SEND_FAILED',error.status===429?'Espera un minuto antes de pedir otro código.':'No pudimos enviar el código. Revisa la verificación de seguridad y vuelve a intentar.');
  return {status:200,body:{ok:true,sent:true}};
 }
 if(body.action!=='delete'||body.confirmation!=='ELIMINAR')return reply(400,'CONFIRMATION_REQUIRED','Escribe ELIMINAR para confirmar.');
 const code=typeof body.code==='string'?body.code.replace(/\s/g,''):'';
 if(!/^\d{6,10}$/.test(code))return reply(400,'CODE_REQUIRED','Escribe el código que recibiste por correo.');
 try{
  const proof=await api.verifyCode(user.email,code);
  if(proof.error||!proof.data?.session||proof.data.user?.id!==user.id||proof.data.user.email?.toLowerCase()!==user.email.toLowerCase())return reply(proof.error?.status===429?429:400,'CODE_INVALID','El código no es válido o venció. Solicita otro.');
  // Only the server-verified caller can be deleted. Never accept a target ID from the body.
  const {error}=await api.deleteUser(user.id,false);
  if(error)return reply(409,'DELETE_FAILED','No pudimos eliminar la cuenta. No se confirmó el borrado. Solicita otro código y reintenta; si continúa, contacta al responsable de HEDA.');
  return {status:200,body:{ok:true,deleted:true}};
 }finally{await api.closeProof().catch(()=>{});}
}
