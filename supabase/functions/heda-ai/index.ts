import { withSupabase } from "npm:@supabase/server@1";
import { createGeminiClient, geminiError } from "./gemini.js";
import { handleHedaBody } from "./financial-summary.js";

const ask = createGeminiClient((name: string) => Deno.env.get(name));
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (status: number, body: Record<string, unknown>) => Response.json(body, { status, headers: cors });

const authenticated = withSupabase({ auth: "user" }, async (req, ctx) => {
  let body;
  try { body = await req.json(); } catch { return json(400, { ok: false, message: "La pregunta no es válida." }); }
  try {
    const result = await handleHedaBody(body, ctx, ask, Deno.env.get("HEDA_AI_ENABLED") !== "false");
    return json(result.status, result.body);
  } catch (error) {
    const failure = geminiError(error);
    return json(failure.status, { ok: false, error: failure.code, message: failure.message });
  }
});

// Preserve the existing Supabase user authentication; no gateway setting changes.
export default { fetch: (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json(405, { ok: false, message: "Método no permitido." });
  return authenticated(req);
} };
