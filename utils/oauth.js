export function oauthCode(url,redirectUri){
  let actual,expected;try{actual=new URL(url);expected=new URL(redirectUri);}catch{throw new Error('No pudimos validar el regreso de Google. Inténtalo de nuevo.');}
  if(actual.protocol!==expected.protocol || actual.host!==expected.host || actual.pathname!==expected.pathname || actual.username || actual.password)throw new Error('El regreso de Google no coincide con HEDA.');
  if(actual.searchParams.has('error')||actual.hash.includes('error='))throw new Error('No se completó la autorización con Google. Puedes volver a intentarlo.');
  const codes=actual.searchParams.getAll('code');
  if(codes.length!==1 || !codes[0] || codes[0].length>2048 || actual.hash)throw new Error('No recibimos un código válido de Google. Inténtalo de nuevo.');
  return codes[0];
}

// Only fixed labels leave the auth boundary; provider descriptions can contain private data.
export function oauthFailureReason(error, url) {
  let params = new URLSearchParams(), hash = new URLSearchParams();
  try { const parsed = new URL(url); params = parsed.searchParams; hash = new URLSearchParams(parsed.hash.slice(1)); } catch {}
  const code = String(error?.code || params.get('error_code') || hash.get('error_code') || '');
  const detail = String(error?.message || params.get('error_description') || hash.get('error_description') || '').toLowerCase();
  if (code === 'unexpected_failure' && detail.includes('database') || detail.includes('database error')) return 'GOOGLE_DATABASE: Supabase no pudo crear o guardar el usuario. Revisa los registros de Authentication y el trigger de perfiles.';
  if (['bad_code_verifier', 'flow_state_not_found', 'flow_state_expired'].includes(code)) return 'GOOGLE_PKCE: El intento venció o no coincide con su verificación. Inicia un intento nuevo desde HEDA.';
  if (code === 'pkce_code_verifier_not_found' || detail.includes('code verifier') || detail.includes('code_verifier')) return 'GOOGLE_VERIFIER: No se encontró o no coincide la verificación guardada para este intento.';
  if (code === 'provider_email_needs_verification' || code === 'email_not_confirmed') return 'GOOGLE_EMAIL: Supabase requiere verificar el correo de la cuenta.';
  if (detail.includes('invalid_client') || detail.includes('client secret')) return 'GOOGLE_CLIENT: Revisa el Client ID y el Client Secret OAuth en Supabase.';
  if (code === 'identity_already_exists' || code === 'email_exists') return 'GOOGLE_ACCOUNT: Supabase no pudo vincular la identidad con la cuenta existente.';
  if (error?.name === 'AuthRetryableFetchError') return 'GOOGLE_NETWORK: No se pudo contactar con Supabase para crear la sesión.';
  if (error || params.has('error') || hash.has('error')) return 'GOOGLE_AUTH: Supabase rechazó el regreso de Google. Revisa Authentication → Logs para conocer el motivo.';
  if (params.has('code')) return 'GOOGLE_NO_SESSION: Llegó el código de regreso, pero no se pudo recuperar una sesión. Revisa Authentication → Logs.';
  return 'GOOGLE_NO_CALLBACK: No llegó una respuesta de autorización válida.';
}
