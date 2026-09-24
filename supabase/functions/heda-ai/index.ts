import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

/*
 * =====================================================
 * HEDA AI v0.1
 * =====================================================
 *
 * Estado actual:
 *
 * - Requiere usuario autenticado.
 * - NO accede todavía a información financiera.
 * - NO llama todavía a ningún modelo de IA.
 * - NO tiene acceso a Internet.
 * - NO modifica información.
 * - Incluye Kill Switch.
 *
 * Objetivo de esta versión:
 *
 * Comprobar de forma segura la comunicación:
 *
 * HEDA App
 *    ↓
 * Usuario autenticado
 *    ↓
 * Supabase Edge Function
 *    ↓
 * HEDA AI
 *
 * =====================================================
 */

// =====================================================
// KILL SWITCH
// =====================================================
//
// Si HEDA_AI_ENABLED=false en Supabase,
// el asistente deja de procesar solicitudes.
//
// Nunca debemos depender de la app para aplicar
// este apagado. Se controla desde el backend.
//

const HEDA_AI_ENABLED =
  Deno.env.get("HEDA_AI_ENABLED") !== "false";

// =====================================================
// LÍMITES
// =====================================================

const MAX_MESSAGE_LENGTH = 2000;

// =====================================================
// EDGE FUNCTION
// =====================================================

export default {
  fetch: withSupabase(
    {
      // Solo usuarios autenticados pueden utilizar
      // esta función.
      auth: "user",
    },

    async (req, ctx) => {
      // =================================================
      // 1. KILL SWITCH
      // =================================================

      if (!HEDA_AI_ENABLED) {
        return Response.json(
          {
            ok: false,
            error: "HEDA_AI_DISABLED",
            message:
              "El asistente de HEDA se encuentra temporalmente desactivado.",
          },
          {
            status: 503,
          }
        );
      }

      // =================================================
      // 2. SOLO PERMITIMOS POST
      // =================================================

      if (req.method !== "POST") {
        return Response.json(
          {
            ok: false,
            error: "METHOD_NOT_ALLOWED",
            message:
              "Método no permitido.",
          },
          {
            status: 405,
          }
        );
      }

      // =================================================
      // 3. IDENTIDAD AUTENTICADA
      // =================================================
      //
      // IMPORTANTE:
      //
      // El ID NO viene del body enviado por la app.
      // El usuario NO puede elegir qué userId consultar.
      //
      // La identidad proviene del contexto autenticado
      // creado por Supabase.
      //
      // ctx.userClaims.id corresponde al usuario
      // autenticado.
      //

      const userId = ctx.userClaims?.id;

      if (!userId) {
        return Response.json(
          {
            ok: false,
            error: "USER_NOT_FOUND",
            message:
              "No fue posible identificar al usuario autenticado.",
          },
          {
            status: 401,
          }
        );
      }

      // =================================================
      // 4. LEER BODY
      // =================================================

      let body;

      try {
        body = await req.json();
      } catch {
        return Response.json(
          {
            ok: false,
            error: "INVALID_JSON",
            message:
              "La solicitud enviada no contiene JSON válido.",
          },
          {
            status: 400,
          }
        );
      }

      // =================================================
      // 5. EXTRAER MENSAJE
      // =================================================

      const message = body?.message;

      // =================================================
      // 6. VALIDAR TIPO DE MENSAJE
      // =================================================

      if (typeof message !== "string") {
        return Response.json(
          {
            ok: false,
            error: "INVALID_MESSAGE",
            message:
              "Debes enviar un mensaje válido.",
          },
          {
            status: 400,
          }
        );
      }

      // =================================================
      // 7. LIMPIAR MENSAJE
      // =================================================

      const cleanMessage = message.trim();

      if (cleanMessage.length === 0) {
        return Response.json(
          {
            ok: false,
            error: "EMPTY_MESSAGE",
            message:
              "El mensaje no puede estar vacío.",
          },
          {
            status: 400,
          }
        );
      }

      // =================================================
      // 8. VALIDAR LONGITUD
      // =================================================

      if (cleanMessage.length > MAX_MESSAGE_LENGTH) {
        return Response.json(
          {
            ok: false,
            error: "MESSAGE_TOO_LONG",
            message:
              "El mensaje es demasiado largo.",
          },
          {
            status: 400,
          }
        );
      }

      // =================================================
      // 9. RESPUESTA TEMPORAL
      // =================================================
      //
      // En HEDA AI v0.1 todavía:
      //
      // ❌ NO llamamos a un LLM
      // ❌ NO consultamos gastos
      // ❌ NO consultamos ingresos
      // ❌ NO consultamos metas
      // ❌ NO usamos RAG
      // ❌ NO accedemos a Internet
      // ❌ NO modificamos Supabase
      //
      // Solo estamos comprobando que:
      //
      // usuario autenticado
      //        ↓
      // HEDA App
      //        ↓
      // Edge Function
      //        ↓
      // respuesta segura
      //
      // funciona correctamente.
      // =================================================

      return Response.json(
        {
          ok: true,

          agent: {
            name: "HEDA AI",
            version: "0.1.0",
          },

          message:
            "HEDA AI está funcionando correctamente.",

          receivedMessage: cleanMessage,

          security: {
            authenticated: true,
            financialDataAccess: false,
            writeAccess: false,
            externalInternetAccess: false,
          },
        },
        {
          status: 200,
        }
      );
    }
  ),
};