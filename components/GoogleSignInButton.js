import {Text, TouchableOpacity} from './AccessiblePrimitives';
import { dismissAuthKeyboard } from '../services/keyboard';
import React, { useRef, useState } from 'react';
import {View, ActivityIndicator} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStyles } from '../theme/ThemeProvider';
import { signInWithGoogle } from '../services/googleAuth';
export default function GoogleSignInButton({disabled=false,onBusy,onError}){
 const {colors}=useThemeStyles(),[loading,setLoading]=useState(false),busy=useRef(false);
 async function submit(){if(busy.current||disabled)return;dismissAuthKeyboard();busy.current=true;setLoading(true);onBusy?.(true);onError?.('');try{await signInWithGoogle();}catch{onError?.('No se pudo iniciar con Google. Comprueba que esté configurado y usa la app instalada o web. En Expo Go, entra con correo y contraseña.');}finally{busy.current=false;setLoading(false);onBusy?.(false);}}
 return <View style={{marginBottom:18}}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Continuar con Google" disabled={disabled||loading} onPress={submit} style={{minHeight:54,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:12,borderRadius:14,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,opacity:disabled||loading?0.55:1}}>{loading?<ActivityIndicator color={colors.link}/>:<><Ionicons accessible={false} name="logo-google" size={21} color={colors.ink}/><Text style={{fontSize:16,fontWeight:'600',color:colors.ink}}>Continuar con Google</Text></>}</TouchableOpacity><View style={{flexDirection:'row',alignItems:'center',gap:12,marginTop:18}}><View style={{height:1,flex:1,backgroundColor:colors.border}}/><Text style={{color:colors.muted,fontSize:13}}>o con tu correo</Text><View style={{height:1,flex:1,backgroundColor:colors.border}}/></View></View>;
}
