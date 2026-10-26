import BirthDateField from './BirthDateField';
import {displayBirthDate} from '../utils/birthDate';
import React,{useEffect,useRef,useState} from 'react';
import {View,Text,ScrollView,KeyboardAvoidingView,Platform,ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {supabase} from '../services/supabase';
import {completeGoogleProfile,needsGoogleProfile} from '../services/googleProfile';
import {useThemeStyles} from '../theme/ThemeProvider';
import {dismissAuthKeyboard} from '../services/keyboard';
import {AuthField,AuthButton,AuthNotice} from './AuthFields';
import HedaBrand from './HedaBrand';
import LegalLinks from './LegalLinks';
export default function GoogleProfileGate({user,children,onReady}){
 const google=!!user;
 const {colors}=useThemeStyles(),[profile,setProfile]=useState(null),[loaded,setLoaded]=useState(!google),[error,setError]=useState(''),[fields,setFields]=useState({}),[saving,setSaving]=useState(false),[attempt,setAttempt]=useState(0);
 const [form,setForm]=useState({fullName:'',username:'',birthDate:''}),alive=useRef(true),busy=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{let current=true;if(!google){setLoaded(true);onReady(true);return()=>{current=false;};}
 setLoaded(false);setError('');onReady(false);
 supabase.rpc('heda_account_active').then(result=>{if(result.error)throw new Error('Falta aplicar SQL 013 o no se pudo comprobar tu cuenta.');if(result.data!==true)throw new Error('Esta cuenta está deshabilitada. Contacta al responsable de HEDA.');return supabase.from('profiles').select('id,full_name,username,birth_date').eq('id',user.id).single();}).then(({data,error})=>{
 if(!current)return;if(error)throw error;setProfile(data);setForm({fullName:data.full_name||String(user.user_metadata?.full_name||'').slice(0,100),username:data.username||'',birthDate:displayBirthDate(data.birth_date)});setLoaded(true);onReady(!needsGoogleProfile(user,data));
 }).catch(e=>{if(current){setLoaded(true);setError(e.message||'No pudimos cargar tu perfil. Revisa tu conexión e inténtalo otra vez.');}});
 return()=>{current=false;};},[user?.id,google,attempt]);
 async function save(){if(busy.current)return;busy.current=true;setSaving(true);setError('');setFields({});dismissAuthKeyboard();try{const saved=await completeGoogleProfile(supabase,user.id,form);if(alive.current){setProfile(saved);onReady(true);}}catch(e){if(alive.current){setError(e.message);setFields(e.fields||{});}}finally{busy.current=false;if(alive.current)setSaving(false);}}
 async function exit(){if(busy.current)return;busy.current=true;setSaving(true);try{const {error}=await supabase.auth.signOut({scope:'local'});if(error)throw error;}catch{if(alive.current)setError('No pudimos cerrar la sesión. Revisa tu conexión.');}finally{busy.current=false;if(alive.current)setSaving(false);}}
 if(!google||loaded&&profile&&!needsGoogleProfile(user,profile))return children;
 const change=key=>value=>{setError('');setForm(old=>({...old,[key]:value}));setFields(old=>({...old,[key]:undefined}));};
 return <SafeAreaView style={{flex:1,backgroundColor:colors.background}}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{flexGrow:1,padding:22,paddingBottom:36}}><View style={{width:'100%',maxWidth:460,alignSelf:'center'}}><HedaBrand/><View style={{marginTop:24,padding:22,borderRadius:24,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border}}><Text accessibilityRole="header" style={{fontSize:26,lineHeight:33,fontWeight:'700',color:colors.ink}}>Un último paso</Text><Text style={{fontSize:15,lineHeight:22,color:colors.muted,marginTop:8,marginBottom:24}}>Completa tu perfil una sola vez. Tu fecha de nacimiento nos permite mantener tu edad actualizada.</Text>{!loaded?<ActivityIndicator color={colors.link}/>:profile?<><AuthField label="Tu nombre" value={form.fullName} onChangeText={change('fullName')} maxLength={100} editable={!saving} error={fields.fullName}/><BirthDateField value={form.birthDate} onChangeText={change('birthDate')} editable={!saving} error={fields.birthDate}/><AuthField label="Tu @usuario" placeholder="Por ejemplo, @vicente" value={form.username} onChangeText={change('username')} maxLength={31} editable={!saving} error={fields.username}/><AuthNotice text={error}/><AuthButton label="Guardar y continuar" onPress={save} loading={saving}/></>:<><AuthNotice text={error}/><AuthButton label="Volver a intentar" onPress={()=>setAttempt(n=>n+1)}/></>}<AuthButton secondary label="Cerrar sesión" disabled={saving} onPress={exit}/><LegalLinks/></View></View></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
