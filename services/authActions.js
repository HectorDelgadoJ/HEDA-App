import { authErrorMessage, signupPreferences, validateLogin, validateRegistration } from '../utils/auth';
function invalid(fields){const error=new Error('Revisa los campos marcados.');error.fields=fields;return error;}
export async function loginAccount(client,email,password,{captchaToken}={}){
  const clean=validateLogin(email,password);
  if(Object.keys(clean.errors).length)throw invalid(clean.errors);
  let result;
  try {result=await client.auth.signInWithPassword({email:clean.email,password,...(captchaToken?{options:{captchaToken}}:{})});}catch{throw new Error(authErrorMessage(null));}
  const {data,error}=result;
  if(error)throw new Error(authErrorMessage(error));
  if(!data?.session || !data?.user)throw new Error('No se pudo abrir la sesión. Inténtalo de nuevo.');
  return data;
}
export async function checkUsername(client,value){
  const username=String(value||'').trim().replace(/^@/,'').toLowerCase();
  const {data,error}=await client.rpc('heda_username_available',{p_username:username});
  if(error)throw new Error('No pudimos comprobar tu @usuario. Revisa la conexión y que esté aplicado el SQL de registro.');
  if(data!==true)throw invalid({username:'Ese @usuario ya está ocupado. Elige otro.'});
  return username;
}
export async function registerAccount(client,values,{mode='simple',priority='expenses',captchaToken}={}){
  const clean=validateRegistration(values);
  if(Object.keys(clean.errors).length)throw invalid(clean.errors);
  await checkUsername(client,clean.username);
  let result;
  try{result=await client.auth.signUp({email:clean.email,password:values.password,options:{...(captchaToken?{captchaToken}:{}),data:{full_name:clean.fullName,username:clean.username,birth_date:clean.birthDate,heda_experience:signupPreferences(mode,priority)}}});}catch{throw new Error(authErrorMessage(null,'register'));}
  const {data,error}=result;
  if(error){await checkUsername(client,clean.username);throw new Error(authErrorMessage(error,'register'));}
  if(!data?.user)throw new Error('No pudimos confirmar la creación de la cuenta. Intenta iniciar sesión antes de registrarte de nuevo.');
  // Confirmation may still be enabled remotely. Never fake a session or bypass Supabase.
  return {needsConfirmation:!data.session,email:clean.email};
}
