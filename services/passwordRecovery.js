// Own-client flow: recovery sessions never enter the main app's auth store.
function fieldsError(fields){const error=new Error('Revisa los campos marcados.');error.fields=fields;return error;}
function cleanEmail(value){const email=String(value||'').trim().toLowerCase();if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw fieldsError({email:'Escribe un correo válido.'});return email;}
function failure(error,fallback){
 if(error?.status===429||['over_request_rate_limit','over_email_send_rate_limit'].includes(error?.code)){const result=new Error('Demasiados intentos. Espera un minuto antes de volver a probar.');result.retryAfter=60;return result;}
 if(error?.code==='captcha_failed')return new Error('Completa la verificación de seguridad otra vez.');
 return new Error(fallback);
}
export function validateRecoveredPassword(password,confirmation){
 const errors={};
 if(typeof password!=='string'||password.length<8||password.length>128||!password.trim())errors.password='Usa entre 8 y 128 caracteres.';
 if(password!==confirmation)errors.confirmation='Las contraseñas no coinciden.';
 return errors;
}
export function createPasswordRecovery(client){
 let verified=null,closed=false;
 const clearSession=async(scope='local')=>{try{const {error}=await client.auth.signOut({scope});return !error;}catch{return false;}};
 function assertOpen(){if(closed)throw new Error('Vuelve a abrir Recuperar contraseña.');}
 return {
  async request(value,{captchaToken}={}){
   assertOpen();const email=cleanEmail(value);verified=null;await clearSession();assertOpen();
   let result;try{result=await client.auth.resetPasswordForEmail(email,captchaToken?{captchaToken}:{});}catch{throw new Error('No pudimos solicitar el código. Revisa tu conexión e inténtalo de nuevo.');}
   if(result.error&&result.error.code!=='user_not_found')throw failure(result.error,'No pudimos solicitar el código. Revisa tu conexión e inténtalo de nuevo.');
   assertOpen();return email;
  },
  async verify(value,code){
   assertOpen();const email=cleanEmail(value),token=String(code||'').replace(/\s/g,'');verified=null;
   if(!/^\d{6,10}$/.test(token))throw fieldsError({code:'Escribe el código numérico de tu correo.'});
   let result;try{result=await client.auth.verifyOtp({email,token,type:'recovery'});}catch{throw new Error('No pudimos verificar el código. Revisa tu conexión.');}
   if(closed){await clearSession();assertOpen();}
   if(result.error||!result.data?.session||!result.data?.user?.id||result.data.user.email?.toLowerCase()!==email){await clearSession();throw failure(result.error,'El código no es válido o ya venció. Solicita uno nuevo.');}
   verified={id:result.data.user.id,email};return true;
  },
  async update(password,confirmation){
   assertOpen();const errors=validateRecoveredPassword(password,confirmation);if(Object.keys(errors).length)throw fieldsError(errors);
   if(!verified)throw new Error('Primero verifica el código de recuperación.');
   const owner=verified;
   let account;try{account=await client.auth.getUser();}catch{throw new Error('No pudimos comprobar la recuperación. Revisa tu conexión.');}
   assertOpen();
   if(account.error||account.data?.user?.id!==owner.id||account.data.user.email?.toLowerCase()!==owner.email){verified=null;throw new Error('La recuperación venció. Solicita otro código.');}
   let result;try{result=await client.auth.updateUser({password});}catch{throw new Error('No pudimos confirmar el cambio. Intenta iniciar sesión con la nueva contraseña antes de repetirlo.');}
   if(result.error){if(result.error.code==='same_password')throw fieldsError({password:'Elige una contraseña diferente a la anterior.'});if(result.error.code==='weak_password')throw fieldsError({password:'Elige una contraseña más segura; prueba una frase larga.'});throw failure(result.error,'No pudimos actualizar la contraseña. Vuelve a solicitar un código si la recuperación venció.');}
   if(result.data?.user?.id!==owner.id)throw new Error('No pudimos confirmar el cambio. Intenta iniciar sesión antes de repetirlo.');
   verified=null;const revoked=await clearSession('global');closed=true;
   return {warning:revoked?'':'La contraseña se actualizó, pero no pudimos confirmar el cierre de otras sesiones. Revisa tu conexión.'};
  },
  async close(){closed=true;verified=null;await clearSession();}
 };
}
