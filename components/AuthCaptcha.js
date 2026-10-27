import {Text, TouchableOpacity} from './AccessiblePrimitives';
import React, { useEffect, useRef, useState } from 'react';
import {View, Platform} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Crypto from 'expo-crypto';
import { useThemeStyles } from '../theme/ThemeProvider';
const page=process.env.EXPO_PUBLIC_CAPTCHA_URL||'',siteKey=process.env.EXPO_PUBLIC_CAPTCHA_SITE_KEY||'';
export function useAuthCaptcha(){
  const [token,setToken]=useState(''),[nonce,setNonce]=useState(()=>Crypto.randomUUID());
  return {required:!!(page||siteKey),token,nonce,setToken,reset:()=>{setToken('');setNonce(Crypto.randomUUID());}};
}
export default function AuthCaptcha({captcha}){
  const {colors}=useThemeStyles(),frame=useRef(null),[problem,setProblem]=useState('');
  let target=null;try{target=new URL(page);if(target.protocol!=='https:'||target.username||target.password||!siteKey)target=null;else{target.searchParams.set('sitekey',siteKey);target.searchParams.set('nonce',captcha.nonce);}}catch{}
  useEffect(()=>{setProblem('');},[captcha.nonce]);
  function receive(raw){
    let data;try{data=typeof raw==='string'?JSON.parse(raw):raw;}catch{return;}
    if(data?.type!=='heda-captcha'||data.nonce!==captcha.nonce)return;
    if(data.error){captcha.setToken('');setProblem('No se completó la verificación. Pulsa Reintentar.');return;}
    captcha.setToken(typeof data.token==='string'&&data.token.length<=2048?data.token:'');
  }
  useEffect(()=>{
    if(Platform.OS!=='web'||!target)return;
    const listener=event=>{if(event.origin===target.origin && event.source===frame.current?.contentWindow)receive(event.data);};
    window.addEventListener('message',listener);return()=>window.removeEventListener('message',listener);
  },[captcha.nonce,target?.origin]);
  if(!captcha.required)return null;
  return <View style={{marginVertical:12,gap:8}}><Text style={{color:colors.ink,fontSize:14,fontWeight:'600'}}>Verificación de seguridad</Text>{!target?<Text style={{color:colors.muted,fontSize:14}}>La verificación todavía no está configurada. Inténtalo más tarde o continúa con Google.</Text>:Platform.OS==='web'?<iframe key={captcha.nonce} ref={frame} src={target.href} title="Verificación de seguridad" style={{width:'100%',height:180,border:0}}/>:<View style={{height:180}}><WebView key={captcha.nonce} source={{uri:target.href}} originWhitelist={['https://*']} javaScriptEnabled domStorageEnabled sharedCookiesEnabled={false} thirdPartyCookiesEnabled={false} onMessage={event=>{try{if(new URL(event.nativeEvent.url).origin===target.origin)receive(event.nativeEvent.data);}catch{}}} onError={()=>{captcha.setToken('');setProblem('No pudimos cargar la verificación. Revisa tu conexión.');}} onShouldStartLoadWithRequest={request=>{try{const link=new URL(request.url);return link.protocol==='https:'&&(link.origin===target.origin||request.isTopFrame===false&&link.hostname==='challenges.cloudflare.com');}catch{return false;}}}/></View>}
    {captcha.token?<Text style={{color:colors.link,fontSize:13}}>Verificación completada</Text>:null}{problem?<Text style={{color:colors.muted,fontSize:13}}>{problem}</Text>:null}
    <TouchableOpacity accessibilityRole="button" onPress={captcha.reset} style={{minHeight:44,justifyContent:'center',alignSelf:'flex-start',paddingHorizontal:8}}><Text style={{color:colors.link,fontWeight:'600'}}>Reintentar verificación</Text></TouchableOpacity>
  </View>;
}
