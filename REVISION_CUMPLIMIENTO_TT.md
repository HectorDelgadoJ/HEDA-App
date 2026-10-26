# Revisión de cumplimiento del TT HEDA

Corte: 25 de octubre de 2026. Fuente: Reporte TT.pdf, TT 2026-B088 (146 páginas), objetivos/alcances pp. 15–19, requisitos pp. 54–60, metodología Ethereum pp. 87–92; presentación TT1 como apoyo. Se contrastó código local, no una auditoría remota de tu proyecto Supabase. “Implementado” no sustituye aceptación por sinodales ni prueba con usuarios. **Todavía no se cumple todo el TT.**

## Requisitos funcionales

| RF | Estado | Evidencia o brecha |
|---|---|---|
| 01–04 | Implementado en código | Registro, sesión, recuperación y edición; validar de nuevo los proveedores en producción. |
| 05 | Parcial | Perfil y personalización existentes; comprobar cobertura de todos los campos del protocolo y consentimiento. |
| 06–10 | Implementado en código | Ingresos/gastos, categorías, historial y edición/eliminación de registros propios. |
| 11–12 | Parcial | Saldos/reportes existentes; verificar y completar vistas diarias, semanales y mensuales exactas del TT. |
| 13–15 | Implementado en código | Distribución, estadísticas, filtros y gráficas; falta evidencia de prueba del piloto. |
| 16 | Parcial | Presupuestos mensuales; falta periodo de vigencia configurable del requisito. |
| 17–18 | Implementado en código | Varias metas con progreso y fecha opcional; verificar contra criterio final con sinodal. |
| 19 | Parcial | Alertas y análisis de presupuesto; falta flujo completo de ajustes personalizados evaluado. |
| 20–21 | Parcial | Lecciones y cuestionarios existen; falta selección educativa adaptativa demostrada por perfil/hábitos. |
| 22–23 | Parcial | Chat y análisis personalizado disponibles; falta evaluación de calidad de recomendaciones y consejos. |
| 24 | Parcial | Alertas por reglas; falta validar todos los supuestos de proactividad y gasto inusual. |
| 25–28 | Parcial | Explicaciones/chat y contexto autorizado; historial/contexto completo y pruebas de calidad aún pendientes. |
| 29–32 | Parcial | Cálculos de hábitos y desequilibrios por reglas; documentar metodología y evaluar hallazgos. |
| 33 | Implementado, por publicar | Dataset OHLCV real y consulta autenticada; verificar disponibilidad de Yahoo desde Supabase desplegado. |
| 34 | Implementado, por probar en producción | Gráfica de cierres históricos con fuente, fechas y estado de actualización. |
| 35 | Experimental, por publicar | LSTM entrenada 1/7 días; clases y fechas; calidad actual baja. No cumple una promesa de precisión. |
| 36–37 | Implementado en código | Advertencia visible de volatilidad, límites y uso educativo; sin órdenes de inversión. |
| 38 | Parcial | QR con monto/referencia/fecha; falta identidad asociada y estado completo de operación según protocolo. |
| 39 | Implementado, requiere dispositivo | Cámara web/nativa e importación; falta evidencia física Android/iPhone de punta a punta. |
| 40 | Parcial | Importación revisada a movimientos; falta historial específico con referencia, estado y participantes. |
| 41 | Parcial / confirmar alcance | Intercambio académico de registros; no es transferencia de dinero ni integración bancaria. Definir si wallet de prueba es requerida. |
| 42–43 | Parcial | Avisos y recordatorios de presupuesto/metas; validar entrega real con app cerrada y plataforma elegida. |
| 44–45 | Pendiente parcial | No hay cobertura completa de avisos proactivos IA, desequilibrios y novedades Ethereum. |
| 46–48 | Pendiente | Módulo administrador: usuarios habilitar/deshabilitar, contenido educativo y métricas. Dashboard Supabase no demuestra estas funciones en la app. |

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

## Prioridad sugerida

1. Publicar y probar Ethereum/heda-ai con la guía; conservar las métricas bajas como resultado experimental honesto.
2. Completar herramientas de IA sobre entidades propias y trazabilidad; ajustar QR a referencia/participantes/estado sin simular pagos reales.
3. Implementar administrador con rol de servidor (RF46–48), sin confiar en ocultar botones.
4. Completar personalización educativa, presupuestos por periodo y avisos pendientes.
5. Hacer piloto de 20 usuarios, mediciones de rendimiento/usabilidad y corregir con evidencia.
6. Mejorar el modelo con validación temporal adicional; redactar resultados, límites, discusión y reproducibilidad.

No se calculó un porcentaje global: mezclar pantallas terminadas con requisitos parcialmente validados produciría una cifra engañosa.
