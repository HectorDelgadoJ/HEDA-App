# Alertas y presupuestos

## Activación manual en Supabase

Desde la carpeta del proyecto, en PowerShell:

```powershell
Get-Content -Raw -Encoding utf8 .\supabase\migrations\202610150006_budgets.sql | Set-Clipboard
```

Pegar en Supabase → SQL Editor → New query → Run, una sola vez, después de las migraciones 001–005. El usuario realiza este paso. No es una Edge Function. No requiere Secrets. Crea budgets con RLS y permisos por propietario, sin cambiar movimientos. Después abrir IA → Herramientas → Alertas → Presupuestos y actualizar.

## Funcionamiento

- Un límite mensual por categoría, guardado en Supabase. Se reutiliza cada mes. La edición cambia el límite actual y futuro: esta versión no conserva versiones históricas de límites.
- El gasto se calcula con operaciones del mes hasta hoy, incluidas compras con tarjeta. Excluye pagos de tarjetas y recurrentes sin confirmar. No separa dinero ni bloquea gastos.
- Avisos desde 80% y al alcanzar 100%. Cálculo de umbrales en centavos, sin redondeo anticipado.
- Programaciones activas pendientes y hasta siete días después de hoy, tanto ingresos como gastos. Se abre Programados para confirmarlas explícitamente.
- Tarjetas con recordatorio activado: fecha de pago próxima, hoy o transcurrida, con deuda registrada positiva. No es validación de estado de cuenta ni del pago mínimo.
- Metas activas desde 80% o con fecha próxima o transcurrida. No se inventan alertas bursátiles ni de seguridad.
- Lectura por cuenta guardada en este dispositivo. Al cambiar de situación o fecha puede aparecer un aviso nuevo. Marcar como leído nunca confirma un pago ni elimina un aviso vigente.
- Errores de carga se muestran por fuente. Sin tabla budgets se explica la activación; no se muestran límites de ejemplo.
- Las alertas se calculan dentro de la app al entrar o actualizar. Además hay recordatorios locales opcionales para fechas de pagos, recurrentes y metas; no son push enviados por un servidor.

## Prueba breve

1. Crear Comida con límite 1000; registrar gastos del mes por 800 → aviso preventivo.
2. Llegar a 1000 → aviso de límite y nueva identidad de lectura. Registrar un pago de tarjeta no debe aumentar ese gasto.
3. Editar o eliminar el límite; los movimientos deben conservarse.
4. Revisar un recurrente o tarjeta con fecha dentro de siete días; marcar leído no debe registrar pagos.
5. Cambiar de usuario y comprobar aislamiento; probar también acceso con otra cuenta en Supabase antes de publicar.

## Pendientes acordados

- Revisar en iPhone el gesto de deslizar para volver a IA: el usuario indicó que no funciona como esperaba.
- Revisión final de IA y del flujo de resumen autorizado.
- Sincronización de lectura entre dispositivos e historial de límites siguen fuera de esta versión.


## Recordatorios en el teléfono (17 de octubre)

En Alertas → Recordarme en este teléfono, activar y conceder permiso. Usar Probar aviso: debe llegar aproximadamente 10 segundos después. Tocar la notificación abre Alertas si la cuenta coincide. No se confirma ningún movimiento.

- Se programa la siguiente fecha sin confirmar de cada recurrente activo, tarjeta con recordatorio y deuda positiva, y meta activa no alcanzada con fecha.
- A las 9:00 en la zona horaria del teléfono: un día antes y el mismo día. Si esa hora ya pasó, no se inventa una nueva fecha: el pendiente se conserva en Alertas.
- Avisos genéricos, sin importes, nombres de tarjetas, metas ni conceptos en pantalla bloqueada.
- Se renuevan al abrir o volver a HEDA, al guardar cambios, al tocar Actualizar avisos y cada minuto mientras la app está activa. Los cambios desde otro dispositivo requieren abrir/actualizar esta app. No hay proceso de servidor ni sincronización en segundo plano.
- Se conservan los avisos ya programados si al reiniciar falta conexión. Fechas posteriores requieren abrir HEDA, especialmente después de confirmar la siguiente ocurrencia.
- Máximo 60 avisos pendientes, priorizados por fecha; la interfaz informa si faltan más. Son hasta dos avisos por compromiso.
- Desactivar o cerrar sesión cancela los avisos HEDA pendientes del dispositivo. Cambiar de cuenta elimina los avisos de la anterior. El ajuste es por cuenta y teléfono.
- Presupuestos: los umbrales 80%/100% continúan como alertas al actualizar la app; no se envían como recordatorios locales.
- El sistema puede retrasar avisos por batería, modo concentración o permisos. La prueba real en el teléfono sigue siendo necesaria; exportar el bundle no verifica entrega nativa.
- No se solicitan tokens Expo/APNs/FCM ni Secrets nuevos. Expo Go permite notificaciones locales; para una app instalada propia es necesario reconstruirla al añadir la dependencia/plugin. Esta implementación no agrega notificaciones a Safari ni a la versión web.

## Corrección de fechas de pagos (SQL nuevo)

Desde la raíz del repositorio:

```powershell
Get-Content -Raw -Encoding utf8 .\supabase\migrations\202610170007_card_payment_dates.sql | Set-Clipboard
```

Pegar en SQL Editor → Run después de las migraciones previas. Es una sustitución de la función de pago con RLS y bloqueo de tarjeta; no modifica registros existentes. Excluye compras y pagos futuros de la deuda exigida al registrar un pago hoy. Se puede ejecutar de nuevo.

## Validación realizada

Suite de cálculos y escenarios de fechas futuras, recordatorios sin duplicados, revocación de permisos y cancelación por cuenta. Integración SQL en PostgreSQL temporal: pago atómico, confirmación recurrente sin duplicados, cargos futuros, presupuestos CRUD, unicidad por categoría, límites positivos y RLS entre dos usuarios. No representa una prueba en el proyecto remoto del usuario.
