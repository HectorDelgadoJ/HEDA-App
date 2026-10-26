# Registro de avances de HEDA

Actualizado: 17 de octubre de 2026. Referencia para preparar mensajes al compañero y explicar el TT. Describe implementación y límites; no implica que todo esté validado en teléfono o desplegado. No se ha enviado este documento a nadie.

## Propósito y revisión del sinodal

HEDA combina registro, planeación y educación financiera. El sinodal de finanzas comentó que la propuesta se ve interesante pero abruma. A partir de esa observación se priorizó simplificación y presentación progresiva. Todavía se requiere evaluar usabilidad con personas; no se ha demostrado mejora del ahorro ni aprendizaje por el solo funcionamiento del software.

## Movimientos y dinero

- Registro y edición/eliminación de ingresos y gastos, monto, categorías apropiadas por tipo, fecha modificable y nota opcional. Se conserva el tipo después de guardar.
- Ingresos verdes y gastos rojos; historial con contornos por tipo. Botón de guardar accesible y accesos directos desde Inicio.
- Modo financiero Desde mi saldo/Con tarjetas. Los ingresos van a Mi saldo; los gastos pueden salir de Mi saldo o de una tarjeta. Los movimientos anteriores conservan su interpretación.
- Compra con tarjeta: aumenta deuda y gasto sin reducir efectivo inmediatamente. Pago de tarjeta: reduce saldo y deuda sin duplicar gasto. No hay conexión bancaria.
- Tarjetas con nombre, deuda registrada, fecha límite y recordatorio. Seguimiento por cargos/pagos separado de recordatorios manuales.
- Recurrentes de ingresos y gastos: periodicidad personalizada en días/semanas/meses/años, fechas ancla, siguiente fecha, editar/pausar/eliminar. Confirmación explícita; nunca se registra automáticamente solo por programarlo.
- Proyección hasta cierre del mes siguiente: saldo y compromisos registrados, tratamiento de deuda y futuros cargos para evitar duplicidades. Es una estimación, no saldo bancario garantizado.

## Inicio, reportes y metas

- Inicio con saldo disponible registrado, ingresos/gastos del mes, últimos tres movimientos y accesos a registro/historial/pagos/IA. Se filtran fechas futuras para los indicadores hasta hoy.
- Reportes semanales, mensuales y anuales con navegación entre periodos, gráficas y categorías por color. Los pagos de tarjetas no duplican gasto.
- Varias metas, monto objetivo, fecha opcional con calendario, aportaciones a una meta específica y eliminación confirmada. El progreso no demuestra una transferencia bancaria.
- Encabezados, espaciados, botones, colores y tarjetas unificados. Modo claro y oscuro disponibles; personajes y personalización de pago son ideas pendientes.

## IA y arquitectura

- Se probó un agente en Microsoft Foundry, pero hubo restricciones con la cuenta escolar. La integración activa utiliza Gemini desde una Edge Function de Supabase; Foundry no es el proveedor activo.
- Flujo: app con sesión/JWT → función heda-ai con validación de usuario → Gemini. Clave privada en Secrets, nunca dentro de la aplicación o Git.
- Modelo configurable; la guía actual establece gemini-3.5-flash-lite. No se entrenó un modelo propio.
- Instrucciones restringen el alcance a educación financiera, economía y uso de HEDA; se probaron preguntas fuera del alcance. Esto no garantiza ausencia de errores o desvíos.
- Conversación con contexto reciente (hasta seis intercambios completos, límite de caracteres), nueva conversación y reintento sin duplicación. Chat solo en memoria; no es historial permanente sincronizado.
- Errores diferenciados de autenticación, cuota, configuración y espera. No se conoce la cuota restante en tiempo real. No hay límites persistentes propios por usuario para lanzamiento público.
- Búsqueda web preparada pero desactivada en la configuración inicial; no presentar cotizaciones actuales como verificadas. Si se usa, se muestran fuentes y atribución.
- Analizar mis finanzas: vista previa con agregados calculados por servidor y autorización antes de compartir. Filtrado por usuario/RLS, sin nombres, notas ni identificadores en el resumen. Se detectan cambios entre vista previa y envío. Sin búsqueda web en ese chat. Cálculos en código, explicaciones del modelo. Pendiente revisión final del flujo desplegado.

## Herramientas

- Educación: seis lecciones (inflación, interés compuesto, presupuesto, 50/30/20, emergencia, riesgo/rendimiento), pregunta por tema, corrección, explicación, completar y siguiente lección. Progreso local por cuenta, sin sincronización entre dispositivos.
- Hábitos: datos reales, días registrados y racha, categoría principal, comparación de días equivalentes entre meses y gráfica de seis semanas. Se retiraron porcentajes de salud financiera y patrones simulados. Es descriptivo; no una evaluación validada de salud financiera.
- Alertas: presupuestos, próximos compromisos y pendientes, tarjetas con recordatorio y metas activas. Filtros, abrir origen, marcar leído (local por cuenta). No ejecuta pagos.
- Presupuestos: crear/editar/eliminar límite mensual por categoría, umbrales 80% y 100%, cálculo hasta hoy sin duplicar pagos de tarjeta. Reutiliza el límite cada mes; no hay historial de versiones del límite. Tabla budgets con RLS; el usuario debe ejecutar la migración 202610150006_budgets.sql. No consta aquí confirmación de ejecución.
- Avisos dentro de la app: no hay notificaciones push ni garantía de entrega con app cerrada.
- Ethereum sigue como demostración educativa con cifras de ejemplo; no hay predicción ni precio en vivo conectado.

## Simplificación del 17 de octubre

- Vista simple predeterminada y completa, independientes del modo financiero Con tarjetas. No se eliminan registros al cambiar de vista.
- Elección inicial breve: prioridad (gastos/pagos/ahorro) y vista, con opción de hacerlo después. También aparece una vez en cuentas existentes sin preferencia.
- Preferencias guardadas en Supabase Auth user_metadata.heda_experience; sin SQL nuevo. Son presentación, no permisos. No hay sincronización en vivo entre dispositivos; se recuperan al volver a entrar/reiniciar.
- Inicio simple: saldo, Registrar gasto/ingreso, tres movimientos y compromisos/metas elegidos. Otras herramientas detrás de Ver más; cada bloque configurable.
- Perfil → Personalizar HEDA: vista, prioridad, bloques de Inicio y herramientas opcionales. Se retiraron indicadores de nivel y contadores de ejemplo.
- Movimientos simple: categorías frecuentes compactas, Hoy tocable y Más opciones para nota/origen/configuración. El origen seleccionado permanece visible. Accesos desde Inicio abren Gasto o Ingreso correctamente.
- Notas secundarias de privacidad, cálculo y funcionamiento reemplazadas por icono de información azul, con explicación al tocar. Errores, consentimiento financiero, importes, fechas y confirmaciones importantes siguen visibles.
- Tarjetas por pagar opcional y desactivado inicialmente; interruptor en Pagos y en personalización, guardado por cuenta. Es independiente de mostrar tarjetas en Inicio. Ocultarlo no elimina datos ni excluye deudas de cálculos.
- Menú de pagos: primero programaciones; después tarjetas opcionales y saldo estimado plegado.
- IA: encabezado limpio Asistente HEDA; abajo +, mensaje y enviar. El + abre Nueva conversación, Analizar mis finanzas y Aprender y explorar. Las herramientas abren una vista aparte con vuelta al chat sin borrarlo. Las sugerencias iniciales desaparecen al conversar.
- Último ajuste visual: se recuperó la tarjeta morada de Aprender y explorar con icono, descripción y flecha, alineada al borde izquierdo y con texto a la izquierda; sugerencias de preguntas con fondo azul claro, borde suave y texto/iconos azules para que sean visibles. El acceso del menú + utiliza el mismo acento.

## Tecnologías y validación

React Native 0.86.3, React 19.2.3, Expo 57.0.30, JavaScript y TypeScript, React Navigation 7, Supabase Auth/PostgreSQL/RLS y Edge Functions sobre Deno, API Gemini, AsyncStorage, WebView, Ionicons, Safe Area Context, Gesture Handler y Reanimated. Node/npm y Git/GitHub para desarrollo. Versiones fijadas, lockfile y README para instalar en otra computadora; npm ci e instrucciones de Expo/túnel.

Última suite ejecutada: 105 pruebas aprobadas, una integración opcional de base de datos omitida. Compilación iOS validada en cada actualización relevante. Las pruebas automatizadas no sustituyen revisión visual, pruebas reales de proveedor/RLS ni evaluación con usuarios.

## Pendientes que no deben olvidarse

1. Gesto de deslizar para volver a IA: se intentó implementar; el usuario informó que no lo ve funcionar. Sigue pendiente comprobar y corregir en iPhone.
2. Revisión final de IA, resumen autorizado, cambios de datos y cambio de cuenta.
3. Confirmar ejecución del SQL de presupuestos y probar CRUD real y aislamiento con otra cuenta.
4. Pruebas de usabilidad de vista simple/completa y navegación; no afirmar eficacia demostrada.
5. Notificaciones push, módulo Ethereum real/predictivo y otros alcances futuros no están terminados.
6. Preparar explicación al compañero cuando el usuario lo pida, utilizando este registro y verificando cambios posteriores.

- Ajuste de bienvenida IA: icono junto a la pregunta en una misma fila, tamaño de título reducido y texto adaptable. Siguiente pantalla solicitada: Perfil.

## Perfil funcional (última actualización)

Se alineó Perfil con ScreenHeader, paleta y listas agrupadas. Edición real de nombre, alias y ocupación; correo informativo. Cambio de contraseña con verificación de la actual y confirmación de nueva, mediante Supabase Auth. Accesos reales a personalización, alertas/presupuestos, hábitos y educación. Privacidad, preguntas frecuentes y acerca abren contenido. Cierre de sesión local confirmado. Se retiraron opciones de adorno y títulos que prometían funciones inexistentes; no se inventó un documento legal ni un nivel financiero. Sin SQL nuevo. Pendiente prueba manual de edición y contraseña en cuenta de prueba; tests usan un cliente simulado.

- Corrección de formularios de Perfil: presentación de hoja en iOS, proveedor de área segura dentro del modal y botón X + Cerrar más amplio; ajuste compartido para editar perfil, contraseña y paneles informativos. Pendiente confirmación visual del usuario en iPhone.

## Apariencia y personalización mejoradas

Se mantienen Simple y Completa; Vista personalizada indica cambios sobre una base. Se añadió Elegir qué mostrar desplegable, separación En Inicio/En Pagos y Restablecer esta vista sin tocar datos, tema o prioridad. Apariencia clara/oscura con vista previa que se revierte al cerrar sin guardar y persistencia por cuenta. Se migraron los estilos estáticos e inline a un contexto de tema reactivo, incluida navegación, teclado, estado y modales. Se añadió expo-system-ui 57.0.4 y configuración automática nativa. No requiere SQL nuevo. No se ha inspeccionado visualmente en iPhone; deben comprobarse contraste y navegación en el dispositivo.


## Recordatorios, conciliación y análisis fiable (17 de octubre)

- Recordatorios locales opcionales por cuenta/dispositivo en Alertas. Pagos/ingresos recurrentes, tarjetas con recordatorio y metas con fecha: siguiente fecha pendiente, aviso un día antes y ese día a las 9:00 local. Hasta 60 avisos ordenados por fecha; prueba de aviso y acceso a permisos. Abrir un aviso lleva a Alertas. Sin nombres ni importes en el aviso, sin pagos ni registros automáticos. Funcionan con app cerrada una vez programados; necesitan abrir HEDA para renovar fechas y cambios de otros dispositivos. No son push del servidor ni notificaciones web. Presupuestos siguen como avisos dentro de la app.
- Actualización al guardar, regresar a la app y mientras está activa; reconciliación sin duplicados, cancelación de avisos al pausar/eliminar/pagar, desactivar o cerrar sesión. Conservación de programación propia al arrancar sin red y limpieza de avisos de otras cuentas.
- Movimientos, Inicio y Reportes calculan los totales actuales en centavos y excluyen registros futuros. La proyección incluye movimientos futuros por separado, sin duplicar recurrentes ya confirmados ni pagos de tarjeta reservados. Tarjetas muestran deuda registrada hasta hoy.
- Migración nueva 202610170007_card_payment_dates.sql: el RPC de pago conserva bloqueo/RLS y excluye cargos y pagos futuros. El usuario ejecuta el SQL. No se modificaron migraciones ya aplicadas ni datos remotos.
- Resumen IA con presupuestos agregados, cobertura del historial y aviso de pocos datos. Sin registros del mes no se consume Gemini para analizar un resumen vacío. Detección de importes inválidos, sesión cambiada, resumen cambiado y fallos/cuota del proveedor sin reintentar automáticamente. Se mantiene consentimiento explícito y búsqueda desactivada en análisis privado.
- Se regeneró heda-ai-dashboard.ts para publicación manual por el usuario. La revisión de Supabase remoto y entrega real de notificaciones en el teléfono permanece pendiente del usuario.
- Validación: 134 pruebas aprobadas sin omisiones, incluidas 9 comprobaciones SQL con PostgreSQL temporal y dos usuarios para RLS. Exportaciones iOS/Android correctas; no equivalen a validación visual ni a una compilación nativa instalada.

### Pendientes que pidió recordar el usuario

- Pulir el modo oscuro, especialmente contraste, fondos, botones y ventanas.
- Evaluación con usuarios nuevos y documentación de resultados para el TT.
- Preparar y probar la versión web para compartir por enlace, recuperación de contraseña y eliminación de cuenta/datos.
- Gesto de deslizar para volver a IA.
- Probar en dispositivos los recordatorios y realizar los pasos de despliegue SQL/IA descritos arriba. Verificar presupuestos y análisis con dos cuentas reales tras el despliegue.

- Dependencias alineadas con la comprobación de Expo: expo 57.0.30 y expo-notifications 57.0.23, versiones exactas y package-lock actualizado. expo install --check sin diferencias.


## Acceso y alta de cuentas pulidos

Login/registro con presentación compartida: banner azul HEDA, tarjetas, etiquetas y errores junto a campos, teclado/autocompletado, áreas seguras y Mostrar/Ocultar contraseña. Registro en dos pasos: datos de acceso y preferencias opcionales de prioridad/vista. Alias deja de ser obligatorio. Omitir aplica vista simple; preferencias guardadas en signUp sin repetir el onboarding. Sin nuevas tablas ni migraciones. Se eliminaron los logs de usuario/sesión/tokens del login anterior.

Confirmación por correo: el usuario debe apagar Confirm email en Authentication → Sign In / Providers → Email en Supabase remoto. El config local ya la tiene desactivada. El cliente entra automáticamente cuando hay sesión y conserva un flujo honesto de confirmación mientras el servidor aún la exija. El agente no modificó la configuración remota ni creó cuentas reales.

Última suite estándar: 130 pruebas aprobadas y 1 integración SQL opcional omitida (el runtime PostgreSQL temporal de la sesión anterior ya fue retirado; sus pruebas anteriores sí pasaron). Se añadieron 6 pruebas de autenticación. Bundles iOS/Android correctos. Pendiente validación visual y alta real por el usuario.

El usuario confirmó previamente la prueba de recordatorios/análisis descrita en la conversación; conservar la distinción entre ese reporte del usuario y las verificaciones automatizadas.


## Google y refuerzo de seguridad

- Botón Continuar con Google en login y registro. OAuth PKCE, navegador del sistema, regreso heda://auth/callback validado por esquema/host/ruta y códigos de un uso deduplicados. Solo identidad/email/perfil. Google requiere proveedor configurado por el usuario y una app instalada/de desarrollo o web; no funciona como OAuth propio en Expo Go. No se crearon credenciales remotas ni se hizo un login real con Google.
- Sesiones nativas y verificadores PKCE migrados de AsyncStorage a SecureStore en fragmentos pequeños, escritura atómica por generaciones, serialización y eliminación de la copia antigua. Sin fallback de escritura en texto plano. El navegador mantiene su propio almacenamiento; no se añadió biometría.
- CAPTCHA Turnstile integrado en login, registro y reautenticación para contraseña. Página HTTPS aislada lista para alojar; comprobación de origen/nonce, tokens renovados y verificación real en Supabase cuando el usuario active CAPTCHA. Sin variables/proveedor remoto aún no está habilitado; no se afirma protección activa.
- Config local con contraseña mínima de ocho caracteres y confirmación de correo activa para uso público. Los ajustes remotos y doble factor de cuentas administrativas los realiza el usuario.
- Migración 008: cuotas persistentes de IA con locks, 5 consultas/minuto y 60/día UTC por usuario, 300/día compartidas. Resúmenes con cuotas separadas. Contadores inaccesibles directamente a usuarios; RPC limita a auth.uid(). El endpoint falla cerrado si falta SQL y limita cuerpos JSON a 64 KiB. Función manual regenerada.
- Se retiraron logs de pantallas/servicios y se reforzó .gitignore para credenciales. Auditoría SQL de solo lectura preparada para ejecutar en proyecto remoto.
- Validación: 162 pruebas aprobadas sin omisiones, incluidas RLS de todas las tablas entre dos cuentas y cuotas SQL con PostgreSQL temporal. Exportaciones iOS/Android y comprobación de versiones correctas. No es auditoría externa ni prueba de servicios remotos.
- Riesgo pendiente documentado: npm audit mantiene 26 paquetes afectados; no había parches compatibles para las raíces revisadas y audit --force proponía degradaciones incompatibles. No se ocultaron ni se declararon resueltos. Revisar antes de publicación pública.
- Guía operativa completa: GUIA_SEGURIDAD_GOOGLE.md. El usuario debe ejecutar SQL 008, desplegar heda-ai, configurar proveedor Google, alojar/configurar CAPTCHA y verificar RLS en remoto. La futura distribución web/iOS sigue siendo trabajo aparte.

- Revisión PKCE adicional: expo-crypto proporciona azar seguro y SHA-256 al cliente Supabase en nativo para evitar el fallback plain de WebCrypto ausente. Prueba de vector SHA-256 y URL S256 del SDK real.


## Corrección de contraseñas y teclado tras entrar

El usuario reportó trabado al escribir contraseñas y teclado visible tras entrar. Se estabilizaron los campos de acceso con memoización, callbacks y refs estables; iOS ya no recibe hints de contraseña/autocompletado superpuestos en campos seguros. Se desactiva el autofill del sistema para contraseñas en iOS como mitigación de su teclado; escribir, pegar y Mostrar/Ocultar siguen disponibles, y Android conserva hints de gestor de contraseñas. Al cambiar visibilidad se retira el foco antes de cambiar secureTextEntry.

El formulario se ancla arriba y deja de recentrarse con la altura del teclado. Cierre al arrastrar y sin doble ajuste de insets. Se retira foco nativo y se cierra el teclado al enviar, al completar acceso/registro, al salir de pantallas de acceso y al cambiar de cuenta en navegación. No se usan temporizadores que puedan cerrar un teclado nuevo del usuario. Cambiar contraseña en Perfil usa la misma política de iOS. No requiere SQL ni despliegue. Pendiente confirmación en el iPhone: las pruebas lógicas y exportaciones no reproducen el teclado del dispositivo.


## Registro compacto (17 octubre 2026)
Sin banner ni Google repetido al crear cuenta; nombre, edad declarada y @usuario obligatorios. Comprobación al continuar e índice único en Supabase, también para cambios de perfil. Ejecutar migración 202610170009; pasos en [GUIA_REGISTRO_HEDA.md](GUIA_REGISTRO_HEDA.md). Google conserva su acceso anterior, sin edad declarada.


## Bienvenida y logo (18 octubre 2026)
- Nuevo logo HEDA: H blanca y trazo azul ascendente, en `assets/heda-logo.png`. Integrado en acceso, registro, cabeceras, bienvenida y recorrido. Configurado como icono de app y favicon; el icono instalado cambia al generar una nueva compilación, no con recarga de Expo Go.
- Las preguntas de prioridad y vista se muestran al primer acceso, después de crear la cuenta. No se repiten durante el registro. Incluye apariencia clara/oscura.
- Después se ofrece una visita por Inicio, Movimientos, Reportes, IA y Perfil. Navega a las pantallas reales, con explicación breve, anterior/siguiente y cerrar/omitir.
- Al guardar y finalizar u omitir, `welcomeDone` y `tourDone` se guardan en `heda_experience` de Supabase Auth, por cuenta. Los perfiles previos sin estos indicadores verán esta bienvenida una vez al actualizar. Un fallo al guardar se muestra y permite reintentar; sin conexión no se promete persistencia entre equipos.
- Perfil > Personalizar HEDA permite cambiar las respuestas; Perfil > Tu HEDA > Ver visita guiada permite repetir el recorrido. Cambiar de vista o restablecerla conserva los indicadores de bienvenida.
- No requiere SQL ni nuevos secrets. Usa la actualización de preferencias de la propia cuenta que ya tenía la app.

Prueba en dispositivo: entrar con cuenta nueva, completar personalización, avanzar/re retroceder y cerrar el recorrido; salir y entrar para verificar que no se repita; abrirlo desde Perfil; probar otra cuenta y comprobar que tiene su propia bienvenida. Verificar letras grandes y modo oscuro. Las pruebas automáticas cubren el estado y la conservación de preferencias; falta revisión visual en un teléfono.


## Modo oscuro pulido (18 octubre 2026)
- Fondos semánticos de ingreso, gasto y advertencia conservan su color; se corrigió la conversión que trataba los tonos pastel como grises. Las tarjetas antiguas con el color CSS `white` también se adaptan al modo oscuro.
- Campos de entrada con superficie propia, bordes visibles, placeholders y cursores consistentes en movimientos, recurrentes, tarjetas, metas, presupuestos, chat y perfil. Teclado acorde al tema.
- Interruptores con estado apagado visible, botones secundarios con indicador de carga legible y fondos de ventanas/recorrido más definidos. La barra de progreso de Inicio conserva una señal azul visible en oscuro.
- Pruebas de contraste para textos (4.5:1), bordes de campos (3:1), estados financieros y conservación del modo claro. Exportación de iOS y Android como comprobación técnica; la inspección visual final se hace en el teléfono.
- Activación: Perfil > Personalizar HEDA > Apariencia > Oscuro > Guardar preferencias. No requiere SQL ni secrets.


## Recuperar contraseña (18 octubre 2026)
Login incluye **¿Olvidaste tu contraseña?**, código de correo y contraseña nueva. Cliente de recuperación aislado, sin persistencia, con validación de identidad, reenvío, CAPTCHA cuando esté configurado y tratamiento de límites/códigos vencidos. Requiere actualizar manualmente la plantilla **Reset Password** en Supabase con `supabase/templates/recovery.html`; pasos en [GUIA_RECUPERAR_CONTRASENA.md](GUIA_RECUPERAR_CONTRASENA.md). No requiere SQL. Entrega real del correo y prueba en teléfono pendientes de esa configuración. También se corrigió el acceso a los colores del indicador de carga en AuthButton.


## Correo más legible en teléfono
Plantilla de recuperación ajustada con viewport móvil, tabla fluida, menos texto y padding, código monoespaciado sin alterar su valor, reglas para modo oscuro y mitigación de enlaces automáticos de Apple Mail/Gmail. Los clientes pueden modificar o ignorar CSS: confirmar con un correo nuevo en el teléfono. La entrega real ya fue confirmada por el usuario; esta revisión visual de la plantilla aún requiere pegar el HTML actualizado en Supabase > Reset password. Cambiar también el asunto a **Tu código para recuperar HEDA**. Los correos anteriores no cambian.


## Eliminar cuenta (18 octubre 2026)
Perfil incorpora eliminación definitiva con código de correo y confirmación ELIMINAR. El servidor verifica sesión e identidad; ignora cualquier intento de elegir otra cuenta y usa la API administrativa solo en el servidor. Se eliminan datos activos por cascada y se limpian preferencias/avisos propios del dispositivo. Requiere publicar **delete-account** y configurar **Magic link or OTP** con la plantilla dedicada; pasos en [GUIA_ELIMINAR_CUENTA.md](GUIA_ELIMINAR_CUENTA.md). Sin nueva migración SQL sobre el esquema 001–009. Ninguna cuenta real se borró durante las pruebas. Pendiente prueba remota con cuenta desechable tras el despliegue. Logo en correos sigue pendiente.


## Web y Agregar a inicio (18 octubre 2026)
HEDA se exporta con `npm run build:web` a **dist**, preparada para Netlify Drop y Vercel. Tutorial de instalación por plataforma en login y Perfil, manifiesto standalone e iconos del logo HEDA. Las confirmaciones tienen diálogos web propios; almacenamiento y tema están adaptados al navegador. Sin caché offline ni recordatorios locales web. Pasos para publicar y configurar redirects en [GUIA_WEB_HEDA.md](GUIA_WEB_HEDA.md). No se ha publicado un enlace: falta subir dist a la cuenta de Netlify del usuario. Pruebas en navegador con datos simulados; instalación real en Safari y servicios remotos por comprobar tras publicar.


## 18/10/2026 · Preparación para compartir la web

- Privacidad y condiciones públicas en HTML adaptable a móvil y modo oscuro, con responsable/contacto, Google OAuth, Gemini, almacenamiento, acceso administrativo, eliminación y límites actuales. Enlaces desde acceso, registro, completar perfil y Perfil.
- Cuentas con Google: completar una vez nombre, edad y @usuario faltantes antes de la personalización. Reingreso conserva perfil; errores de conexión y @usuario ocupado se muestran sin perder campos. Permite cerrar sesión.
- Migración 010: RPC autenticada sin ID de destino aportado por el cliente; validación de valores y unicidad atómica sobre índice existente. Aplicación remota pendiente, sin SQL ejecutado por el agente.
- Preparada dist para subir manualmente al mismo proyecto de Netlify. Guía con URL legales, publicación de Google y matriz de comprobaciones físicas. Secreto anterior: revocación manual pendiente de confirmar.
- Acceso real con Google confirmado por el usuario tras corregir su secreto OAuth. La pantalla del proveedor usa su propia identidad; no se ha obtenido verificación de marca.


## 18/10/2026 · Fecha de nacimiento privada

- Registro por correo y completar perfil (Google o cuenta existente) usan DD/MM/AAAA con formato automático, validación de calendario y edad calculada. Sin solicitud anual ni cumpleaños inventados para datos antiguos.
- Editar perfil permite corregir fecha y la identidad muestra edad calculada. La fecha no se muestra a otras cuentas ni se incluye en el resumen enviado a IA.
- SQL 011: birth_date privada, validación de fechas futuras/imposibles/rango, RPC limitada a auth.uid, compatibilidad con registros antiguos y elegibilidad Gemini por cumpleaños en servidor. Columna age anterior conservada como instantánea, nunca usada para habilitar IA.
- heda-ai comprueba elegibilidad antes de contactar al proveedor y de reservar cuota. Actualización remota pendiente de realizar por el responsable. Gemini para mayores de 18; demás herramientas disponibles a menores.
- Privacidad y condiciones actualizadas; guía con orden SQL → Edge Function → dist. Pruebas automatizadas de cumpleaños/bisiestos, registro, edición, permisos, compatibilidad y aislamiento.


## 25/10/2026 · Asistente conectado y QR

- Lectura autorizada de registros y perfil básicos, acotada a la cuenta y sin fecha de nacimiento exacta, correo o notas. Hasta 500 detalles por sección y totales calculados por separado; sin búsquedas web con datos privados.
- Gemini function calling prepara hasta tres propuestas por mensaje: movimientos, metas, presupuestos nuevos y recurrentes. Confirmación humana, validación en cliente/servidor y SQL 012 con comprobantes idempotentes ligados a auth.uid. Sin pagos, transferencias o borrados por modelo.
- QR real en Herramientas: generar, compartir texto, cámara nativa/web, lectura de imagen web y pegado de código. Revisión antes de importar a Mi saldo, sin identidad ni credenciales. Reintentos de un QR no duplican en la misma cuenta.
- Permiso de cámara específico sin micrófono. Dependencias fijadas; Expo y notificaciones alineados con los parches requeridos por Expo. No se aplicó npm audit fix --force.
- Privacidad/condiciones y guía actualizadas. SQL, Edge Function y publicación remotos pendientes del responsable; pruebas físicas de cámara y respuestas Gemini reales pendientes.


### Claridad de QR y preguntas personales

- QR con inicio Compartir / Recibir movimiento, formularios consistentes, calendario, lectura como acción principal y código técnico oculto. Elección explícita del tipo al recibir.
- Acceso a datos visible en el chat. Preguntas personales comunes piden permiso directamente; el flujo de efectivo actual responde desde cifras calculadas por servidor, sin quedarse en una explicación de falta de acceso.
- Nueva regresión cubre la pregunta exacta reportada, efectivo frente a gastos con tarjeta, periodos y mezcla de consultas con propuestas. Sin migración adicional.


## 25/10/2026 · Ethereum real y revisión del TT

- Dataset real ETH-USD: 3,272 velas diarias, manifiesto con fuente/fechas/SHA-256 y pipeline reproducible aislado de npm.
- LSTM PyTorch entrenada a 1/7 días con validación temporal 70/15/15, fronteras purgadas y comparadores logística/árbol/Random Forest/mayoría. F1 macro en prueba 0.3465 y 0.2522: resultados bajos declarados, sin promesas de inversión.
- Exportación de pesos e inferencia JavaScript verificadas frente a PyTorch; nueva Edge Function autenticada ethereum-forecast, gráfica, horizontes, metodología, métricas y estados de error/datos atrasados/consulta histórica. Última fila Yahoo vacía omitida sin rellenar huecos internos.
- Chat puede consultar el módulo Ethereum; corregida ruta antigua que negaba herramientas de propuestas. Editar/eliminar toda entidad desde IA todavía pendiente, documentado explícitamente.
- Matriz RF/RNF frente al reporte TT 2026-B088. Administrador, trazabilidad QR completa, personalización educativa y piloto siguen pendientes/parciales. No se afirma cumplimiento total.
- 224 pruebas JavaScript aprobadas y 2 Python; exportaciones web/Android/iOS generadas. Navegador móvil simulado: gráfica, cambio de horizonte y metodología sin errores JS ni desbordamiento horizontal. No sustituye pruebas físicas o despliegue real.
- Publicación manual pendiente: nueva ethereum-forecast, actualización heda-ai y dist en Netlify. Sin SQL nuevo para Ethereum. Instrucciones en GUIA_ETHEREUM_HEDA.md.
