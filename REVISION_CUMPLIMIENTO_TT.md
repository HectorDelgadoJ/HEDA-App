# Revisión de cumplimiento del TT HEDA

Corte: 26 de octubre de 2026. Fuente: Reporte TT.pdf, TT 2026-B088 (146 páginas), objetivos/alcances pp. 15–19, requisitos pp. 54–60, metodología Ethereum pp. 87–92; presentación TT1 como apoyo. Se contrastó código local, no una auditoría remota de tu proyecto Supabase. “Implementado” no sustituye aceptación por sinodales ni prueba con usuarios. **Todavía no se cumple todo el TT.**

## Requisitos funcionales

| RF | Estado | Evidencia o brecha |
|---|---|---|
| 01–04 | Implementado en código | Registro, sesión, recuperación y edición; validar de nuevo los proveedores en producción. |
| 05 | Parcial | Perfil y personalización existentes; comprobar cobertura de todos los campos del protocolo y consentimiento. |
| 06–10 | Implementado en código | Ingresos/gastos, categorías, historial y edición/eliminación de registros propios. |
| 11–12 | Parcial | Saldos/reportes existentes; verificar y completar vistas diarias, semanales y mensuales exactas del TT. |
| 13–15 | Implementado en código | Distribución, estadísticas, filtros y gráficas; falta evidencia de prueba del piloto. |
| 16 | Implementado, por publicar | Presupuestos mensuales o con inicio/fin personalizado, validación y cálculo por periodo. SQL 013. |
| 17–18 | Implementado en código | Varias metas con progreso y fecha opcional; verificar contra criterio final con sinodal. |
| 19 | Parcial | Alertas y análisis de presupuesto; falta flujo completo de ajustes personalizados evaluado. |
| 20–21 | Implementado por reglas, requiere evaluación | Catálogo administrable, orden explicable por nivel/prioridad/registros y progreso sincronizado. No es un recomendador aprendido. |
| 22–23 | Parcial | Chat y análisis personalizado disponibles; falta evaluación de calidad de recomendaciones y consejos. |
| 24 | Parcial | Alertas por reglas; falta validar todos los supuestos de proactividad y gasto inusual. |
| 25–28 | Parcial | Explicaciones/chat y contexto autorizado; historial/contexto completo y pruebas de calidad aún pendientes. |
| 29–32 | Parcial | Cálculos de hábitos y desequilibrios por reglas; documentar metodología y evaluar hallazgos. |
| 33 | Implementado, por publicar | Dataset OHLCV real y consulta autenticada; verificar disponibilidad de Yahoo desde Supabase desplegado. |
| 34 | Implementado, por probar en producción | Gráfica de cierres históricos con fuente, fechas y estado de actualización. |
| 35 | Experimental, por publicar | LSTM entrenada 1/7 días; clases y fechas; calidad actual baja. No cumple una promesa de precisión. |
| 36–37 | Implementado en código | Advertencia visible de volatilidad, límites y uso educativo; sin órdenes de inversión. |
| 38 | Implementado, por publicar | QR v2 con referencia verificada, cuenta emisora, vigencia, cancelación y recibos por receptor. No verifica identidad civil. |
| 39 | Implementado, requiere dispositivo | Cámara web/nativa e importación; falta evidencia física Android/iPhone de punta a punta. |
| 40 | Implementado, por publicar | Historial QR con referencia/participantes/fecha/estado y monto; importación revisada e idempotente. |
| 41 | Parcial / confirmar alcance | Intercambio académico de registros; no es transferencia de dinero ni integración bancaria. Definir si wallet de prueba es requerida. |
| 42–43 | Parcial | Avisos y recordatorios de presupuesto/metas; validar entrega real con app cerrada y plataforma elegida. |
| 44–45 | Implementado por reglas, por configurar/probar | Desequilibrio, gasto inusual, recomendación educativa y variación ETH opcional. Nativo: evaluación al abrir; web: envío programado con suscripción/VAPID/Cron. No se inventan noticias. |
| 46–48 | Implementado, por publicar/asignar | Panel protegido por rol de servidor: usuarios, catálogo/cuestionarios, progreso, conteos y visitas por módulo. Ningún admin asignado automáticamente. |

## Requisitos no funcionales

| Grupo | Estado y verificación pendiente |
|---|---|
| RNF01–10 Seguridad | Auth Supabase, tokens, RLS y validaciones existentes. Revisar políticas efectivamente aplicadas, expiración/refresh configurados, protección y permisos de administrador. Nunca afirmar “no se puede hackear”. |
| RNF11–13 Trazabilidad | Recibos de acciones idempotentes y registros parciales. Falta bitácora integral por usuario/fecha/entidad/estado para chat, perfil, QR, recomendaciones y cambios. |
| RNF14–19 Rendimiento | Faltan mediciones documentadas ≤10 s operaciones básicas, ≤15 s inicio Android, ≤20 s IA y Ethereum, y prueba con 20 usuarios. Un timeout configurado no acredita rendimiento. |
| RNF20–22 Usabilidad | Simplificación, modos, tutorial e información expandible existentes; falta piloto ≥80% tareas sin ayuda y evaluación ≥4/5 según protocolo. |
| RNF23–30 Disponibilidad/integridad | Manejo de errores y restricciones parciales. Verificar restauración de respaldos, consistencia en concurrencia, errores de red, borrado y políticas reales. |
| RNF31–38 Arquitectura/compatibilidad | Código modular, API JSON y documentación; falta consolidar contrato y evidencia en Android 10+/dispositivos físicos. Exportar web/iOS no equivale a certificación del Android objetivo. |

## IA: lo solicitado frente a lo que existe

El asistente puede consultar datos propios con permiso y proponer **crear movimientos, metas, presupuestos y recurrentes** con revisión/confirmación e idempotencia. Se corrigió el desvío hacia un prompt antiguo que negaba esas herramientas. Requiere publicar la versión nueva de heda-ai.

**Todavía no modifica todo:** faltan herramientas de edición/eliminación, aportaciones a metas, pausar/reanudar recurrentes, administración de tarjetas y preferencias. No dar acceso administrativo ni ejecución arbitraria de SQL. Implementar cada operación con autorización de propietario, validación, confirmación y bitácora. La información pública Ethereum se consulta en su módulo; también puede consultarse desde el chat mediante una herramienta del módulo, una vez publicadas ambas funciones. No confundir el intercambio QR con pagos reales.

## Prioridad de publicación y validación

1. Publicar SQL 013/014 y funciones siguiendo GUIA_CIERRE_TT_HEDA.md; después subir dist.
2. Crear/elegir la cuenta propia de administrador y asignar el rol desde SQL; ninguna cuenta de prueba obtiene acceso automáticamente.
3. Configurar VAPID/Cron para avisos web y probar permisos/entrega reales en cada plataforma.
4. Validar los flujos entre dos cuentas, la suspensión, edición del catálogo y el cálculo por vigencia.
5. Hacer piloto de 20 usuarios, mediciones de rendimiento/usabilidad y corregir con evidencia.
6. Evaluar prospectivamente Ethereum, completar operaciones IA pendientes y redactar resultados, límites y discusión final.

No se calculó un porcentaje global: mezclar pantallas terminadas con requisitos parcialmente validados produciría una cifra engañosa.


## Cierre local de los puntos 1–5: 26/10/2026

El estado anterior de prioridad queda actualizado: administrador, QR verificable, presupuestos por vigencia, educación adaptada y avisos tienen implementación y pruebas locales. Publicar siguiendo GUIA_CIERRE_TT_HEDA.md. La cuenta administradora aún debe crearse/elegirse; VAPID y Cron no se configuraron remotamente. Ethereum v2 mejoró F1 a 7 días de 0.252 a 0.311, pero sigue siendo experimental. Fuente alternativa comprobada localmente con cierre 2026-10-25; no prueba disponibilidad futura desde Supabase ni validez del modelo con datos de otro mercado.

Permanecen fuera de este cierre: completar todas las operaciones de edición/eliminación desde IA; evaluación prospectiva del modelo; pruebas reales de entrega/Android; piloto de 20 usuarios, mediciones, revisión del resto de RNF y documento final. No se afirma cumplimiento total del TT.
