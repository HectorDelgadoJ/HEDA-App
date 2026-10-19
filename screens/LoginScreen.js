import { dismissAuthKeyboard } from '../services/keyboard';
import AuthCaptcha, { useAuthCaptcha } from '../components/AuthCaptcha';
import GoogleSignInButton from '../components/GoogleSignInButton';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useThemeStyles } from '../theme/ThemeProvider';
import AuthLayout from '../components/AuthLayout';
import { AuthButton, AuthField, AuthNotice } from '../components/AuthFields';
import { supabase } from '../services/supabase';
import { loginAccount } from '../services/authActions';
export default function LoginScreen({navigation}){
  const {colors}=useThemeStyles();
  const captcha=useAuthCaptcha();
  const [googleBusy,setGoogleBusy]=useState(false);
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[loading,setLoading]=useState(false),[errors,setErrors]=useState({}),[failure,setFailure]=useState('');
  const busy=useRef(false),active=useRef(true),passwordRef=useRef(null),emailRef=useRef(null);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  const changeEmail=useCallback(value=>{setEmail(value);setErrors(current=>current.email?({...current,email:undefined}):current);setFailure('');},[]);
  const changePassword=useCallback(value=>{setPassword(value);setErrors(current=>current.password?({...current,password:undefined}):current);setFailure('');},[]);
  const focusPassword=useCallback(()=>passwordRef.current?.focus(),[]);
  async function submit(){
    if(busy.current||googleBusy)return;
    if(captcha.required&&!captcha.token){setFailure('Completa la verificación de seguridad.');return;}busy.current=true;setLoading(true);setErrors({});setFailure('');dismissAuthKeyboard();
    try{await loginAccount(supabase,email,password,{captchaToken:captcha.token});dismissAuthKeyboard();}
    catch(error){if(active.current){setErrors(error.fields||{});setFailure(error.message);if(error.fields?.email)emailRef.current?.focus();else if(error.fields?.password)passwordRef.current?.focus();}}
    finally{captcha.reset();busy.current=false;if(active.current)setLoading(false);}
  }
  return <AuthLayout title="Qué gusto verte" description="Entra para continuar con tus finanzas.">
    <AuthNotice text={failure}/>
    <GoogleSignInButton disabled={loading||googleBusy} onBusy={value=>{busy.current=value;setGoogleBusy(value);}} onError={setFailure}/>
    <AuthField ref={emailRef} label="Correo electrónico" placeholder="nombre@correo.com" value={email} onChangeText={changeEmail} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" maxLength={254} returnKeyType="next" onSubmitEditing={focusPassword} error={errors.email} editable={!loading&&!googleBusy}/>
    <AuthField ref={passwordRef} label="Contraseña" placeholder="Tu contraseña" value={password} onChangeText={changePassword} password autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} error={errors.password} editable={!loading&&!googleBusy}/>
    <TouchableOpacity accessibilityRole="button" disabled={loading||googleBusy} onPress={()=>{dismissAuthKeyboard();navigation.navigate('RecoverPassword',{email});}} style={{minHeight:44,alignSelf:'flex-end',justifyContent:'center',paddingHorizontal:4,marginBottom:8}}><Text style={{color:colors.link,fontWeight:'600',fontSize:14}}>¿Olvidaste tu contraseña?</Text></TouchableOpacity>
    <AuthCaptcha captcha={captcha}/>
    <AuthButton label="Iniciar sesión" disabled={googleBusy} loading={loading} onPress={submit}/>
    <View style={{marginTop:20,alignItems:'center'}}><Text style={{color:colors.muted,fontSize:14}}>¿Es tu primera vez en HEDA?</Text><TouchableOpacity accessibilityRole="button" disabled={loading||googleBusy} onPress={()=>navigation.navigate('Register')} style={{minHeight:48,justifyContent:'center',paddingHorizontal:16}}><Text style={{color:colors.link,fontWeight:'700',fontSize:15}}>Crear mi cuenta</Text></TouchableOpacity></View>
  </AuthLayout>;
}
