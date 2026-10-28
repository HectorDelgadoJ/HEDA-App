import {newPasswordError} from './passwordPolicy';
import { validateBirthDate } from './birthDate';
import { experienceDefaults } from './experience';
export function validateLogin(email, password) {
  const cleanEmail=String(email||'').trim().toLowerCase(), errors={};
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length>254)errors.email='Escribe un correo válido, como nombre@correo.com.';
  if(!password)errors.password='Escribe tu contraseña.';
  return {errors,email:cleanEmail};
}
export function validateRegistration(values) {
  const {errors,email}=validateLogin(values.email,values.password);
  const fullName=String(values.fullName||'').trim(),username=String(values.username||'').trim().replace(/^@/,'').toLowerCase();
  const {birthDate,age,error:dateError}=validateBirthDate(values.birthDate);
  if(dateError)errors.birthDate=dateError;
  if(!fullName || fullName.length>100)errors.fullName='Escribe tu nombre, de hasta 100 caracteres.';
  if(!/^[a-z0-9._]{3,30}$/.test(username))errors.username='Usa de 3 a 30 letras, números, puntos o guiones bajos.';
  if(newPasswordError(values.password))errors.password=newPasswordError(values.password);
  if(values.password!==values.confirmPassword)errors.confirmPassword='Las contraseñas no coinciden.';
  return {errors,email,fullName,username,age,birthDate};
}
export function signupPreferences(mode='simple',priority='expenses') {
  return {...experienceDefaults(mode,priority),configured:false};
}
export function authErrorMessage(error, action='login') {
  const code=error?.code;
  if(code==='invalid_credentials')return 'El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.';
  if(code==='email_not_confirmed')return 'Este correo todavía necesita confirmación. Revisa el mensaje de Supabase antes de entrar.';
  if(['user_already_exists','email_exists'].includes(code))return 'Ya existe una cuenta con ese correo. Vuelve a Iniciar sesión.';
  if(code==='captcha_failed')return 'Completa la verificación de seguridad y vuelve a intentarlo.';
  if(code==='weak_password')return 'Elige una contraseña más segura; prueba una frase larga con letras y números.';
  if(['email_address_invalid','validation_failed'].includes(code))return 'Revisa el correo y los datos que escribiste.';
  if(['over_request_rate_limit','over_email_send_rate_limit'].includes(code)||error?.status===429)return 'Se hicieron demasiados intentos. Espera unos minutos antes de volver a probar.';
  if(code==='signup_disabled')return 'La creación de cuentas está temporalmente desactivada.';
  if(code==='user_banned')return 'No puedes acceder con esta cuenta. Contacta al responsable de HEDA.';
  return action==='register'?'No pudimos crear la cuenta. Revisa tu conexión e inténtalo de nuevo.':'No pudimos iniciar sesión. Revisa tu conexión e inténtalo de nuevo.';
}
