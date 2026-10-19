import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const adapter = readFileSync(new URL('supabase/functions/heda-ai/gemini.js', root), 'utf8').replace(/\r\n/g, '\n');
const summary = readFileSync(new URL('supabase/functions/heda-ai/financial-summary.js', root), 'utf8').replace(/\r\n/g, '\n');
const security = readFileSync(new URL('supabase/functions/heda-ai/security.js', root), 'utf8').replace(/\r\n/g, '\n');
const index = readFileSync(new URL('supabase/functions/heda-ai/index.ts', root), 'utf8').replace(/\r\n/g, '\n').replace('import { createGeminiClient, geminiError, validateChatHistory } from "./gemini.js";\n', '').replace('import { handleHedaBody } from "./financial-summary.js";\n', '').replace('import { reserveAIQuota, readHedaRequest, assertAIAdult } from "./security.js";\n', '');
writeFileSync(new URL('supabase/heda-ai-dashboard.ts', root), '// Generated from functions/heda-ai/index.ts and gemini.js. Copy this whole file into the Supabase Edge Function editor.\n' + adapter + '\n' + summary + '\n' + security + '\n' + index);
console.log('Archivo para Supabase actualizado.');
