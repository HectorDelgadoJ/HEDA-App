import {newPasswordError} from './passwordPolicy';
import {validateBirthDate} from './birthDate';
export function validateProfile(values) {
  const full_name = String(values.full_name || '').trim();
  const username = String(values.username || '').trim().replace(/^@/,'').toLowerCase();
  const occupation = String(values.occupation || '').trim();
  const errors = {};
  if (!full_name || full_name.length > 100) errors.full_name = 'Escribe tu nombre, de hasta 100 caracteres.';
  if (!/^[a-z0-9._]{3,30}$/.test(username)) errors.username = 'Usa de 3 a 30 letras, números, puntos o guiones bajos.';
  if (occupation.length > 100) errors.occupation = 'Usa hasta 100 caracteres para la ocupación.';
  const date=validateBirthDate(values.birth_date);
  if(date.error)errors.birth_date=date.error;
  return { errors, payload: { full_name, username: username || null, occupation: occupation || null, birth_date:date.birthDate } };
}
export function validatePassword(current, next, confirmation) {
  const errors = {};
  if (!current) errors.current = 'Escribe tu contraseña actual.';
  if (newPasswordError(next)) errors.next = newPasswordError(next);
  if (current && current === next) errors.next = 'Elige una contraseña diferente a la actual.';
  if (next !== confirmation) errors.confirmation = 'Las contraseñas nuevas no coinciden.';
  return errors;
}
export function profileInitials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'HE';
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
}
