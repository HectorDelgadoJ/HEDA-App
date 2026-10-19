import './nativeCrypto';
import 'react-native-url-polyfill/auto';
import {createClient} from '@supabase/supabase-js';
let instance=0;
export function createRecoveryClient({fetch}={}){
 return createClient(process.env.EXPO_PUBLIC_SUPABASE_URL,process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{
  ...(fetch?{global:{fetch}}:{}),
  auth:{storageKey:`heda-recovery-${++instance}`,persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,flowType:'implicit'}
 });
}
