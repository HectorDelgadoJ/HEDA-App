# Publicar los puntos 1–5 de HEDA

Corte: 26/10/2026. El código está preparado localmente; los cambios de Supabase y Netlify los publica el responsable. No se ejecutó SQL remoto, no se asignó ningún administrador y no se enviaron notificaciones a usuarios reales.

## 1. Base de datos: primero SQL 013, después SQL 014

En la terminal PowerShell de VS Code, dentro de HEDA-App:

```powershell
Get-Content -Raw -Encoding UTF8 ".\supabase\migrations\202610250013_tt_completion.sql" | Set-Clipboard
```

Supabase → **SQL Editor → New query** → pega todo → **Run**. Requiere las migraciones 001–012. Incluye presupuestos con vigencia, catálogo y progreso educativo, administrador, auditoría, métricas, QR verificable e historial de avisos. No borra movimientos ni asigna administradores automáticamente. Ejecuta esta migración una sola vez; si falla, copia el error antes de continuar.

Después:

```powershell
Get-Content -Raw -Encoding UTF8 ".\supabase\migrations\202610250014_web_push.sql" | Set-Clipboard
```

Nueva consulta en **SQL Editor**, pega y ejecuta una sola vez. Añade suscripciones web, reclamación de avisos con reintentos y preferencia opcional de Ethereum. No activa avisos en dispositivos ni envía nada por sí sola.

**Solo estos archivos de migración son SQL. Los archivos dashboard.ts de los pasos siguientes NO van aquí.**

## 2. Funciones: actualizar Ethereum, IA y crear avisos

```powershell
node scripts/build-ethereum.mjs
node scripts/build-heda-ai.mjs
node scripts/build-notifications.mjs
Get-Content -Raw -Encoding UTF8 ".\supabase\ethereum-forecast-dashboard.ts" | Set-Clipboard
```

Supabase → **Edge Functions → ethereum-forecast → Code → index.ts**. Reemplaza todo y publica.

```powershell
Get-Content -Raw -Encoding UTF8 ".\supabase\heda-ai-dashboard.ts" | Set-Clipboard
```

Reemplaza **heda-ai → Code → index.ts** y publica.

```powershell
Get-Content -Raw -Encoding UTF8 ".\supabase\heda-notify-dashboard.ts" | Set-Clipboard
```

Crea una Edge Function **heda-notify**, pega en `index.ts` y publica. En las tres deja **Verify JWT with legacy secret desactivado**: las rutas de usuario exigen sesión con `withSupabase` y comprueban la cuenta activa; el procesamiento programado exige una clave de servidor aparte. No pongas la service_role en la app ni en los encabezados de los usuarios.

## 3. Publicar la web y verificar funciones básicas

```powershell
npm run build:web
```

Sube **dist** al proyecto existente de Netlify. Incluye el service worker `heda-push-sw.js`, fuentes e iconos. No se requiere instalar Python en cada equipo para ejecutar la app. Recarga la web.

Comprueba antes de configurar notificaciones:

- Ethereum muestra fuente real, fecha del último cierre UTC y tendencias a 1/7 días. Yahoo tiene dos puntos de consulta; si falla o está atrasado se prueba Coinbase. Si también falla se conserva una consulta válida o se marca la histórica. Coinbase es una fuente distinta: la evaluación con Yahoo no valida automáticamente su distribución de volumen/precio.
- Presupuestos: crear límite mensual o vigencia personalizada; solo cuentan gastos de esa categoría dentro del periodo y hasta hoy. Un presupuesto por categoría; para un nuevo periodo edita ese límite.
- Educación: catálogo administrable, recomendaciones por reglas explicables según nivel, prioridad y registros; avance sincronizado. No es un recomendador aprendido ni mide por sí solo la eficacia educativa.
- QR: crear referencia de 7 días, verificar @emisor al recibir, elegir ingreso/gasto y confirmar. La importación es idempotente por receptor y referencia; el emisor no registra un gasto automáticamente. Historial con referencia, participantes y estado. Cancelar impide importaciones nuevas; no borra las ya confirmadas. Es un intercambio académico de registros, no un pago o banco.

## 4. Crear tu cuenta de administrador

Todavía no se eligió una cuenta: el responsable solo tenía cuentas de prueba. Crea primero tu cuenta propia de HEDA con un @usuario que reconozcas.

En SQL Editor puedes revisar los identificadores:

```sql
select id, username, full_name from public.profiles order by created_at desc;
```

Cuando hayas identificado tu cuenta, sustituye el UUID de esta plantilla antes de ejecutarla:

```sql
insert into public.heda_staff(user_id)
values ('AQUI_EL_UUID_DE_TU_CUENTA'::uuid)
on conflict do nothing;
```

No uses el UUID de una cuenta ajena o de un amigo. No hay autoasignación desde registro ni metadatos editables. Vuelve a abrir HEDA: **Perfil → Administrar HEDA**. Puedes ver métricas agregadas, habilitar/deshabilitar cuentas que no sean administradoras y crear/editar/desactivar lecciones y preguntas. No puede deshabilitarse a sí mismo ni a otro administrador desde esta pantalla.

Deshabilitar bloquea el acceso a datos y funciones de HEDA; no elimina la cuenta ni borra sus registros. No cambia las credenciales de Google. La pantalla informa de la deshabilitación cuando vuelve a comprobar la cuenta. Los avisos locales ya programados en un dispositivo cerrado no se revocan remotamente de inmediato.

## 5. Recordatorios en app nativa

En **Alertas → Recordarme en este teléfono**, concede permiso y pulsa **Probar aviso**. Bloquea el teléfono y comprueba el aviso de prueba de 10 segundos. Los de fechas se programan a las 9:00, un día antes y el día indicado (máximo 60 pendientes). Abrir el aviso no confirma movimientos ni realiza pagos.

Presupuestos, patrones y recomendaciones se revisan al abrir/actualizar la app; pueden emitir avisos locales nuevos sin repetir los ya mostrados en ese dispositivo. Con la app nativa cerrada no se descargan nuevos precios o movimientos de otros dispositivos: hay que abrirla para renovar esos cálculos. La programación de fechas ya realizada sí la entrega el sistema sin mantener la app abierta.

## 6. Avisos web con HEDA cerrada

Esta parte requiere configuración de servidor, además de publicar SQL 014 y heda-notify. La suscripción del usuario por sí sola no activa la tarea.

Genera las claves **una sola vez en tu PC**:

```powershell
npx --yes web-push@3.6.7 generate-vapid-keys --json
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

La primera orden muestra publicKey/privateKey VAPID; la segunda genera una clave aleatoria para la tarea. **No las pegues en el chat, no las subas a Git y no las pongas en EXPO_PUBLIC_*.** Guarda en **Supabase → Edge Functions → Secrets**:

| Nombre | Valor |
|---|---|
| HEDA_VAPID_PUBLIC_KEY | publicKey generada |
| HEDA_VAPID_PRIVATE_KEY | privateKey generada |
| HEDA_VAPID_SUBJECT | mailto:tu_correo_de_contacto |
| HEDA_NOTIFICATION_WORKER_KEY | Clave de 64 caracteres generada por la segunda orden |

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` son secretos reservados del servidor; no los copies al frontend. El worker utiliza el rol de servicio solo internamente para generar avisos y enviarlos a suscripciones autorizadas.

Supabase → **Integrations → Cron**: habilita Cron y crea una tarea de **HTTP request** cada **15 minutos**:

- Método: POST.
- URL: `https://ixzqwihpdvwnmawztret.supabase.co/functions/v1/heda-notify`.
- Encabezados: `Content-Type: application/json` y `x-heda-worker: TU_CLAVE_DE_TAREA`.
- Body: `{}`.

La clave es la misma que guardaste en HEDA_NOTIFICATION_WORKER_KEY; consérvala en la configuración privada de la tarea. No uses la clave service_role para llamar al worker. Revisa el historial de ejecuciones: debe devolver `ok: true`. `accepted` significa que un servicio push aceptó el envío, no prueba de que el usuario lo haya leído. `failed` o `generationErrors` requieren revisar configuración y conexión.

En HEDA → **Alertas → Activar avisos web**. Acepta el permiso. En iPhone/iPad con soporte Web Push, primero agrega HEDA a Inicio y ábrela desde su icono; no requiere pagar Apple Developer. Luego configura un caso de prueba (meta o programación próxima), cierra HEDA y comprueba la entrega tras la ejecución de la tarea. El sistema puede retrasarla.

Ethereum tiene un interruptor opcional: cambios diarios de al menos 5% entre apertura y cierre, con fecha/fuente. No son noticias inventadas ni señales de inversión. Requiere datos actualizados; no se generan avisos de mercado con una instantánea histórica.

El worker limita el piloto a 500 suscripciones consultadas, 20,000 filas por tabla/cuenta, lotes de 10 avisos y cinco intentos con separación de 10 minutos. Si se supera cobertura no inventa totales. No es una garantía de escalabilidad ilimitada. Las notificaciones externas contienen solo texto genérico; los detalles se ven dentro de la cuenta. Se eliminan suscripciones que el proveedor rechaza como vencidas (404/410). Puede haber duplicados si un proveedor acepta el envío justo antes de una caída y no se llega a guardar la confirmación.

## 7. Lo que se probó y lo que falta validar

Pruebas automatizadas: aislamiento de cuentas, administrador, suspensión, QR/idempotencia/participantes, vigencia, proveedores alternativos, equivalencia Python/JavaScript, suscripciones sin destinos privados, reclamación de avisos y autenticación del worker. Exportación web/móvil y revisión de interfaz con backend simulado en claro/oscuro. No se enviaron avisos reales ni se aplicaron migraciones remotas durante esas pruebas.

Después de publicar faltan las comprobaciones reales de esta guía en tus dispositivos, la validación científica prospectiva de Ethereum y el piloto/rendimiento/documentación final del TT. Tener código implementado no acredita todavía esos resultados.

Fuentes técnicas: https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles · https://supabase.com/docs/guides/cron · https://github.com/web-push-libs/web-push · https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
