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
- Son avisos dentro de la app al entrar o actualizar. No hay push, tareas en segundo plano ni entrega garantizada con la app cerrada.

## Prueba breve

1. Crear Comida con límite 1000; registrar gastos del mes por 800 → aviso preventivo.
2. Llegar a 1000 → aviso de límite y nueva identidad de lectura. Registrar un pago de tarjeta no debe aumentar ese gasto.
3. Editar o eliminar el límite; los movimientos deben conservarse.
4. Revisar un recurrente o tarjeta con fecha dentro de siete días; marcar leído no debe registrar pagos.
5. Cambiar de usuario y comprobar aislamiento; probar también acceso con otra cuenta en Supabase antes de publicar.

## Pendientes acordados

- Revisar en iPhone el gesto de deslizar para volver a IA: el usuario indicó que no funciona como esperaba.
- Revisión final de IA y del flujo de resumen autorizado.
- Notificaciones al teléfono, sincronización de lectura entre dispositivos e historial de límites, si se incorporan después.
