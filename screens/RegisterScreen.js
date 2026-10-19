import BirthDateField from '../components/BirthDateField';
import { dismissAuthKeyboard } from '../services/keyboard';
import AuthCaptcha, { useAuthCaptcha } from '../components/AuthCaptcha';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AuthLayout from '../components/AuthLayout';
import { AuthButton, AuthField, AuthNotice } from '../components/AuthFields';
import InfoButton from '../components/InfoButton';
import { supabase } from '../services/supabase';
import { registerAccount, checkUsername } from '../services/authActions';
import { validateRegistration } from '../utils/auth';
export default function RegisterScreen({navigation}){
  const captcha=useAuthCaptcha();
  const [form,setForm]=useState({fullName:'',birthDate:'',username:'',email:'',password:'',confirmPassword:''}),[errors,setErrors]=useState({}),[failure,setFailure]=useState(''),[loading,setLoading]=useState(false),[step,setStep]=useState(0),[confirmation,setConfirmation]=useState(null);
  const busy=useRef(false),active=useRef(true),fields=useRef({});
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  const change=useCallback((key,value)=>{setForm(current=>({...current,[key]:value}));setErrors(current=>current[key]?({...current,[key]:undefined}):current);setFailure('');},[]);
  const callbacks=useMemo(()=>Object.fromEntries(['fullName','birthDate','email','password','confirmPassword','username'].map(key=>[key,{ref:ref=>{fields.current[key]=ref;},change:value=>change(key,value),focus:()=>fields.current[key]?.focus()}])),[change]);
  function check(){const result=validateRegistration(form);setErrors(result.errors);if(Object.keys(result.errors).length){setFailure('Revisa los campos marcados.');fields.current[Object.keys(result.errors)[0]]?.focus();return false;}return true;}
  async function next(){if(busy.current||!check())return;busy.current=true;setLoading(true);dismissAuthKeyboard();try{await checkUsername(supabase,form.username);if(active.current){setFailure('');setStep(1);}}catch(error){if(active.current){setFailure(error.message);if(error.fields)setErrors(error.fields);}}finally{busy.current=false;if(active.current)setLoading(false);}}
  async function submit(){
    if(busy.current || !check())return;
    if(captcha.required&&!captcha.token){setFailure('Completa la verificación de seguridad.');return;}busy.current=true;setLoading(true);setFailure('');dismissAuthKeyboard();
    try{const result=await registerAccount(supabase,form,{captchaToken:captcha.token});dismissAuthKeyboard();if(active.current&&result.needsConfirmation){setForm(current=>({...current,password:'',confirmPassword:''}));setConfirmation(result.email);}}
    catch(error){if(active.current){setFailure(error.message);if(error.fields){setErrors(error.fields);setStep(0);}}}
    finally{captcha.reset();busy.current=false;if(active.current)setLoading(false);}
  }
  function back(){if(loading)return;if(step===1&&!confirmation){setStep(0);setFailure('');}else navigation.goBack();}
  return <AuthLayout showBanner={false} title={confirmation?'Revisa tu correo':step===0?'Empieza con HEDA':'Todo listo para crear tu cuenta'} description={confirmation?'Tu configuración actual requiere confirmar el correo para entrar.':step===0?'Crea tu cuenta y empieza a organizar tu dinero.':'Al entrar podrás personalizar HEDA con dos preguntas rápidas.'} onBack={loading?undefined:back} backLabel={step===1&&!confirmation?'Tus datos':'Iniciar sesión'} step={confirmation?undefined:`${step+1} de 2`}>
    <AuthNotice text={failure}/>
    {confirmation?<><AuthNotice success text={`Si la dirección puede registrarse, recibirás un mensaje en ${confirmation}. Confirma desde ese correo y vuelve para iniciar sesión.`}/><AuthButton label="Ir a iniciar sesión" onPress={()=>navigation.goBack()}/></>:step===0?<>
      <AuthField ref={callbacks.fullName.ref} label="¿Cómo te llamas?" placeholder="Tu nombre" value={form.fullName} onChangeText={callbacks.fullName.change} autoCapitalize="words" autoComplete="name" textContentType="name" maxLength={100} returnKeyType="next" onSubmitEditing={callbacks.birthDate.focus} error={errors.fullName} editable={!loading}/>
      <BirthDateField value={form.birthDate} onChangeText={callbacks.birthDate.change} error={errors.birthDate} editable={!loading}/>
      <AuthField ref={callbacks.username.ref} label="Tu @usuario" placeholder="Por ejemplo, @vicente" value={form.username} onChangeText={callbacks.username.change} autoComplete="username-new" textContentType="username" maxLength={31} returnKeyType="next" onSubmitEditing={callbacks.email.focus} error={errors.username} editable={!loading}/>
      <AuthField ref={callbacks.email.ref} label="Correo electrónico" placeholder="nombre@correo.com" value={form.email} onChangeText={callbacks.email.change} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" maxLength={254} returnKeyType="next" onSubmitEditing={callbacks.password.focus} error={errors.email} editable={!loading}/>
      <AuthField ref={callbacks.password.ref} label="Crea una contraseña" placeholder="Al menos 8 caracteres" value={form.password} onChangeText={callbacks.password.change} password autoComplete="new-password" textContentType="newPassword" maxLength={128} returnKeyType="next" onSubmitEditing={callbacks.confirmPassword.focus} error={errors.password} editable={!loading}/>
      <AuthField ref={callbacks.confirmPassword.ref} label="Repite tu contraseña" placeholder="Escríbela una vez más" value={form.confirmPassword} onChangeText={callbacks.confirmPassword.change} password autoComplete="new-password" textContentType="newPassword" maxLength={128} returnKeyType="next" onSubmitEditing={next} error={errors.confirmPassword} editable={!loading}/>
      <AuthButton label="Continuar" loading={loading} onPress={next}/>
      <InfoButton title="Tus datos al crear la cuenta" text="El correo y la contraseña se usan para acceder mediante Supabase Auth. Tu nombre, fecha de nacimiento privada y @usuario forman tu perfil. El @usuario debe ser único. Las siguientes preguntas solo personalizan lo que ves en HEDA; no se comparten con la IA al registrarte."/>
    </>:<>
      <AuthCaptcha captcha={captcha}/>
      <AuthButton label="Crear mi cuenta" loading={loading} onPress={()=>submit()}/>
    </>}
  </AuthLayout>;
}
