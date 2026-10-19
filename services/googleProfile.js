import {validateBirthDate} from '../utils/birthDate';
function fail(message,fields){const error=new Error(message);error.fields=fields;return error;}
export function needsGoogleProfile(user,profile){
 return !!user&&(!profile?.full_name?.trim()||!profile?.username||validateBirthDate(profile?.birth_date).error!==null);
}
export function validateGoogleProfile(values){
 const fullName=String(values.fullName||'').trim(),username=String(values.username||'').trim().replace(/^@/,'').toLowerCase(),errors={};
 const {birthDate,age,error:dateError}=validateBirthDate(values.birthDate);
 if(!fullName||fullName.length>100)errors.fullName='Escribe tu nombre, de hasta 100 caracteres.';
 if(!/^[a-z0-9._]{3,30}$/.test(username))errors.username='Usa de 3 a 30 letras, números, puntos o guiones bajos.';
 if(dateError)errors.birthDate=dateError;
 return {fullName,username,age,birthDate,errors};
}
export async function completeGoogleProfile(client,ownerId,values){
 const clean=validateGoogleProfile(values);
 if(Object.keys(clean.errors).length)throw fail('Revisa los campos marcados.',clean.errors);
 const {data,error}=await client.auth.getUser();
 if(error||data?.user?.id!==ownerId)throw fail('Tu sesión cambió. Vuelve a entrar.');
 const result=await client.rpc('heda_complete_own_birth_profile',{p_full_name:clean.fullName,p_username:clean.username,p_birth_date:clean.birthDate});
 if(result.error?.code==='23505')throw fail('Ese @usuario ya está ocupado.',{username:'Elige otro @usuario.'});
 if(result.error)throw fail('No pudimos guardar el perfil. Revisa tu conexión y que esté aplicado el SQL 011.');
 const profile=Array.isArray(result.data)?result.data[0]:result.data;
 if(profile?.id!==ownerId||needsGoogleProfile(data.user,profile))throw fail('No pudimos confirmar el perfil guardado. Inténtalo otra vez.');
 return profile;
}
