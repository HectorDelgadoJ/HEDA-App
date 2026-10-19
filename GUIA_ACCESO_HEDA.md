# Login y registro de HEDA

## Interfaz

Login y registro comparten banner azul, tarjeta de formulario, etiquetas visibles, áreas seguras, adaptación al teclado y ancho máximo para pantallas grandes. Las contraseñas tienen control Mostrar/Ocultar. Los errores se muestran en español junto al campo y se evita enviar dos veces.

El registro tiene dos pasos:

1. Nombre, correo, contraseña y repetición. Alias opcional detrás de Añadir nombre de usuario. Contraseñas nuevas de 8 a 128 caracteres; el login conserva acceso con contraseñas antiguas más cortas.
2. Personalización opcional: organizar gastos, recordar pagos o ahorrar; vista simple o completa. Omitir crea una cuenta con vista simple y prioridad de gastos.

La personalización se guarda en Auth user_metadata.heda_experience en la propia llamada signUp, marcada configured. No vuelve a aparecer el formulario inicial después del registro. Se puede cambiar desde Perfil. El trigger existente crea el perfil con nombre/alias; no se requiere SQL nuevo. Las contraseñas no se recortan ni se guardan en metadata. Se retiraron los logs que imprimían usuario, sesión y tokens en Login.

## Desactivar confirmación de correo (lo realiza el usuario)

En el proyecto remoto de Supabase:

1. Authentication → Sign In / Providers (o Providers según el panel).
2. Abrir Email.
3. Desactivar Confirm email y guardar.

No pegar código en SQL Editor ni modificar la Edge Function de IA. No se requieren Secrets. El archivo local supabase/config.toml ya tiene auth.email.enable_confirmations=false; eso no cambia el proyecto remoto.

Con confirmación desactivada, Supabase devuelve sesión al crear la cuenta y AppNavigator entra automáticamente. Mientras siga activada en el servidor, el cliente muestra una pantalla para revisar el correo; nunca simula una sesión ni intenta saltarse la validación. Desactivar esta opción significa que el correo proporcionado no se verifica como propiedad del usuario. No se modifican masivamente usuarios existentes desde la app.

Fuentes: https://supabase.com/docs/guides/auth/general-configuration y https://supabase.com/docs/reference/javascript/auth-signup

## Prueba en teléfono

- Cuenta nueva con vista simple y prioridad de ahorro: entra sin repetir preguntas y muestra la meta de ahorro.
- Otra cuenta con vista completa: conserva la elección al cerrar sesión y volver a entrar.
- Omitir personalización: abre Inicio con vista simple.
- Alias vacío: crea perfil sin exigir nombre de usuario.
- Correo inválido, contraseña corta y contraseñas distintas: errores sin enviar solicitud.
- Credenciales equivocadas o sin conexión: error claro, texto conservado y botón disponible para reintentar.
- Mostrar/Ocultar, teclado, botón volver y scroll en teléfono pequeño.
- Con Confirm email apagado en Supabase: una cuenta nueva debe entrar directamente. La configuración remota y el registro real no se cambian ni se prueban con cuentas reales desde las herramientas del agente.

Validación automatizada: pruebas de solicitudes de autenticación simuladas, preferencias, campos inválidos, compatibilidad con contraseñas antiguas, respuesta con/sin sesión y errores sin exponer mensajes internos. Exportación de bundles iOS/Android verificada. La inspección visual en dispositivo sigue pendiente.


## Actualización de seguridad y Google

La siguiente actualización incorpora Google OAuth PKCE, SecureStore para sesiones nativas y CAPTCHA configurable. Para uso público se recomienda volver a activar Confirm email; el config local ya está en true. Las indicaciones anteriores de desactivarlo corresponden a la fase de pruebas privadas. El usuario cambia el ajuste remoto. Leer GUIA_SEGURIDAD_GOOGLE.md para el orden de activación, las limitaciones de Expo Go y la auditoría de dependencias aún pendiente.


## Teclado y escritura de contraseñas

Para evitar saltos del teclado seguro de iOS se retiraron hints de autofill de contraseñas en esa plataforma; se conservan escritura/pegado y control Mostrar/Ocultar. Android mantiene autocompletado de contraseñas. Cambiar visibilidad cierra el teclado antes de actualizar el modo seguro. El formulario no se recentra al cambiar la altura del teclado y retira foco al salir o completar autenticación. Verificar en el teléfono: escribir/borrar rápido, mostrar/ocultar, pasar de correo a contraseña e iniciar sesión; Inicio debe aparecer sin teclado residual.


## Recuperar contraseña (18 octubre 2026)
Login incluye **¿Olvidaste tu contraseña?**, código de correo y contraseña nueva. Cliente de recuperación aislado, sin persistencia, con validación de identidad, reenvío, CAPTCHA cuando esté configurado y tratamiento de límites/códigos vencidos. Requiere actualizar manualmente la plantilla **Reset Password** en Supabase con `supabase/templates/recovery.html`; pasos en [GUIA_RECUPERAR_CONTRASENA.md](GUIA_RECUPERAR_CONTRASENA.md). No requiere SQL. Entrega real del correo y prueba en teléfono pendientes de esa configuración. También se corrigió el acceso a los colores del indicador de carga en AuthButton.
