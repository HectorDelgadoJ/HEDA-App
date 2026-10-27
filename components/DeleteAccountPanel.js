import {Modal, Text, TouchableOpacity} from './AccessiblePrimitives';
import {Alert} from '../services/alerts';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {View, ScrollView, KeyboardAvoidingView, Platform} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Ionicons} from '@expo/vector-icons';
import {AuthField,AuthButton,AuthNotice} from './AuthFields';
import AuthCaptcha,{useAuthCaptcha} from './AuthCaptcha';
import HedaBrand from './HedaBrand';
import InfoButton from './InfoButton';
import {useThemeStyles} from '../theme/ThemeProvider';
import {supabase} from '../services/supabase';
import {invokeAccountDeletion,finishDeletedAccount} from '../services/accountDeletion';
import {cancelAccountReminders} from '../services/phoneReminders';
import {dismissAuthKeyboard} from '../services/keyboard';
export default function DeleteAccountPanel({ownerId,email,onClose}){
 const {colors}=useThemeStyles(),captcha=useAuthCaptcha();
 const [code,setCode]=useState(''),[confirmation,setConfirmation]=useState(''),[sent,setSent]=useState(false),[loading,setLoading]=useState(false),[failure,setFailure]=useState(''),[remaining,setRemaining]=useState(0);
 const busy=useRef(false),active=useRef(true),deadline=useRef(0);
 useEffect(()=>{active.current=true;const timer=setInterval(()=>{if(active.current)setRemaining(Math.max(0,Math.ceil((deadline.current-Date.now())/1000)));},1000);return()=>{active.current=false;clearInterval(timer);};},[]);
 const changeCode=useCallback(value=>{setCode(value);setFailure('');},[]);
 const changeConfirmation=useCallback(value=>{setConfirmation(value);setFailure('');},[]);
 function close(){if(!busy.current){dismissAuthKeyboard();onClose();}}
 async function run(action){if(busy.current)return;busy.current=true;setLoading(true);setFailure('');dismissAuthKeyboard();try{await action();}catch(error){if(active.current){setFailure(error.message);if(error.retryAfter){deadline.current=Date.now()+60000;setRemaining(60);}}}finally{busy.current=false;if(active.current)setLoading(false);}}
 function send(){if(remaining)return;if(captcha.required&&!captcha.token){setFailure('Completa la verificación de seguridad.');return;}return run(async()=>{try{await invokeAccountDeletion(supabase,ownerId,{action:'send_code',...(captcha.token?{captchaToken:captcha.token}:{})});if(active.current){setSent(true);setCode('');deadline.current=Date.now()+60000;setRemaining(60);}}finally{captcha.reset();}});}
 function remove(){if(!sent||confirmation!=='ELIMINAR'||!/^\d{6,10}$/.test(code.replace(/\s/g,'')))return;return run(async()=>{
  await invokeAccountDeletion(supabase,ownerId,{action:'delete',confirmation,code:code.replace(/\s/g,'')});
  if(active.current){setCode('');setConfirmation('');}
  const warnings=await finishDeletedAccount(supabase,ownerId,{storage:AsyncStorage,cancelReminders:cancelAccountReminders});
  Alert.alert('Cuenta eliminada','Se eliminaron tu cuenta y tus registros de HEDA.'+(warnings.length?' '+warnings.join(' '):''));
  if(active.current)onClose();
 });}
 const section={color:colors.ink,fontSize:16,lineHeight:25,marginTop:16},canDelete=sent&&confirmation==='ELIMINAR'&&/^\d{6,10}$/.test(code.replace(/\s/g,''));
 return <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={close}><SafeAreaProvider><SafeAreaView style={{flex:1,backgroundColor:colors.background}}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
 <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,paddingTop:8,paddingBottom:12,borderBottomWidth:1,borderBottomColor:colors.border}}><HedaBrand size={32}/><TouchableOpacity accessibilityRole="button" accessibilityLabel="Cancelar eliminación de cuenta" disabled={loading} onPress={close} style={{minHeight:48,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:5,borderRadius:12,backgroundColor:colors.softBlue}}><Ionicons accessible={false} name="close" size={22} color={colors.link}/><Text style={{color:colors.link,fontWeight:'600'}}>Cerrar</Text></TouchableOpacity></View>
 <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{padding:20,paddingBottom:36}}>
 <Text accessibilityRole="header" style={{fontSize:26,lineHeight:33,color:colors.ink,fontWeight:'700'}}>Eliminar mi cuenta</Text>
 <View style={{backgroundColor:colors.expenseSurface,borderWidth:1,borderColor:colors.expense,borderRadius:16,padding:16,marginVertical:18}}><Text style={{color:colors.expense,fontSize:16,fontWeight:'700',lineHeight:24}}>Esta acción no se puede deshacer.</Text><Text style={{color:colors.ink,fontSize:15,lineHeight:23,marginTop:8}}>Se eliminarán tu perfil, movimientos, tarjetas, pagos programados, metas, presupuestos y preferencias de HEDA.</Text></View>
 <Text style={[section,{marginTop:0,marginBottom:18}]}>Confirma que esta cuenta es tuya con un código enviado a {email}.</Text>
 <AuthNotice text={failure}/>
 {sent?<><AuthNotice success text="Si el correo llegó, escribe el código más reciente. Revisa también Spam."/><AuthField label="Código del correo" placeholder="Código numérico" value={code} onChangeText={changeCode} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={10} editable={!loading}/><AuthField label="Escribe ELIMINAR para confirmar" placeholder="ELIMINAR" value={confirmation} onChangeText={changeConfirmation} autoCapitalize="characters" maxLength={8} editable={!loading}/></>:null}
 <AuthCaptcha captcha={captcha}/><AuthButton secondary loading={loading&&!sent} label={remaining?`Pedir otro código en ${remaining} s`:sent?'Reenviar código':'Enviar código a mi correo'} disabled={loading||!!remaining} onPress={send}/>
 {sent?<TouchableOpacity accessibilityRole="button" accessibilityState={{disabled:loading||!canDelete,busy:loading}} disabled={loading||!canDelete} onPress={remove} style={{minHeight:54,alignItems:'center',justifyContent:'center',padding:14,borderRadius:14,marginTop:20,backgroundColor:colors.dark?'#A6223D':'#B42332',opacity:loading||!canDelete?0.5:1}}><Text style={{fontSize:16,fontWeight:'700',color:'#FFFFFF'}}>{loading?'Procesando…':'Eliminar mi cuenta definitivamente'}</Text></TouchableOpacity>:null}
 <AuthButton secondary label="Conservar mi cuenta" disabled={loading} onPress={close}/>
 <InfoButton title="Alcance de la eliminación" text="Se borran los datos activos de tu cuenta en HEDA y se limpian los avisos y preferencias locales de este dispositivo. Las copias de seguridad, registros técnicos y datos que ya hayan recibido otros proveedores tienen sus propias políticas de conservación. Esto no cancela suscripciones ni pagos reales fuera de HEDA."/>
 </ScrollView></KeyboardAvoidingView></SafeAreaView></SafeAreaProvider></Modal>;
}
