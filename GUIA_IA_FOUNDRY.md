> Ruta alternativa archivada: la integración activa de HEDA utiliza Gemini. Consulta GUIA_IA_GEMINI.md.

# Conectar HEDA con el agente guardado en Microsoft Foundry

Estado: integración preparada en código, pendiente de credenciales, despliegue y prueba real. No basta con guardar el agente en el portal.

## Arquitectura

App con sesión Supabase → Edge Function heda-ai autenticada → Microsoft Entra → endpoint del agente heda-asistente en Foundry.

El servidor envía solo la pregunta escrita; no lee movimientos, metas ni datos de cuenta. El agente utiliza las instrucciones y herramientas guardadas en Foundry, incluida Búsqueda Web si está habilitada. Las consultas web tienen costo adicional. No se comparten conversaciones entre usuarios: esta primera versión responde preguntas independientes. Foundry puede almacenar y registrar las solicitudes conforme a su configuración y condiciones; no implica ausencia de retención.

## 1. Crear la identidad de servidor

En https://portal.azure.com abre Microsoft Entra ID → Registros de aplicaciones → Nuevo registro.
- Nombre: HEDA-Supabase.
- Selecciona solo cuentas del directorio de la escuela (un solo inquilino).
- No hace falta URI de redirección para este flujo servidor a servidor.
- Registra y anota el Id. de aplicación (cliente) y el Id. de directorio (inquilino).
- En Certificados y secretos crea un secreto de cliente con vencimiento apropiado para el prototipo. Copia su VALOR al guardarlo, no su identificador. Guárdalo directamente en Supabase Secrets; no lo envíes al chat ni a Git.

Si el directorio escolar impide registrar aplicaciones o asignar permisos, solicita al administrador una identidad aprobada. El código de DefaultAzureCredential no elimina esos requisitos. No uses un token temporal de az login como solución permanente.

## 2. Dar permiso para invocar el agente

En el recurso/proyecto Foundry, abre Control de acceso (IAM) y agrega una asignación a HEDA-Supabase de Foundry Agent Consumer, limitada al proyecto TT2Vicente (o al agente si tu configuración lo permite). No necesita Contributor ni Owner. Si el rol o el alcance no aparecen, comprueba con el administrador los permisos y la versión del portal. Espera unos minutos por la propagación.

Referencia: https://learn.microsoft.com/en-us/azure/foundry/concepts/rbac-foundry

## 3. Configurar Supabase Secrets

En tu proyecto Supabase → Edge Functions → Secrets agrega:

| Nombre | Valor |
|---|---|
| FOUNDRY_PROJECT_ENDPOINT | https://tt2vicente-resource.services.ai.azure.com/api/projects/TT2Vicente |
| FOUNDRY_AGENT_NAME | heda-asistente |
| AZURE_TENANT_ID | Id. de directorio (inquilino) |
| AZURE_CLIENT_ID | Id. de aplicación (cliente) |
| AZURE_CLIENT_SECRET | VALOR del secreto de cliente |
| HEDA_AI_ENABLED | true |

Estas variables son exclusivas del servidor. No las añadas a .env.local del móvil ni uses EXPO_PUBLIC. No hace falta modificar package.json ni instalar librerías Azure en React Native.

## 4. Actualizar la función

En el editor de Edge Functions de Supabase abre heda-ai. Actualiza los archivos index.ts y deno.json con sus versiones de supabase/functions/heda-ai y agrega foundry.js a la misma carpeta. Usa Deploy para publicar. Conserva la autenticación de usuario existente: auth: user en withSupabase. El código no solicita cambiar la verificación del gateway.

Para copiar cada archivo desde PowerShell en la carpeta del proyecto:

```powershell
Get-Content -Raw -Encoding utf8 .\supabase\functions\heda-ai\index.ts | Set-Clipboard
Get-Content -Raw -Encoding utf8 .\supabase\functions\heda-ai\foundry.js | Set-Clipboard
Get-Content -Raw -Encoding utf8 .\supabase\functions\heda-ai\deno.json | Set-Clipboard
```

Ejecuta UNO a la vez y pega el contenido en su archivo correspondiente antes de ejecutar el siguiente. Esto va en Edge Functions, no en SQL Editor. No requiere SQL nuevo.

Si prefieres la CLI, con el proyecto correcto vinculado: npx supabase functions deploy heda-ai. El editor debe admitir el módulo @supabase/server que ya usaba la función; revisa los logs de despliegue si falla la carga de imports.

## 5. Probar

Recarga HEDA con sesión iniciada:
1. Pregunta un concepto financiero; debe responder, sin devolver el texto de prueba v0.1.
2. Pregunta por el precio actual de una cripto; si usa web, debe citar fuentes y fecha. La app muestra las fuentes recibidas del agente.
3. Pregunta por tus gastos; debe aclarar que no los puede consultar.
4. Haz una pregunta fuera del alcance; debe redirigir.
5. Dos toques rápidos en Enviar no deben crear dos solicitudes.

El nombre del agente se configura desde Supabase, no se acepta desde el móvil. Las instrucciones se mantienen en Foundry y deben guardarse en la versión activa.

## Diagnóstico

- 401 de Supabase: sesión o configuración de autenticación; no desactives validaciones sin revisar el motivo.
- AZURE_NOT_CONFIGURED: faltan secretos o el endpoint tiene un formato incorrecto.
- AZURE_AUTH_ERROR: inquilino/cliente/secreto equivocado, vencido o política del directorio.
- AZURE_PERMISSION_ERROR: falta rol de invocación o aún no se propagó.
- AZURE_AGENT_NOT_FOUND: endpoint o nombre incorrecto, o agente no disponible en esa ruta.
- AI_RATE_LIMIT: cuota de Azure/Bing; espera y revisa consumo.
- AI_INCOMPLETE: respuesta incompleta del proveedor.
- AI_TIMEOUT: proveedor o búsqueda tardó demasiado. No hay reintento automático para evitar duplicar consumo.

Las pruebas locales simulan Microsoft: verifican rutas, separación entre preguntas, autenticación de servidor, citas y errores. No demuestran acceso real al directorio escolar. Antes de abrir la app al público, añade límites persistentes de consultas por usuario y presupuesto de consumo en el servidor.

API del agente: https://learn.microsoft.com/en-us/azure/foundry/agents/quickstarts/prompt-agent
