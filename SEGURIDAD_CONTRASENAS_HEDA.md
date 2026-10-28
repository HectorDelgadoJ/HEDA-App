# Contraseñas de HEDA

La app exige para contraseñas nuevas (registro, recuperación y Perfil) de 12 a 128 caracteres, con al menos una mayúscula A–Z, una minúscula a–z, un número y un símbolo. Permite pegar y conserva los espacios sin modificar la contraseña. El inicio de sesión sigue aceptando las contraseñas existentes.

El indicador Baja / Media / Alta es orientativo y local: no mide entropía, no consulta filtraciones, no transmite la contraseña para evaluarla y no garantiza seguridad absoluta. Las contraseñas se envían solo al servicio de autenticación al crear o actualizar credenciales.

## Aplicar también en el servidor (paso manual del responsable)

1. Supabase → Authentication → Sign In / Providers → Email (ajustes de contraseña).
2. Minimum password length: **12**.
3. Required characters: **mayúsculas, minúsculas, números y símbolos**, la opción más completa.
4. Guardar. No se ejecuta SQL ni se despliegan Edge Functions para este ajuste.
5. Probar una cuenta nueva, recuperación y cambio de contraseña; verificar que una cuenta anterior continúa iniciando sesión.

La protección de contraseñas filtradas es una función adicional disponible en planes Pro o superiores. No se ha habilitado ni se requiere contratarla para este cambio. La validación del cliente no sustituye esta configuración del servidor. No se ha modificado Supabase automáticamente.

Publicación: la nueva carpeta **dist** debe reemplazar el despliegue de Netlify.

Referencia: https://supabase.com/docs/guides/auth/password-security
