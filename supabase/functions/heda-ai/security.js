export async function reserveAIQuota(client,kind){
  const {data,error}=await client.rpc('heda_take_ai_quota',{p_kind:kind});
  if(error || typeof data?.allowed!=='boolean')throw new Error('AI_LIMITS_UNAVAILABLE');
  if(!data.allowed){
    const codes={AI_GLOBAL_LIMIT:'Se alcanzó el límite diario compartido de HEDA IA. Tus registros siguen disponibles; prueba mañana.',AI_USER_DAILY_LIMIT:'Alcanzaste tu límite diario de HEDA IA. Puedes volver a consultar después del reinicio diario UTC.',AI_USER_MINUTE_LIMIT:'Has consultado varias veces seguidas. Espera un momento antes de volver a intentar.'};
    const failure=new Error(codes[data.code]||'Se alcanzó el límite de consultas. Inténtalo más tarde.');
    failure.status=429;failure.code=Object.hasOwn(codes,data.code)?data.code:'AI_RATE_LIMIT';failure.retryAfter=Math.min(86400,Math.max(1,Number(data.retryAfter)||60));throw failure;
  }
  return data;
}
export async function readHedaRequest(req,maxBytes=65536){
  const fail=(status,message)=>{const error=new Error(message);error.status=status;error.code='INVALID_REQUEST';return error;};
  if(!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')||''))throw fail(415,'Envía una solicitud JSON.');
  if(Number(req.headers.get('content-length'))>maxBytes)throw fail(413,'La solicitud es demasiado grande. Inicia una conversación nueva.');
  const reader=req.body?.getReader();if(!reader)throw fail(400,'La solicitud está vacía.');
  const chunks=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw fail(413,'La solicitud es demasiado grande. Inicia una conversación nueva.');}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{throw fail(400,'La solicitud no es válida.');}
  if(!body || typeof body!=='object' || Array.isArray(body))throw fail(400,'La solicitud no es válida.');return body;
}

export async function assertAIAdult(client){
 const {data,error}=await client.rpc('heda_ai_age_eligible');
 if(data===true&&!error)return;
 const failure=new Error(error?'No pudimos comprobar tu edad. Actualiza HEDA y revisa tu perfil.':data===false?'El asistente de Gemini está disponible a partir de los 18 años. Puedes seguir usando los registros y las herramientas de HEDA.':'Completa tu fecha de nacimiento en Perfil antes de usar el asistente.');
 failure.status=error?503:403;failure.code=error?'AI_AGE_UNAVAILABLE':data===false?'AI_AGE_RESTRICTED':'AI_AGE_REQUIRED';throw failure;
}
