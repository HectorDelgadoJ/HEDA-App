import {readFileSync,writeFileSync} from 'node:fs';
const handler=readFileSync(new URL('../supabase/functions/delete-account/handler.js',import.meta.url),'utf8');
const entry=readFileSync(new URL('../supabase/functions/delete-account/index.ts',import.meta.url),'utf8').replace('import { handleDeleteAccount, readDeleteBody } from "./handler.js";','');
writeFileSync(new URL('../supabase/delete-account-dashboard.ts',import.meta.url),'// Edge Function delete-account. Paste into Edge Functions, not SQL Editor.\n'+handler+'\n'+entry);
