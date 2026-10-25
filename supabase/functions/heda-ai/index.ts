import { createAgentClient, handleAgentBody } from "./agent.js";
import { withSupabase } from "npm:@supabase/server@1";
import { createGeminiClient, geminiError, validateChatHistory } from "./gemini.js";
import { handleHedaBody } from "./financial-summary.js";
import { reserveAIQuota, readHedaRequest, assertAIAdult } from "./security.js";

const ask = createGeminiClient((name: string) => Deno.env.get(name));
const askAgent = createAgentClient((name: string) => Deno.env.get(name));
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (status: number, body: Record<string, unknown>) => Response.json(body, { status, headers: cors });

const authenticated = withSupabase({ auth: "user" }, async (req, ctx) => {
  try {
    const body=await readHedaRequest(req);
    await assertAIAdult(ctx.supabase);
    if(body.action==='assistant'){
      if(Deno.env.get('HEDA_AI_ENABLED')==='false')return json(503,{ok:false,message:'El asistente está temporalmente desactivado.'});
      await reserveAIQuota(ctx.supabase,'chat');
      const agentResult=await handleAgentBody(body,ctx,askAgent);
      // Optional public web lookup never receives authorized account context or proposals.
      if(!agentResult.appDataUsed&&!agentResult.needsAppConsent&&!agentResult.proposals?.length&&Deno.env.get('GEMINI_SEARCH_ENABLED')==='true'){
        await reserveAIQuota(ctx.supabase,'chat');
        const publicAnswer=await ask(body.message,body.history||[]);
        return json(200,{...publicAnswer,agentVersion:1,proposals:[],appDataUsed:false});
      }
      return json(200,agentResult);
    }
    if(body.action===undefined)validateChatHistory(body.history);
    if(body.action==='financial_preview' && Deno.env.get('HEDA_AI_ENABLED')!=='false')await reserveAIQuota(ctx.supabase,'preview');
    const limitedAsk=async(...args: Parameters<typeof ask>)=>{await reserveAIQuota(ctx.supabase,'chat');return ask(...args);};
    const result = await handleHedaBody(body, ctx, limitedAsk, Deno.env.get("HEDA_AI_ENABLED") !== "false");
    return json(result.status, result.body);
  } catch (error) {
    const custom=error as {status?:number;code?:string;message?:string;retryAfter?:number};
    if(custom?.status && custom?.code)return Response.json({ok:false,error:custom.code,message:custom.message,...(custom.retryAfter?{retryAfter:custom.retryAfter}:{})},{status:custom.status,headers:{...cors,...(custom.retryAfter?{'Retry-After':String(custom.retryAfter)}:{})}});
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
