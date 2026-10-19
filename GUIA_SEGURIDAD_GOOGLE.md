# Google y protección de HEDA

Estado: código implementado y probado localmente. El usuario configura y publica los servicios remotos; las herramientas no crearon credenciales ni modificaron Supabase/Google. Google y CAPTCHA necesitan configuración antes de funcionar. No es una certificación de seguridad ni garantiza ausencia de ataques.

## 1. Publicar los límites de IA

En PowerShell desde la raíz de HEDA-App:

```powershell
Get-Content -Raw -Encoding utf8 .\supabase\migrations\202610170008_ai_usage_limits.sql | Set-Clipboard
```

Pegar en **Supabase → SQL Editor → New query → Run**, después de las migraciones 001–007. Crea contadores privados y una función limitada al usuario autenticado; no cambia movimientos ni perfiles. Se puede ejecutar otra vez.

Después:

```powershell
Get-Content -Raw -Encoding utf8 .\supabase\heda-ai-dashboard.ts | Set-Clipboard
```

Pegar en **Edge Functions → heda-ai → Code → index.ts**, reemplazar el archivo completo y pulsar **Deploy**. Este segundo archivo es TypeScript, NO se pega en SQL Editor. Conservar los Secrets actuales.

La función nueva deja de responder si falta la función SQL de límites; no permite saltarse la protección como alternativa. Orden: SQL primero, función después.

Límites fijos en el SQL, no controlables desde el móvil:

| Operación | Por usuario/minuto | Por usuario/día UTC | Proyecto/día UTC |
| --- | --- | --- | --- |
| Consultar Gemini | 5 | 60 | 300 |
| Preparar resumen sin Gemini | 20 | 120 | 1000 |

Se cuentan intentos autorizados, aunque el proveedor falle después. Los contadores son persistentes, con bloqueo atómico y sin permisos directos de lectura/escritura para usuarios. La reserva usa auth.uid(), nunca un identificador enviado por el móvil. El tope compartido reduce consumo por cuentas múltiples; no es un presupuesto monetario garantizado. Mantener controles y alertas de consumo también en Google. El servidor limita el cuerpo JSON a 64 KiB; siguen vigentes los límites de preguntas/historial y el consentimiento de resumen.

## 2. Activar Google en Supabase

1. En Google Cloud / Google Auth Platform, elegir un proyecto propio y configurar Branding y Audience. Si es de pruebas, añadir los correos de los participantes como test users.
2. Pedir solo los scopes **openid, email, profile**. No pedir Gmail, contactos, Drive ni datos bancarios.
3. Crear **OAuth client → Web application** para el flujo que usa Supabase como intermediario.
4. Abrir **Supabase → Authentication → Sign In / Providers → Google** y copiar la URL callback que muestra Supabase.
5. En Google, pegar esa URL exacta en **Authorized redirect URIs**. Es la URL HTTPS de Supabase que termina en `/auth/v1/callback`, no `heda://...`.
6. Copiar el Client ID y Client Secret de Google únicamente en el proveedor Google de Supabase, habilitarlo y guardar. No van en la app, Git ni variables EXPO_PUBLIC.
7. En **Supabase → Authentication → URL Configuration → Redirect URLs**, añadir **heda://auth/callback**. Para la versión web añadir su URL HTTPS raíz exacta cuando exista, por ejemplo `https://tu-heda.example/`; configurar también el Site URL real. Evitar comodines amplios en producción.

La app conecta expo-crypto al API requerido por el SDK en nativo para disponer de azar seguro y SHA-256, sin fallback de Google a PKCE plain. Abre el navegador del sistema con OAuth PKCE S256 y solo intercambia un código de un uso. Valida que el regreso coincida con el esquema, host y ruta previstos; no acepta tokens desde fragmentos ni callbacks de dominios distintos. Se usa el flujo habitual de Supabase para identidades: no se fusionan cuentas manualmente por un correo escrito en un formulario. Revisar con cuentas de prueba los casos de correo ya existente.

### Importante para Expo Go e iPhone

**Google OAuth con esquema propio no se prueba en Expo Go.** La app lo indica y mantiene correo/contraseña disponible. La configuración `scheme: heda` requiere construir/instalar una versión nativa propia; reiniciar Metro no agrega el esquema a Expo Go. Una distribución iOS sigue sujeta a los requisitos de Apple. Para el usuario sin cuenta de distribución de Apple, la futura versión web sigue siendo el camino para compartir por enlace; esa versión completa aún requiere adaptación y pruebas aparte.

No se ha hecho un inicio real con Google desde las herramientas: todavía faltan credenciales remotas y una app instalada/web. El primer acceso Google usa el onboarding existente para elegir vista/prioridad. Las cuentas con acceso únicamente por Google administran su contraseña en Google; Perfil no ofrece cambiar una contraseña local inexistente.

## 3. Confirmación de correo y acceso

Para uso público: en **Authentication → Sign In / Providers → Email**, activar **Confirm email** y guardar. La app ya maneja el caso con/sin sesión. El archivo local ahora usa `enable_confirmations=true` y contraseña mínima de ocho caracteres; **esto no cambia el proyecto remoto**. Revisar allí también el mínimo de contraseña y los límites de Auth en Rate Limits / Attack Protection.

Los accesos existentes con contraseña antigua no se bloquean por validación del login. Para usuarios registrados cuando Confirm email estaba apagado, no se demuestra retroactivamente propiedad del correo; revisar la estrategia de migración antes de abrir al público. No ejecutar un SQL masivo sobre auth.users.

Activar doble factor en las cuentas administrativas de Supabase, Google y GitHub. La app no puede hacerlo por el propietario desde código. No usar la cuenta administrativa para las pruebas de usuarios.

## 4. Activar CAPTCHA para correo/contraseña

El soporte está integrado en registro, login y verificación de contraseña actual. **No queda activado hasta configurar el proveedor remoto y las dos variables públicas.** Nunca basta una comprobación del botón en el cliente.

1. Crear un widget **Cloudflare Turnstile**, con el hostname real donde estará la página de verificación, y obtener Site key y Secret key.
2. Publicar **solo la carpeta `security/captcha`** como un sitio estático HTTPS en el alojamiento elegido. Sus archivos no contienen secretos. Se puede alojar bajo el mismo dominio de la futura web. Si se usa un dominio diferente, registrarlo en el widget.
3. Añadir a `.env.local` del proyecto, sin quitar las variables existentes:

```dotenv
EXPO_PUBLIC_CAPTCHA_URL=https://tu-dominio-de-verificacion.example/
EXPO_PUBLIC_CAPTCHA_SITE_KEY=tu_site_key_publica
```

4. Reiniciar Expo (y reconstruir si usas un bundle instalado con variables incorporadas). Comprobar que el widget carga y produce una verificación.
5. En **Supabase → Authentication → Attack Protection / Bot and Abuse Protection**, activar CAPTCHA, elegir **Turnstile**, introducir la **Secret key** y guardar. La clave privada va solo aquí.
6. Probar registro/login/cambio de contraseña con cuentas de prueba. Supabase debe rechazar solicitudes sin token o con token inválido, incluso si se hacen fuera de la app. No habilitar el CAPTCHA remoto antes de tener el widget operativo, porque se bloquearía el acceso por contraseña.

En nativo el widget vive en una página HTTPS aislada en WebView; en web usa iframe. El cliente valida origen/ventana y un nonce, renueva tokens tras intentos y no los guarda en metadata. El servidor Supabase es quien valida realmente el desafío. No usar claves de prueba para producción.

## 5. Sesiones y datos

En iOS/Android, sesiones y verificadores PKCE se guardan en SecureStore, no como nuevas copias en AsyncStorage. Se dividen en fragmentos pequeños para admitir tokens/metadatos grandes, con generaciones atómicas y escrituras serializadas. La sesión antigua se migra y se elimina de AsyncStorage tras guardarse de forma protegida. Si falla SecureStore, no se vuelve a almacenar en texto plano. No se implementó bloqueo biométrico.

Esta protección es del almacenamiento nativo, no del navegador: la sesión web depende del almacenamiento del navegador y exige HTTPS y prevención de XSS. SecureStore tampoco protege un dispositivo comprometido ni equivale a cifrar toda la base de datos. Algunos datos no sensibles de preferencias/avance/lectura siguen en AsyncStorage. Se eliminaron los logs de aplicación de pantallas/servicios; los proveedores pueden mantener sus propios registros según configuración.

## 6. Verificar el proyecto remoto

```powershell
Get-Content -Raw -Encoding utf8 .\supabase\security_audit.sql | Set-Clipboard
```

Este archivo SÍ es SQL, de solo lectura. Pegar en SQL Editor. La primera consulta debe devolver cero tablas sin RLS o faltantes, y la de grants de contadores debe devolver cero filas. Revisar políticas para que usen `auth.uid()` y la columna propietaria. Los RPC indicados no deben permitir llamadas anónimas. La auditoría enumera políticas pero no prueba por sí sola todas sus combinaciones; completar con dos cuentas de prueba en el proyecto remoto. Nunca desactivar RLS para resolver un error del cliente.

## 7. Dependencias y validación

Se mantienen versiones exactas compatibles con Expo 57 y package-lock. Se añadieron expo-auth-session, expo-web-browser, expo-secure-store, expo-crypto y expo-constants. Ejecutar `npm ci` en otra computadora; una app instalada requiere reconstrucción para los módulos y esquema nuevos.

**Pendiente material:** npm audit reportó 26 paquetes afectados (18 high, 8 moderate), con cadenas que incluyen herramientas de Expo/Metro y uuid antiguo. En la revisión del registro no había versiones corregidas de braces (3.0.3), node-forge (1.4.0), @expo/ngrok (4.1.3) o xcode (3.0.1). Las propuestas de audit --force degradaban Expo/React Native a versiones incompatibles. No se aplicaron ni se presentan las alertas como resueltas. Revisar de nuevo los avisos y parches antes de una publicación pública; no exponer Metro/túneles como alojamiento de producción.

Pruebas: almacenamiento grande/Unicode, migración y fallo sin fallback, refresh/logout concurrentes; callback OAuth inválido/cancelado y deduplicación; CAPTCHA enviado fuera de metadata; cuotas por usuario/minuto/día y compartidas; revocación de acceso directo a contadores; RLS de todas las tablas con dos usuarios. Son pruebas locales con PostgreSQL temporal o adaptadores simulados. No sustituyen revisión externa ni validación remota de Google/CAPTCHA.

Fuentes oficiales:
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/auth-captcha
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://docs.expo.dev/guides/authentication/
- https://docs.expo.dev/versions/latest/sdk/securestore/
