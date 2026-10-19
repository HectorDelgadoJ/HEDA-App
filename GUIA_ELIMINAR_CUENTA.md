# Eliminar cuenta en HEDA

La app incorpora Perfil > Eliminar cuenta. Solicita un código al correo de la cuenta activa y la palabra **ELIMINAR**. El borrado es definitivo: no pruebes con tu cuenta principal; crea una cuenta desechable con datos de prueba.

## 1. Publicar la función (no SQL)

Desde PowerShell, en la carpeta del proyecto:

```powershell
Get-Content .\supabase\delete-account-dashboard.ts -Raw -Encoding UTF8 | Set-Clipboard
```

Supabase > Edge Functions > Deploy a new function > Via Editor:

1. Nombre exacto: **delete-account**.
2. Reemplaza TODO `index.ts` por lo copiado y despliega.
3. En los ajustes de **esta función**, deja desactivada la comprobación de JWT legado del gateway (Verify JWT / Verify JWT with legacy secret). La función usa `withSupabase({auth:'user'})` y además consulta `auth.getUser()` antes de cualquier operación: sigue exigiendo una sesión válida. Esto permite claves de firma actuales sin depender del verificador legado.

No cambies las otras funciones. No se pega en SQL Editor. La copia de un solo archivo se genera con `node scripts/build-delete-account.mjs` y se comprueba contra el código fuente en las pruebas.

La función utiliza los secrets internos que Supabase aporta: `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`. No copies la clave administrativa al `.env` de Expo, Git, navegador ni chat. No hay nuevos secrets que debas compartir.

## 2. Plantilla de correo (Magic link or OTP)

Tu SMTP de Gmail ya configurado se reutiliza. Ve a Authentication > Email Templates > **Magic link or OTP**. Esta plantilla es distinta de Reset password: no reemplaces la recuperación que ya funciona.

Asunto: **Tu código de seguridad de HEDA**.

Copia el cuerpo con:

```powershell
Get-Content .\supabase\templates\delete-verification.html -Raw -Encoding UTF8 | Set-Clipboard
```

Pega TODO el HTML y guarda. Conserva `{{ .Token }}`. El archivo usa entidades HTML para evitar problemas con acentos. Se solicita un OTP de acceso existente con `shouldCreateUser:false`; no se crean cuentas. La sesión de prueba vive solo en el servidor. No se modifica la contraseña ni se inicia sesión dentro de la app con este código.

## 3. Prueba con cuenta desechable

- Crea una cuenta de prueba y registra movimientos, una tarjeta, un recurrente, una meta y un presupuesto. Si estás probando notificaciones, activa un recordatorio.
- Perfil > Eliminar cuenta > Enviar código. Recibir el correo NO borra nada.
- Prueba un código incorrecto o no escribir ELIMINAR: no debe borrar nada. Cerrar / Conservar mi cuenta cancela la pantalla.
- Introduce el código correcto, escribe ELIMINAR y pulsa Eliminar mi cuenta definitivamente.
- Debe volver al login. Comprueba en Supabase Auth y tablas que desaparecieron ese usuario y sus filas. Comprueba que otra cuenta conserva sus registros. El código consumido no se reutiliza.
- Prueba también una cuenta que use Google cuando tengas configurado ese acceso. El flujo pide acceso al correo de la cuenta; no pide la contraseña de Google.

No se ha eliminado ninguna cuenta remota durante la implementación. La entrega del correo de eliminación y la prueba real quedan pendientes de desplegar la función y guardar esta plantilla.

## Datos y límites

Las tablas existentes tienen claves foráneas con `ON DELETE CASCADE` hacia Auth: perfil, movimientos, recurrentes, tarjetas, metas, presupuestos y contadores individuales de IA. Se probó con PostgreSQL temporal y las migraciones 001–009, incluidas las compras y programaciones vinculadas a tarjetas; otro usuario permanece intacto. No hace falta una nueva migración si tu proyecto tiene ese esquema.

Los contadores globales sin identificador de usuario se conservan. Las copias de seguridad, logs técnicos y datos que antes recibieron proveedores tienen sus propias políticas de conservación. No se promete borrado instantáneo en todos los servicios ni en otros dispositivos. Los JWT ya emitidos vencen según su expiración; las inserciones de datos financieros con un identificador eliminado son rechazadas por las claves foráneas. No se cancelan pagos ni suscripciones reales.

En este teléfono se eliminan las claves propias de avance educativo, alertas leídas, categorías preferidas y recordatorios; se cancelan sus avisos y se cierra sesión. Nunca se ejecuta AsyncStorage.clear ni se borran datos de otras cuentas. El chat se limpia al salir de la cuenta.

La app actual no sube archivos privados de usuario. Si más adelante agregas archivos propiedad del usuario a Supabase Storage, incorpora su eliminación al proceso: Auth puede bloquear el borrado mientras existan objetos propios. Se muestra un fallo y no se informa éxito si la API administrativa rechaza el borrado.

## Referencias

https://supabase.com/docs/reference/javascript/auth-admin-deleteuser
https://supabase.com/docs/guides/auth/managing-user-data
