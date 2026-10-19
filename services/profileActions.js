// The caller supplies the authenticated client; no admin credentials or cross-account updates.
export async function saveOwnProfile(client, ownerId, payload) {
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user || user.id !== ownerId) throw new Error('Tu sesión cambió. Vuelve a abrir Perfil.');
  const allowed = { full_name: payload.full_name, username: payload.username, occupation: payload.occupation, birth_date:payload.birth_date };
  const result = await client.from('profiles').update(allowed).eq('id', user.id).select('full_name,username,occupation,birth_date').single();
  if (result.error || !result.data) throw new Error(result.error?.code === '23505' ? 'Ese nombre de usuario no está disponible.' : 'No se guardó el perfil. Revisa tu conexión e inténtalo de nuevo.');
  return result.data;
}
export async function changeOwnPassword(client, ownerId, currentPassword, newPassword, {captchaToken} = {}) {
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user?.email || user.id !== ownerId) throw new Error('Tu sesión cambió. Vuelve a iniciar sesión.');
  const verified = await client.auth.signInWithPassword({ email: user.email, password: currentPassword, ...(captchaToken ? { options: { captchaToken } } : {}) });
  if (verified.error || verified.data?.user?.id !== ownerId) throw new Error('No pudimos verificar tu contraseña actual. Revísala e inténtalo de nuevo.');
  const result = await client.auth.updateUser({ password: newPassword, current_password: currentPassword, ...(captchaToken ? { options: { captchaToken } } : {}) });
  if (result.error || result.data?.user?.id !== ownerId) throw new Error('No pudimos cambiar la contraseña. Revisa la conexión y los requisitos de seguridad de tu cuenta; vuelve a iniciar sesión si es necesario.');
}
