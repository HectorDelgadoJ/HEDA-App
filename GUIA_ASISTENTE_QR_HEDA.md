# Asistente con acciones y movimientos por QR

Entrega preparada el 25 de octubre de 2026. No se ejecutó SQL ni se desplegó en Supabase desde el agente. Las pruebas de modelo se hicieron con respuestas simuladas, sin consumir Gemini real.

## Aplicar la actualización, en orden

Requiere las migraciones 001–011 anteriores.

1. **En PowerShell de tu PC**, copia el SQL:

```powershell
Get-Content -Raw -Encoding UTF8 "C:\Users\vicda\OneDrive\Documents\GitHub\HEDA-App\supabase\migrations\202610250012_assistant_actions.sql" | Set-Clipboard
```

2. **En Supabase → SQL Editor → New query**, pega con Ctrl+V y pulsa Run. El editor debe recibir texto que empieza con `-- After 001-011`, nunca el comando Get-Content. La migración añade comprobantes técnicos y una función autenticada de confirmación. No elimina ni modifica registros financieros existentes.
3. **De nuevo en PowerShell**, copia el código de la Edge Function:

```powershell
Get-Content -Raw -Encoding UTF8 "C:\Users\vicda\OneDrive\Documents\GitHub\HEDA-App\supabase\heda-ai-dashboard.ts" | Set-Clipboard
```

4. **En Supabase → Edge Functions → heda-ai → Code → index.ts**, reemplaza todo y pulsa Deploy updates. Este editor recibe TypeScript, no SQL ni comandos PowerShell. Conserva los secrets y autenticación actuales. No hay nuevas claves que configurar.
5. **En Netlify**, sube toda la nueva carpeta dist al mismo proyecto heda-app. No crees otro sitio. Para reconstruir: npm ci y npm run build:web.
6. Para la app nativa, reinicia Expo con caché limpia. Una app compilada requiere nueva compilación para incorporar expo-camera/react-native-svg y sus permisos. La web requiere HTTPS para cámara; también admite cargar una imagen o pegar el código.

## Qué demuestra la IA

- Preguntas sobre registros propios: saldo, categorías, historial reciente, deudas, fechas de tarjetas, metas, presupuestos, recurrentes, perfil básico y preferencias.
- La primera consulta personal solicita **Permitir consultar mis datos**. El permiso dura solo ese chat, se limpia al salir o iniciar una conversación nueva y se limita a la cuenta autenticada.
- Se excluyen correo, fecha de nacimiento exacta y notas. Se comparten nombre/@usuario, edad calculada, ocupación, preferencias básicas, importes, categorías, fechas y nombres/IDs internos de tarjetas y metas. La UI explica el envío a Gemini y su cuota gratuita antes de autorizar.
- Hasta 500 filas de detalle por sección; movimientos ordenados por fecha reciente. El resumen de totales se calcula por separado con el límite existente de 20 mil registros. No se debe afirmar cobertura completa cuando falta detalle.
- La búsqueda web no recibe contexto de cuenta. Si GEMINI_SEARCH_ENABLED está activado, una respuesta pública sin datos ni propuestas puede realizar una segunda consulta web; ambas llamadas consumen la cuota de uso de HEDA.
- Propuestas soportadas: ingreso/gasto en Mi saldo; gasto en tarjeta propia verificada; meta con fecha opcional; presupuesto mensual nuevo; programación recurrente con intervalo personalizado.
- Ejemplos: “Registra un gasto de 150 en Comida hoy”, “Crea una meta Laptop de 12000 para el 30 de junio de 2027”, “Crea un presupuesto mensual de 2000 para Transporte”, “Programa renta de 5000 en Hogar cada mes desde el 1 de noviembre”. Si falta un dato importante o una tarjeta es ambigua, debe preguntar.
- **Confirmar y guardar** ejecuta el cambio; Descartar no guarda nada. La propuesta, modelo y texto no se consideran prueba de que algo se guardó. Los reintentos de la misma confirmación reutilizan ID y son idempotentes en PostgreSQL.
- No ejecuta pagos, transferencias ni borrados; no modifica presupuestos existentes ni confirma cargos recurrentes ocurridos. Esas operaciones siguen en sus pantallas. No puede contestar información que no está registrada, ni garantiza responder literalmente cualquier cosa.
- Edad de Gemini: conserva la comprobación de mayores de 18 años en servidor.

## QR para el TT

Herramientas → Compartir por QR. Genera un QR con tipo, monto, categoría, concepto opcional y fecha. Crear el código no guarda nada. Puede mostrarse en pantalla o compartirse como texto. Otra persona lo escanea, carga una imagen en web o pega el código y revisa antes de confirmar. Se copia como movimiento de Mi saldo, no como transferencia entre cuentas.

No incluye identidad ni credenciales. No valida al emisor y cualquiera que vea el QR puede leerlo. No abre enlaces externos ni acepta datos bancarios/IDs de tarjetas o cuentas. El mismo QR en la misma cuenta no vuelve a insertarse al reintentar; otro usuario puede importar su propia copia. Generar otro QR representa otro registro potencial.

## Prueba real tras desplegar

1. Pregunta “¿Cuánto tengo y cuáles son mis metas?”; cancela el permiso y comprueba que no afirma haber leído la cuenta. Autoriza en un nuevo intento y contrasta con Inicio/Reportes.
2. Solicita un gasto, revisa monto/tipo/fecha, descarta y comprueba que no existe; luego crea otro y confirma una vez. Revisa Historial.
3. Crea una meta, presupuesto y recurrente; revisa sus pantallas. La programación no debe aparecer como pago ocurrido.
4. Genera un QR en un dispositivo y escanéalo en otro. Verifica que nada se guarda hasta confirmar y que repetir la misma confirmación no duplica.
5. Prueba rechazo de un QR externo, datos inválidos, cámara denegada y cambio de cuenta.
6. Comprueba iPhone/Safari y Android físicos. La prueba de cámara física queda pendiente; se verificó la decodificación real de una imagen QR en navegador.

## Justificación para el TT

La IA interpreta lenguaje natural mediante funciones acotadas; el servidor recupera datos propios y valida propuestas. La persona confirma y PostgreSQL aplica la acción de forma atómica. El QR facilita captura compartida sin integrar infraestructura bancaria. Se pueden medir tiempo para registrar, tasa de errores y comprensión de las confirmaciones frente al formulario manual.


## Ajuste de claridad y flujo de efectivo

QR ahora inicia con dos opciones: Compartir movimiento y Recibir movimiento. Crear QR reutiliza categorías y calendario; el código de texto queda oculto salvo que el usuario lo solicite. Al recibir se permite elegir Gasto o Ingreso desde la perspectiva de la propia cuenta antes de confirmar. No se ejecutan pagos bancarios.

El chat muestra Responde con mis datos. Una consulta como “¿Puedes decirme cómo va mi flujo de efectivo?” solicita permiso directamente si falta, sin depender de que el modelo elija pedirlo. Con permiso, el flujo del periodo actual se presenta desde los totales verificados: ingresos, gastos, pagos de tarjetas, cambio de saldo y saldo disponible. No confunde compras con tarjeta con salida inmediata de efectivo. No se inventa flujo real cero cuando no hay registros. Consultas de otros periodos o mezcladas con una acción mantienen la ruta del asistente con contexto.

Para aplicar este ajuste: actualizar heda-ai con el archivo regenerado y subir dist al mismo sitio. No se requiere SQL adicional si 012 ya fue ejecutado.
