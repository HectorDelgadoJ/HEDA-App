import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from './supabase';
import { oauthCode } from '../utils/oauth';
WebBrowser.maybeCompleteAuthSession();
export const googleRedirectUri=()=>Platform.OS==='web'?`${window.location.origin}/`:makeRedirectUri({scheme:'heda',path:'auth/callback'});
let pending=false;
const exchanging=new Map();
export async function completeGoogleSignIn(url){
  const code=oauthCode(url,googleRedirectUri());
  if(exchanging.has(code))return exchanging.get(code);
  const result=(async()=>{const {error}=await supabase.auth.exchangeCodeForSession(code);if(error)throw new Error('No pudimos completar el acceso con Google. Inicia el proceso otra vez.');})();
  exchanging.set(code,result);try{return await result;}finally{setTimeout(()=>exchanging.delete(code),60000);}
}
export async function signInWithGoogle(){
  if(pending)return;
  if(Platform.OS!=='web' && Constants.executionEnvironment==='storeClient')throw new Error('Para usar Google necesitas la app instalada o una versión de desarrollo. En Expo Go puedes entrar con correo y contraseña.');
  if(typeof globalThis.crypto?.getRandomValues!=='function'||typeof globalThis.crypto?.subtle?.digest!=='function'||typeof TextEncoder==='undefined')throw new Error('No está disponible el acceso seguro en este dispositivo. Actualiza la app e inténtalo de nuevo.');
  pending=true;
  try{
    const redirectTo=googleRedirectUri();
    const {data,error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo,skipBrowserRedirect:Platform.OS!=='web',scopes:'openid email profile',queryParams:{prompt:'select_account'}}});
    if(error||!data?.url)throw new Error('Google todavía no está disponible. Revisa su configuración en Supabase.');
    if(Platform.OS==='web')return;
    const result=await WebBrowser.openAuthSessionAsync(data.url,redirectTo);
    if(result.type==='cancel'||result.type==='dismiss')return {cancelled:true};
    if(result.type!=='success'||!result.url)throw new Error('No se completó el acceso con Google. Inténtalo de nuevo.');
    await completeGoogleSignIn(result.url);return {cancelled:false};
  }finally{pending=false;}
}
