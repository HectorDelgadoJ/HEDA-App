# Accesibilidad y demostración de HEDA

Corte: 26 de octubre de 2026. Revisión de seguimiento prevista para el 27/10; presentación final indicada por el usuario para el 18/11/2026.

## Qué quedó implementado

- Seis atajos visibles de Inicio: Asistente IA, Educación financiera, Gestión financiera, Ethereum, Reportes y metas y QR académico. Todos abren pantallas reales; el de IA lleva al chat sin borrar la conversación. Se pueden ocultar individualmente en Inicio → Elegir atajos → Elegir qué mostrar, o Perfil → Personalizar HEDA → Atajos y bloques. No cambia los registros ni bloquea el acceso a las herramientas por los demás menús.
- Inicio → Accesibilidad y lectura, Perfil → Personalizar HEDA → Accesibilidad, y acceso equivalente en el login antes de iniciar sesión.
- Tamaño relativo 100/120/140/200%, sin desactivar el escalado de fuentes del dispositivo. Contraste reforzado, negrita, lectura espaciada, reducción de movimiento y controles más amplios. Se aplican al guardar. La reducción del sistema se respeta incluso si el interruptor propio está apagado.
- Con cuenta, ajustes y visibilidad se guardan en metadatos de la cuenta. En login, accesibilidad y tema se conservan localmente en ese dispositivo. No se envían los ajustes de accesibilidad a Gemini: el contexto IA mantiene su lista permitida de modo, tema y prioridad.
- Desde 140%, navegación inferior mediante botón Menú con lista vertical de nombres completos; evita encimar las cinco etiquetas. Atajos y controles de registro se reorganizan para texto grande.
- Contraste corregido de enlaces, texto secundario, acciones azules y bordes de campos. Foco de teclado visible. Iconos decorativos excluidos de lectura duplicada; nombres accesibles para acciones de icono, interruptores y progreso.
- Botones propios con área mínima base de 24×24; muchas acciones principales ya son de 44–52. Modo amplio de 48 para botones; los interruptores web amplían su área. Las celdas porcentuales del calendario conservan siete columnas y no prometen 48 de ancho en pantallas estrechas.
- Estados correctos para pestañas, radios, botones seleccionados y controles desplegables. Teclas de flecha/Home/End para grupos propios de pestañas y radios web; Escape cierra ventanas; errores de autenticación relacionados con su campo, sin bloquear pegado de contraseñas.
- Gráfica financiera con descripción por meses; Ethereum ofrece lista de cierres como alternativa textual y detalle de apertura, máximo, mínimo, cierre, volumen, fecha y fuente (RF-33). Ingresos/gastos, tendencias y alertas incluyen texto, no solo color.

## Evidencia realizada

Referencia: [WCAG 2.2, guía W3C](https://www.w3.org/WAI/WCAG22/quickref/). Integración nativa basada en [propiedades de accesibilidad de React Native](https://reactnative.dev/docs/accessibility).

Se ejecutaron 48 revisiones automatizadas con axe-core 4.10.3 filtradas por etiquetas WCAG A/AA, incluidas 2.1/2.2 cuando son aplicables. Resultado: cero infracciones detectadas en esos estados. Incluyen login, registro, Inicio, Movimientos, Reportes, IA, Perfil, personalización, Educación, Ethereum, QR, Alertas y Presupuestos, temas claro/oscuro y varios estados al 200%. Las pantallas se probaron con backend simulado; esto no valida contenido de usuarios reales, errores de red de producción ni todos los diálogos posibles.

- Texto al 200% y navegación en 390 px, y 320 px con todas las opciones de accesibilidad activadas, sin desbordamiento horizontal del documento en los estados comprobados.
- Se probaron guardado y recuperación de opciones, ocultar el atajo Ethereum, atajos reales, flechas para selección por teclado, Escape y persistencia de texto grande en login después de recargar.
- 252 pruebas automatizadas aprobadas, ninguna omitida. Exportación web, Android e iOS correcta. Exportar no demuestra comportamiento de VoiceOver/TalkBack en hardware real.
- Los resultados incompletos de axe incluyen aria-prohibited-attr, color-contrast y aria-hidden-focus en algunos estados; requieren revisión humana. Cero infracciones automáticas no significa cero problemas posibles.

Datos: [resumen](reports/accessibility/summary.json) y archivos JSON de casos en reports/accessibility/. Capturas: [Inicio](reports/accessibility/home-default.png), [opciones](reports/accessibility/accessibility-options.png), [320 px al 200%](reports/accessibility/home-200-320.png).

## Qué puede afirmarse ante la profesora

«Implementamos personalización accesible y revisamos criterios de WCAG 2.2 A/AA en los flujos principales. Corregimos problemas detectados de contraste, nombres, estados y lectura ampliada; tenemos pruebas automáticas y de teclado. Aún falta completar pruebas manuales con lectores de pantalla y usuarios, así que no lo presentamos como una certificación de conformidad total».

No decir «cumple todos los estándares», «certificación WCAG», «100% accesible» ni que los lectores físicos ya se probaron. WCAG evalúa páginas y procesos completos; una opción de contraste no sustituye accesibilidad por defecto. También faltan comprobar zoom de navegador, espaciado de texto personalizado y contenidos reales a lo largo de todos los formularios y estados.

| Referencia | Trabajo comprobado / límite |
|---|---|
| 1.1.1 Contenido no textual | Alternativas en datos gráficos; revisar lectura física de SVG, QR y cámara. |
| 1.3.1 / 4.1.2 Relaciones, nombre y estado | Grupos, etiquetas, errores, progreso y estados ARIA corregidos y auditados en los casos incluidos. |
| 1.4.1 Uso del color | Nombres/tipos/importes junto a tonos financieros y etiquetas de tendencias/alertas. |
| 1.4.3 Contraste | Paletas y estados auditados, más pruebas numéricas de texto/acciones/campos. No todos los colores de todos los estados remotos. |
| 1.4.4 / 1.4.10 Tamaño y reflujo | Escalado propio 200% y muestras a 320/390; zoom real del navegador y todas las ventanas aún requieren revisión. |
| 1.4.12 Espaciado | Opción de lectura espaciada disponible; no equivale por sí sola a verificar todos los sobrescritos del criterio. |
| 2.1.1 / 2.1.2 Teclado | Activación, selección por flechas y cierre de ventana con Escape; repetir en procesos completos con datos reales. |
| 2.4.7 / 2.4.11 Foco | Contorno visible y navegación ampliada; comprobar foco no oculto por teclado móvil en hardware. |
| 2.5.8 Objetivos táctiles | Mínimos de componentes propios y modo amplio; no implica cumplir el objetivo AAA de 44 px en todo componente de terceros. |
| 3.3.1 / 3.3.2 Errores e instrucciones | Campos de autenticación relacionados con errores y etiquetas; revisar los demás formularios con lector. |
| Movimiento | Respeta preferencia del sistema y elimina transiciones propias. Es una mejora, no una certificación AAA. |

## Demostración para mañana (5 minutos)

1. Abrir Inicio y mostrar los seis módulos de la propuesta. Entrar a IA, Educación, Gestión, Ethereum, Reportes y QR desde sus atajos.
2. Abrir Elegir atajos, ocultar uno y guardar. Confirmar que desaparece; volver a activarlo para la presentación.
3. Abrir Accesibilidad y lectura. Elegir 140% o 200%, contraste y controles amplios; guardar. Mostrar que el menú se transforma en una lista legible y que las tarjetas se reorganizan.
4. Abrir Ethereum → Datos del último cierre y Leer datos de la gráfica: la información visual también se puede leer como texto.
5. En PC usar Tab/Shift+Tab, Enter y Escape. Mostrar foco y ausencia de callejones sin salida en ese recorrido.
6. Volver a 100% si prefieres la distribución habitual. No restablecer las preferencias de accesibilidad de un participante sin consultarle.

## Validación manual pendiente

Antes de afirmar conformidad, registrar fecha, dispositivo/SO/navegador, tarea, resultado, fallo y corrección. Probar VoiceOver en iPhone y TalkBack en Android: login, campos/errores, monto/fecha/categoría, crear meta, diálogo de confirmación, chat, atajos, QR con alternativa pegada y lista de datos de gráficas. Verificar orden de lectura, nombres, anuncio de estados, conservación/retorno del foco, teclado sin cubrir controles y ausencia de gestos obligatorios sin alternativa. No activar el lector a un usuario sin explicar antes sus gestos.

Hacer zoom real de navegador y sobrescritura de interlineado/espaciado, no solo el selector propio. Comprobar 320 px, orientación horizontal, cuentas con listas largas, importes grandes y contenido educativo real. Las pruebas de usabilidad del TT de 20 usuarios, >=80% de tareas sin ayuda y >=4/5 Likert siguen pendientes; estos cambios no sustituyen ese piloto.

## Publicación y siguiente trabajo hasta el 18 de noviembre

Para esta actualización basta subir dist recién generada a Netlify; en Expo recargar el proyecto. No requiere SQL, claves ni publicar funciones Edge. Si quieres volver a generar: npm run build:web.

- 27/10: mostrar módulos, personalización y evidencia; acordar observaciones y criterios con ambas profesoras.
- 28/10–03/11: cerrar periodos de reportes, trazabilidad y fallos de flujos; pruebas físicas con lectores y notificaciones.
- 04/11–10/11: piloto, tiempos y evaluación de usabilidad con registro de resultados; seguimiento prospectivo de Ethereum sin prometer precisión.
- 11/11–14/11: corregir resultados del piloto y cerrar documento, discusión y límites.
- 15/11–17/11: congelar versión, preparar respaldo/demostración y ensayar; evitar cambios grandes sin prueba.
- 18/11: presentación.
