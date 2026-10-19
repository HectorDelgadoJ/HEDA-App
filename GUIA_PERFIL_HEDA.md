# Perfil funcional

Perfil utiliza ScreenHeader, paleta y tarjetas compartidas. Se retiraron las opciones de adorno: configuración financiera no implementada, personalización de IA inexistente y términos legales sin documento. No se muestran niveles, contadores o verificaciones de cuenta inventadas.

- Personalizar HEDA abre la configuración existente.
- Editar perfil guarda full_name, username y occupation en profiles, filtrando por el usuario autenticado. Nombre obligatorio, alias y ocupación opcionales. Correo solo informativo; no hay cambio de correo implementado.
- Cambiar contraseña verifica la actual con Supabase Auth y actualiza la nueva. Exige entre 8 y 128 caracteres y confirmación; el servidor puede aplicar requisitos adicionales. No guarda contraseñas en perfiles, almacenamiento local propio, logs ni contexto de IA. Las credenciales residen temporalmente en memoria para la solicitud y se limpian de la pantalla al cerrar o completar. No se han cambiado contraseñas reales durante las pruebas automatizadas.
- Alertas y presupuestos, Mis hábitos y Educación abren sus funciones existentes.
- Privacidad, ayuda y acerca abren contenido de lectura con cierre funcional. No se presenta como aviso legal definitivo.
- Cerrar sesión pide confirmación y usa scope local para este dispositivo. Los registros de cuenta permanecen.

No requiere SQL nuevo: utiliza permisos y RLS de profiles existentes. Si no existe el perfil, muestra error y no permite guardar una ficha inexistente.

Prueba manual en iPhone: editar datos y reabrir la app; cancelar una edición; verificar que una contraseña actual incorrecta no permita cambiarla y, en una cuenta de prueba, cambiarla y entrar con la nueva; abrir cada acceso; probar ayuda/privacidad y cierre; cancelar y confirmar cierre de sesión. Probar usuario diferente y fallo de red. Pruebas automatizadas con cliente simulado no sustituyen la validación real de autenticación y RLS.


## Eliminar cuenta (18 octubre 2026)
Perfil incorpora eliminación definitiva con código de correo y confirmación ELIMINAR. El servidor verifica sesión e identidad; ignora cualquier intento de elegir otra cuenta y usa la API administrativa solo en el servidor. Se eliminan datos activos por cascada y se limpian preferencias/avisos propios del dispositivo. Requiere publicar **delete-account** y configurar **Magic link or OTP** con la plantilla dedicada; pasos en [GUIA_ELIMINAR_CUENTA.md](GUIA_ELIMINAR_CUENTA.md). Sin nueva migración SQL sobre el esquema 001–009. Ninguna cuenta real se borró durante las pruebas. Pendiente prueba remota con cuenta desechable tras el despliegue. Logo en correos sigue pendiente.
