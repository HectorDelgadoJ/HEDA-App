export const PASSWORD_HELP = 'Usa de 12 a 128 caracteres, con mayúscula, minúscula, número y símbolo (por ejemplo !, @ o #).';
export function passwordAssessment(value) {
 const password = typeof value === 'string' ? value : '';
 const requirements = [
  {key:'length',label:'Entre 12 y 128 caracteres',met:password.length>=12&&password.length<=128},
  {key:'upper',label:'Una mayúscula (A–Z)',met:/[A-Z]/.test(password)},
  {key:'lower',label:'Una minúscula (a–z)',met:/[a-z]/.test(password)},
  {key:'number',label:'Un número (0–9)',met:/[0-9]/.test(password)},
  {key:'symbol',label:'Un símbolo, como !, @ o #',met:/[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,./`~]/.test(password)}
 ];
 const valid=requirements.every(r=>r.met);
 // Local guidance, not entropy, a breach lookup or a guarantee of security.
 const obvious=/(1234|abcd|qwerty|password|contrase[nñ]a|(.)\2{3})/i.test(password);
 const level=!password?0:!valid||obvious?1:password.length>=16&&new Set(password).size>=8?3:2;
 return {requirements,valid,level,label:['Sin escribir','Baja','Media','Alta'][level],warning:obvious?'Evita palabras muy comunes, secuencias y repeticiones fáciles de adivinar.':''};
}
export function newPasswordError(value) { return passwordAssessment(value).valid ? '' : PASSWORD_HELP; }
