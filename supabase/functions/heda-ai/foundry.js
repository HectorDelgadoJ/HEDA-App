// Server-only adapter. Never import this module from the React Native app.
export function createFoundryClient(env, fetcher = fetch) {
  let cachedToken;
  async function token() {
    if (cachedToken && cachedToken.until > Date.now() + 60000) return cachedToken.value;
    const tenant = env('AZURE_TENANT_ID');
    const client = env('AZURE_CLIENT_ID');
    const secret = env('AZURE_CLIENT_SECRET');
    if (!tenant || !client || !secret) throw new Error('AZURE_NOT_CONFIGURED');
    if (!/^[a-zA-Z0-9.-]+$/.test(tenant)) throw new Error('AZURE_NOT_CONFIGURED');
    const response = await fetcher(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: 'POST', signal: AbortSignal.timeout(10000),
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: client, client_secret: secret, scope: 'https://ai.azure.com/.default' }),
    });
    if (!response.ok) throw new Error('AZURE_AUTH_ERROR');
    const data = await response.json();
    if (!data.access_token) throw new Error('AZURE_AUTH_ERROR');
    cachedToken = { value: data.access_token, until: Date.now() + Number(data.expires_in || 300) * 1000 };
    return cachedToken.value;
  }
  return async function ask(message) {
    const endpoint = env('FOUNDRY_PROJECT_ENDPOINT');
    const agent = env('FOUNDRY_AGENT_NAME');
    if (!endpoint || !agent) throw new Error('AZURE_NOT_CONFIGURED');
    let url;
    try { url = new URL(endpoint); } catch { throw new Error('AZURE_NOT_CONFIGURED'); }
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.services.ai.azure.com') || !/^\/api\/projects\/[^/]+\/?$/.test(url.pathname) || url.search || url.hash || url.username || url.password) throw new Error('AZURE_NOT_CONFIGURED');
    const bearer = await token();
    const response = await fetcher(`${endpoint.replace(/\/$/, '')}/agents/${encodeURIComponent(agent)}/endpoint/protocols/openai/responses?api-version=v1`, {
      method: 'POST', signal: AbortSignal.timeout(50000),
      headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
      // A separate request per question avoids sharing conversation IDs between app users.
      body: JSON.stringify({ input: [{ role: 'user', content: message }] }),
    });
    if (response.status === 401) { cachedToken = null; throw new Error('AZURE_AUTH_ERROR'); }
    if (response.status === 403) throw new Error('AZURE_PERMISSION_ERROR');
    if (response.status === 404) throw new Error('AZURE_AGENT_NOT_FOUND');
    if (response.status === 429) throw new Error('AI_RATE_LIMIT');
    if (!response.ok) throw new Error('AI_PROVIDER_ERROR');
    const data = await response.json();
    if (data.status && data.status !== 'completed') throw new Error('AI_INCOMPLETE');
    const parts = (data.output || []).filter(item => item.type === 'message' && item.role === 'assistant').flatMap(item => item.content || []);
    const text = parts.filter(part => part.type === 'output_text').map(part => part.text || '').join('\n').trim();
    if (!text) throw new Error('AI_EMPTY_RESPONSE');
    const sources = [];
    for (const part of parts) for (const annotation of part.annotations || []) {
      if (annotation.type !== 'url_citation' || typeof annotation.url !== 'string') continue;
      try {
        const link = new URL(annotation.url);
        if (link.protocol !== 'https:' || sources.some(source => source.url === link.href)) continue;
        sources.push({ url: link.href, title: String(annotation.title || link.hostname).slice(0, 200) });
      } catch { /* Ignore malformed links, never execute them. */ }
    }
    return { ok: true, message: text, sources, agent: { name: agent, provider: 'Microsoft Foundry' } };
  };
}

export function foundryError(error) {
  const errors = {
    AZURE_NOT_CONFIGURED: [503, 'Falta configurar la conexión con Foundry en Supabase.'],
    AZURE_AUTH_ERROR: [503, 'Revisa la identidad y el secreto de Azure configurados en Supabase.'],
    AZURE_PERMISSION_ERROR: [503, 'La identidad de HEDA no tiene permiso para usar el agente en Azure.'],
    AZURE_AGENT_NOT_FOUND: [503, 'Revisa el punto de conexión y el nombre del agente en Supabase.'],
    AI_RATE_LIMIT: [429, 'Se alcanzó el límite de consultas. Espera un momento antes de reintentar.'],
    AI_INCOMPLETE: [502, 'La respuesta quedó incompleta. Intenta con una pregunta más breve.'],
    AI_EMPTY_RESPONSE: [422, 'No se generó una respuesta. Prueba reformular tu pregunta.'],
  };
  if (['TimeoutError', 'AbortError'].includes(error?.name)) return { status: 504, message: 'La respuesta tardó demasiado. Puedes reintentar.', code: 'AI_TIMEOUT' };
  const [status, message] = errors[error?.message] || [502, 'No pudimos conectar con el asistente. Revisa tu conexión e inténtalo de nuevo.'];
  return { status, message, code: Object.hasOwn(errors, error?.message) ? error.message : 'AI_PROVIDER_ERROR' };
}
