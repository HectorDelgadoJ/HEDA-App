# Compartir HEDA como web con Netlify

## 1. Generar la carpeta

Desde PowerShell, en la carpeta del proyecto:

```powershell
npm ci
npm run build:web
```

Se genera **dist**. Usa Node 22.13 o una versión compatible con `engines` del proyecto. La versión exportada ya incluye las variables públicas de `.env.local` de esta computadora. No hay que volver a crear usuarios ni repetir SQL: usa el mismo proyecto de Supabase.

Para probar la exportación localmente:

```powershell
npm run preview:web
```

Abre http://127.0.0.1:4173. Esto es solo una vista previa en tu PC; el enlace que compartirás será el HTTPS de Netlify.

## 2. Subir a Netlify (sin dominio propio)

1. Entra a **https://app.netlify.com/drop**. Crea tu cuenta o inicia sesión; si usas GitHub, no es necesario conectar ni publicar el repositorio para subir manualmente.
2. Arrastra la carpeta **dist** completa al área de subida. No subas toda la carpeta del proyecto ni `.env.local`.
3. Espera a que termine y abre la dirección HTTPS `...netlify.app` que te muestre Netlify. Esa será la que compartas.
4. Puedes cambiar el nombre del sitio desde los ajustes de Netlify, sujeto a disponibilidad.

No necesitas que tu PC siga encendida. Para actualizar, vuelve a ejecutar `npm run build:web` y sube la nueva carpeta dist al **mismo sitio**, en Deploys / deploy manual, evitando crear sitios distintos en cada actualización.

Los archivos de fallback y cabeceras para Netlify ya están en dist. No hay caché offline ni service worker: HEDA necesita internet para acceder a la cuenta, consultar información y guardar registros.

## 3. Ajustes de Supabase cuando tengas el enlace

Authentication > URL Configuration:

- Agrega la URL raíz HTTPS del sitio (con `/` final) a **Redirect URLs**.
- Usa esa URL en **Site URL** si será la dirección pública principal de HEDA. Mantén los redirects nativos que ya utilices.

Para Google, el retorno del proveedor sigue siendo el callback de Supabase configurado en Google Cloud; no lo reemplaces por una dirección inventada de Netlify. La app web solicita volver a la raíz del sitio; esa raíz debe estar permitida en Supabase. El proveedor Google debe estar configurado para que ese botón funcione.

La recuperación y eliminación por código reutilizan las funciones y plantillas ya desplegadas. Las pruebas automatizadas de la web usan respuestas simuladas: hay que confirmar una vez estos flujos reales desde la dirección publicada.

Si configuraste CAPTCHA, autoriza también el dominio de Netlify en el proveedor de CAPTCHA. Los valores públicos de CAPTCHA deben existir durante la compilación. No pongas claves privadas en variables EXPO_PUBLIC ni subas claves de Gemini, SMTP o service_role: siguen exclusivamente en los servicios del servidor.

## 4. Agregar a inicio

En el login aparece **Pon HEDA en tu inicio > Ver cómo hacerlo**. También está en **Perfil > Agregar HEDA a inicio**.

- iPhone: abrir en Safari > Compartir > Agregar a inicio > activar Abrir como app si aparece > Agregar.
- Android: Chrome > menú > Instalar app / Agregar a pantalla principal. Si Chrome ofrece el aviso de instalación, HEDA muestra el botón para abrirlo desde un toque del usuario.
- Computadora: Chrome o Edge > icono de instalación o menú de aplicaciones.

La guía cambia según el dispositivo; si se abre en modo standalone, ya no muestra la tarjeta de instalación en el login. Algunos navegadores solo ofrecen un acceso directo. La instalación desde Safari y el navegador de cada teléfono se debe comprobar físicamente: la emulación de iPhone en un navegador de escritorio no sustituye esa prueba.

## Diferencias con la app móvil

Los recordatorios locales del teléfono están disponibles en iOS/Android nativos. La web permite revisar Alertas, pero no programa notificaciones locales con la app cerrada. No se implementó push web ni operación sin conexión. Los datos de cuenta y preferencias se sincronizan con Supabase; el almacenamiento del navegador guarda la sesión y los ajustes locales por origen.

La web incluye diálogos propios de confirmación, pues `Alert.alert` nativo no funciona igual en React Native Web. No se omiten las confirmaciones destructivas ni el cierre de sesión.

## Comprobación antes de compartir

- Enlace HTTPS abre desde otra red con la PC apagada.
- Registro, acceso y correo de recuperación reales.
- Gasto/ingreso guardados y totales coincidentes en Inicio/Reportes.
- IA responde y respeta los permisos del resumen financiero.
- Cancelar una confirmación no elimina datos; probar borrar solo una cuenta desechable.
- Agregar a inicio desde un iPhone real y Android.

## Referencias
https://docs.expo.dev/guides/publishing-websites/
https://docs.netlify.com/site-deploys/create-deploys/


## Preparar el piloto público (18 de octubre de 2026)

El acceso real con Google ya fue confirmado por el responsable. La causa del rechazo anterior era un Client Secret inválido; no fue un fallo de Safari. Mantén en Google Cloud solo los secretos necesarios y revoca el que quedó expuesto en una captura. El agente no cambia esas credenciales.

### Orden de actualización

1. En Supabase **SQL Editor**, ejecuta una vez el contenido de `supabase/migrations/202610180010_complete_google_profile.sql`, después de 001–009. Es SQL, no el TypeScript de Edge Functions. No elimina cuentas ni renombra @usuarios existentes. La función solo modifica el perfil de `auth.uid()` y la unicidad se comprueba en la base de datos.
2. Ejecuta `npm run build:web` y sube **dist completa al mismo proyecto de Netlify**. La dist entregada ya está compilada. No necesitas actualizar ninguna Edge Function.
3. Abre sin iniciar sesión estas páginas y revisa el contacto y los textos antes de compartir:
   - https://heda-app.netlify.app/privacidad/
   - https://heda-app.netlify.app/condiciones/
4. En Google Auth Platform > Información de la marca, conserva la página principal https://heda-app.netlify.app/ y agrega las dos URL anteriores en Privacidad y Condiciones. No prometas un sello de verificación: Google decide la revisión de marca/dominio y la autorización final. Mantén solo openid, email y profile; no permisos de Gmail o Drive.
5. Guarda y entra a **Público > Publicar app**. Si Google muestra otro requisito, resuélvelo según el mensaje. Hasta que la consola confirme En producción no afirmes que todas las cuentas pueden entrar. Es un ajuste remoto que hace el responsable.
6. Verifica con un correo nuevo de Google: completa nombre, edad y @usuario. Prueba un @usuario ocupado; debe rechazarlo sin crear otro perfil. Tras guardar, debe aparecer la personalización inicial; al volver a entrar no debe repetir el formulario si el perfil ya está completo.

Las páginas públicas son independientes de React Native, funcionan sin sesión y sin ejecutar JavaScript. No tienen formularios ni analítica publicitaria. Describen el almacenamiento, acceso administrativo, proveedores, IA gratuita, eliminación y límites actuales; no afirman certificación legal o cumplimiento absoluto. El responsable debe mantenerlas al día conforme cambien el servicio y sus proveedores.

### Prueba con amigos (pendiente de hacer en dispositivos reales)

El acceso al asistente Gemini se limita a mayores de 18 años mediante edad calculada en el servidor. Aplica primero el SQL 011 y actualiza heda-ai según el apartado Fecha de nacimiento; sin esos pasos, la restricción no está activa remotamente. Las demás herramientas siguen disponibles. La fecha es declarada y no verifica documentalmente la edad.

- iPhone/Safari y Android/Chrome: acceso de Google con una cuenta distinta, completar perfil, cerrar sesión y volver a entrar.
- Correo: crear cuenta, recuperar contraseña por código y volver a entrar.
- Finanzas: gasto, ingreso, tarjeta, programación confirmada manualmente y reporte; verificar importes y que otra cuenta no muestre esos datos.
- IA: pregunta general, revisión del consentimiento antes del resumen financiero y aviso de límite cuando corresponda. No incluir datos bancarios o sensibles.
- Cuenta desechable: eliminar y comprobar que el nuevo registro no restaura sus datos.
- Instalar desde el tutorial, abrir desde inicio, volver a entrar y verificar persistencia. Probar desde otra red con la PC apagada. No esperar push web ni operación sin conexión.
- Registrar dispositivo, navegador, resultado y cualquier problema. Las pruebas automatizadas con respuestas simuladas no sustituyen estas comprobaciones.

### Validación local de esta entrega

Se probaron el perfil incompleto, un @usuario ocupado, guardado y reingreso con backend simulado; páginas públicas en ancho de teléfono; permisos, valores inválidos, unicidad y aislamiento por cuenta en PostgreSQL temporal; compilación web, iOS y Android. No se publicaron cambios desde el agente ni se usaron cuentas de amigos.


## Fecha de nacimiento y edad automática (18/10/2026)

Esta entrega sustituye la edad declarada por fecha de nacimiento privada (DD/MM/AAAA en la interfaz, YYYY-MM-DD en PostgreSQL). La edad se calcula al consultar el perfil; no se aumenta la edad vieja ni se infieren cumpleaños. Las cuentas existentes, por correo o Google, completan una vez los datos faltantes antes de la bienvenida. Pueden corregir la fecha desde Editar perfil. El campo legado `age` sigue siendo una instantánea de compatibilidad y no es la fuente de edad ni de elegibilidad de IA.

### Aplicación remota, en este orden

1. Si falta, ejecuta primero el SQL 010; luego ejecuta **supabase/migrations/202610180011_birth_dates.sql** completo en Supabase SQL Editor. Es SQL, no TypeScript. Mantiene los registros y no rellena fechas ficticias. Hay validación del lado del servidor e índice de @usuario único.
2. En Edge Functions > **heda-ai**, reemplaza su código por el contenido completo de **supabase/heda-ai-dashboard.ts** y vuelve a desplegar la misma función. Ese archivo es TypeScript para el editor de Edge Functions, nunca para SQL Editor. Mantén su autenticación actual y los secrets existentes.
3. Sube la nueva **dist** al mismo sitio de Netlify.

La Edge Function comprueba la elegibilidad a través de una RPC autenticada: recibe solo true/false/null y no envía la fecha de nacimiento a Gemini. Rechaza consultas del asistente y análisis financiero para menores de 18 años o cuentas sin fecha válida antes de llamar al proveedor o consumir cuota. Las demás herramientas de HEDA siguen disponibles. La fecha es declarada por el usuario; no constituye verificación documental de identidad o edad.

Hasta que actualices **heda-ai**, la nueva restricción de IA no está activa remotamente. No publiques el nuevo aviso como si el servidor estuviera actualizado antes de terminar este paso. Las páginas legales ya reflejan el nuevo tratamiento de fecha de nacimiento.

Prueba con una cuenta desechable: fecha imposible, futura, cumpleaños de hoy, reingreso sin repetir formulario y corrección desde Perfil. Comprueba con una fecha de menor que la IA rechaza la solicitud, y con una fecha de adulto que responde. No uses fechas ficticias en cuentas personales como prueba; utiliza cuentas desechables. Se probaron estas reglas en PostgreSQL temporal y con respuestas simuladas; quedan la actualización y las pruebas reales a cargo del responsable.
