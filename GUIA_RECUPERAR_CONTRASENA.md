# Recuperar contraseña en HEDA

## Único cambio necesario en Supabase

1. Abre tu proyecto > Authentication > Email Templates (según la versión del panel puede aparecer en Notifications / Emails) > Reset Password.
2. Asunto: **Tu código para recuperar HEDA**.
3. Sustituye el cuerpo por TODO el contenido de `supabase/templates/recovery.html` y guarda. Debe conservar literalmente `{{ .Token }}`. No pegues esto en SQL Editor ni en Edge Functions. Solo cambia la plantilla de recuperación; no la de registro o Google.

Desde PowerShell, dentro de la carpeta del proyecto:

```powershell
Get-Content .\supabase\templates\recovery.html -Raw -Encoding UTF8 | Set-Clipboard
```

No requiere SQL, nueva tabla, clave privada ni redirect URL. El código de un solo uso se comprueba con `verifyOtp` y tipo `recovery`, soportado por Supabase. La app no utiliza el enlace de la plantilla anterior. Este flujo funciona en Expo Go, app instalada y futura web, sin depender de un esquema de enlaces de Expo.

## Prueba real pendiente

1. Cierra sesión y toca **¿Olvidaste tu contraseña?**.
2. Escribe un correo de una cuenta de prueba que controles. Si configuraste CAPTCHA, complétalo.
3. Solicita el código, abre el correo y escribe el código en HEDA. Revisa Spam si no aparece.
4. Elige una contraseña nueva (8–128 caracteres), confírmala y guarda.
5. Vuelve al login y entra con la nueva contraseña. Confirma que la anterior dejó de funcionar y que tus datos siguen ahí.
6. Prueba código equivocado y reutilizar el código anterior: deben ser rechazados por Supabase. El reenvío espera 60 segundos en la interfaz; Supabase aplica sus propios límites y vencimiento del código.

Si el correo sigue mostrando un enlace, revisa que guardaste **Reset Password**, y pide un correo nuevo. No cambies la verificación de correo para resolverlo.

Si Supabase no entrega el correo, consulta Auth Logs / configuración de email. El remitente predeterminado puede tener restricciones de destinatarios y cuota; para usuarios externos configura SMTP propio cuando corresponda. No afirmamos entrega real hasta realizar la prueba con tu proyecto.

## Cómo se protege el proceso

- La respuesta al solicitar el correo no confirma si existe la cuenta. Solo una verificación real permite cambiar la contraseña.
- Se utiliza un cliente de Auth separado, temporal y sin sesión persistente ni broadcast entre pestañas. El código y las contraseñas permanecen solo en memoria de la pantalla, sin logs, tablas ni metadatos.
- La recuperación no dispara el onboarding ni accede al Inicio. Se comprueba de nuevo la identidad antes de actualizar la contraseña.
- Tras guardar se solicita revocación global de las sesiones de refresco y se vuelve al login. Los JWT de acceso que ya existían pueden seguir vigentes hasta su expiración; no se promete cierre instantáneo en otros dispositivos. Si la revocación no se confirma, el mensaje distingue ese fallo del cambio de contraseña que sí ocurrió.
- Al salir de la pantalla se descarta la sesión temporal. Si cierras por completo la app durante la recuperación, puedes solicitar un código nuevo.
- Las cuentas que solo usan Google pueden seguir con **Continuar con Google**; no necesitas cambiar la contraseña de Google en HEDA.

## Fuentes

- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/reference/javascript/auth-verifyotp
- https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail


## Correo más legible en teléfono
Plantilla de recuperación ajustada con viewport móvil, tabla fluida, menos texto y padding, código monoespaciado sin alterar su valor, reglas para modo oscuro y mitigación de enlaces automáticos de Apple Mail/Gmail. Los clientes pueden modificar o ignorar CSS: confirmar con un correo nuevo en el teléfono. La entrega real ya fue confirmada por el usuario; esta revisión visual de la plantilla aún requiere pegar el HTML actualizado en Supabase > Reset password. Cambiar también el asunto a **Tu código para recuperar HEDA**. Los correos anteriores no cambian.
