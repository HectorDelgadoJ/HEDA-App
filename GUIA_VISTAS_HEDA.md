# Vista simple y completa

La presentación se guarda en `auth.users.user_metadata.heda_experience` mediante `auth.updateUser`. Son preferencias de interfaz, nunca autorización, saldos o modo de tarjetas. No requiere SQL nuevo, Secrets ni despliegue de una Edge Function. Se conservan los demás metadatos del usuario. El SQL de presupuestos sigue siendo necesario si esa herramienta no se había activado.

## Elección inicial

Después de iniciar sesión o crear una cuenta sin elección guardada aparecen dos pasos: prioridad (gastos, pagos o ahorro) y vista (simple o completa). Se puede usar la simple y configurar después. La selección también aparece una vez en cuentas existentes. Para guardar se necesita conexión; si falla, puede continuar temporalmente sin guardar y volver desde Perfil.

## Qué cambia

- Inicio: saldo registrado hasta hoy, botones separados de gasto/ingreso y tres movimientos recientes. En simple, el próximo compromiso aparece si existe o si se eligió la prioridad de pagos. Se ofrece una meta si se eligió ahorro.
- Vista completa: habilita por defecto indicadores, gráfica, tarjetas, presupuestos, meta y próximo compromiso. Cada bloque se puede ocultar en ambas vistas.
- Más herramientas mantiene accesibles reportes, alertas, IA y módulo educativo de Ethereum. No se eliminan funciones ni registros.
- Movimientos: simple muestra hasta cuatro categorías frecuentes más la seleccionada y permite desplegar el resto. Fecha Hoy es tocable. Nota, selección de origen y configuración de tarjetas se despliegan en Más opciones; el origen seleccionado siempre se resume fuera del desplegable. La vista completa presenta opciones directamente.
- Se retiraron de Perfil el indicador de nivel y los contadores de ejemplo que no se calculaban con datos reales.
- Perfil → Personalizar mi inicio: cambiar vista, bloques y prioridad. Cambiar vista aplica sus valores iniciales; después se pueden ajustar los interruptores antes de guardar.
- Vista simple/completa es independiente del registro Desde mi saldo/Con tarjetas. Cambiar presentación no llama a RPC financieras ni modifica el modo de tarjetas.

## Prueba en teléfono

1. En una cuenta sin preferencias, elegir prioridad y vista; probar Hacerlo después.
2. Desde Inicio, Registrar ingreso debe abrir Ingreso; Registrar gasto debe abrir Gasto.
3. Capturar monto, fecha anterior, categoría y nota. Plegar Más opciones debe conservar los datos y mostrar el origen del gasto.
4. Perfil: elegir completa y desactivar un bloque, guardar y volver a Inicio. Reiniciar y comprobar persistencia. En otro dispositivo, volver a iniciar sesión o reiniciar para recuperar la preferencia de cuenta; no hay sincronización en vivo de cambios remotos.
5. Cambiar a simple: historial, tarjetas, recurrentes, metas y cálculos deben conservarse. Comprobar compras/pagos sin duplicidad.
6. Cambiar de cuenta: nunca debe heredar preferencias ni registros de la cuenta anterior.
7. Sin conexión: un error al guardar debe conservar la edición, sin afirmar que se sincronizó.

La simplificación es una hipótesis de diseño pendiente de prueba de usabilidad. Medir tiempo, errores y ayuda necesaria para registrar un gasto, encontrar un compromiso y crear una meta. Pendientes anteriores: gesto de regreso en iPhone y revisión final de IA.


## Ayuda contextual

Las explicaciones secundarias de privacidad, cálculos y funcionamiento se abren con el icono azul de información. El icono tiene área táctil de 44 puntos y una etiqueta accesible que identifica el tema; abre un aviso con título y botón Entendido. No realiza consultas, envíos ni cambios de datos. Los errores, importes, fechas, autorizaciones para compartir información y confirmaciones de pagos/eliminaciones permanecen visibles. Probar también el icono dentro de los formularios de presupuestos y programaciones.


## Tarjetas opcionales en Pagos

Tarjetas por pagar se activa con un interruptor dentro de Pagos o en Perfil → Personalizar HEDA → Herramientas opcionales. Está desactivado inicialmente en ambas vistas, incluidas preferencias anteriores sin esta opción. Se guarda en la cuenta en tools.cardPayments, independientemente del bloque de tarjetas en Inicio y del modo financiero Con tarjetas. Desactivarlo no borra datos ni excluye deudas del saldo estimado o avisos. El menú presenta primero las programaciones; tarjetas y estimación son secciones secundarias. La estimación está plegada inicialmente.


## Personalización y apariencia clara/oscura

- Se mantienen dos vistas base. Vista personalizada es un estado calculado al cambiar sus bloques, no una tercera vista.
- Elegir qué mostrar es desplegable, con grupos En Inicio y En Pagos.
- Restablecer esta vista recupera sus bloques iniciales y tarjetas opcionales desactivadas. Conserva tema, prioridad y registros; requiere Guardar preferencias para persistir.
- Apariencia Claro/Oscuro se guarda en heda_experience.theme. Cuentas anteriores sin campo theme mantienen Claro.
- Elegir apariencia ofrece vista previa inmediata. Cerrar sin guardar revierte la vista previa. Guardar requiere conexión; un error no se presenta como éxito.
- React Context y estilos reactivos aplican la paleta a pantallas, navegación, tarjetas, campos, calendarios y modales sin remontar la navegación. Se conservan borradores y conversación. El sistema adapta también teclado, barra de estado y avisos nativos.
- expo-system-ui 57.0.4 se añadió con versión fija para Expo 57; ejecutar npm ci en otra computadora. userInterfaceStyle permite ambos temas. No requiere SQL ni Secrets nuevos.
- theme/themeStyles.js resuelve colores literales anteriores según su función y mantiene fondos de acciones y texto blanco. Los componentes nuevos deben preferir tokens semánticos y useThemeStyles; el adaptador no cambia importes ni reglas financieras.

Prueba en iPhone: Perfil → Personalizar HEDA → Oscuro. Revisar el formulario antes de guardar, cerrar y comprobar reversión; abrir de nuevo, guardar y reiniciar para comprobar persistencia. Revisar Inicio, registro de ingreso/gasto, fecha/calendario, historial, tarjetas y estimación, reportes/metas, IA (también con resumen compartido), alertas/presupuestos, educación y edición de perfil/contraseña. Comprobar el teclado y la X de cada modal. Cambiar a Claro y probar otra cuenta sin heredar el tema. Los widgets oficiales de búsqueda se muestran como los entregue el proveedor.


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
