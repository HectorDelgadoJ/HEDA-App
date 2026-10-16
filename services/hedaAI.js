import { supabase } from './supabase';

async function invokeHeda(body, { signal } = {}) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) throw new Error('Vuelve a iniciar sesión para usar HEDA IA.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(() => controller.abort(), 70000);
  try {
    const { data, error } = await supabase.functions.invoke('heda-ai', { body, signal: controller.signal });
    if (error) {
      let backend;
      try { backend = await error.context?.clone().json(); } catch {}
      if (error.context?.status === 404) throw new Error('Falta publicar la función heda-ai en Supabase.');
      if (error.context?.status === 401) throw new Error('Tu sesión venció. Vuelve a iniciar sesión.');
      const failure = new Error(backend?.message || 'No pudimos conectar con HEDA IA. Revisa tu conexión e inténtalo de nuevo.');
      failure.code = error.context?.status === 429 ? 'AI_RATE_LIMIT' : backend?.error || 'AI_CONNECTION_ERROR';
      failure.status = error.context?.status;
      throw failure;
    }
    if (!data?.ok) throw new Error(data?.message || 'El asistente no devolvió una respuesta válida.');
    return data;
  } catch (error) {
    if (signal?.aborted) { const cancelled = new Error('Consulta cancelada'); cancelled.name = 'AbortError'; throw cancelled; }
    if (controller.signal.aborted) throw new Error('La respuesta tardó demasiado. Inténtalo de nuevo.');
    throw error;
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
}

export async function sendMessageToHedaAI(message, history = [], { signal, summaryDigest } = {}) {
  const cleanMessage=typeof message==='string'?message.trim():'';
  if (!cleanMessage || cleanMessage.length>2000) throw new Error('Escribe una pregunta de hasta 2000 caracteres.');
  const data=await invokeHeda({message:cleanMessage,...(history.length?{history}:{}),...(summaryDigest?{financialConsent:true,summaryDigest}:{})},{signal});
  if (typeof data.message!=='string' || !data.message.trim()) throw new Error('El asistente no devolvió una respuesta válida.');
  if (data.agent?.version==='0.1.0') throw new Error('Supabase todavía tiene la función de prueba. Actualiza heda-ai para activar el asistente.');
  if (history.length && data.chatVersion!==1) throw new Error('Publica la versión de conversación de heda-ai en Supabase para usar preguntas de seguimiento.');
  if (summaryDigest && data.financialSummaryUsed!==true) throw new Error('Publica la versión de análisis financiero de heda-ai en Supabase.');
  return data;
}
export async function previewHedaFinances({signal}={}) {
  const data=await invokeHeda({action:'financial_preview'},{signal});
  if (data.financialVersion!==1 || !data.summary || typeof data.summaryDigest!=='string') throw new Error('Publica la versión de análisis financiero de heda-ai en Supabase.');
  return data;
}
