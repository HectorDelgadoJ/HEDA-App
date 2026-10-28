import PasswordStrength from '../components/PasswordStrength';
import {Text} from '../components/AccessiblePrimitives';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {View} from 'react-native';
import AuthLayout from '../components/AuthLayout';
import {AuthButton,AuthField,AuthNotice} from '../components/AuthFields';
import AuthCaptcha,{useAuthCaptcha} from '../components/AuthCaptcha';
import {createPasswordRecovery} from '../services/passwordRecovery';
import {createRecoveryClient} from '../services/recoveryClient';
import {dismissAuthKeyboard} from '../services/keyboard';
import {useThemeStyles} from '../theme/ThemeProvider';
export default function RecoverPasswordScreen({navigation,route}){
 const {colors}=useThemeStyles(),captcha=useAuthCaptcha();
 const flowRef=useRef(null);
 const [email,setEmail]=useState(route.params?.email||''),[code,setCode]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState('');
 const [stage,setStage]=useState('email'),[loading,setLoading]=useState(false),[failure,setFailure]=useState(''),[errors,setErrors]=useState({}),[notice,setNotice]=useState(''),[remaining,setRemaining]=useState(0);
 const busy=useRef(false),active=useRef(true),deadline=useRef(0),confirmationRef=useRef(null);
 useEffect(()=>{active.current=true;const flow=createPasswordRecovery(createRecoveryClient());flowRef.current=flow;const timer=setInterval(()=>{if(active.current)setRemaining(Math.max(0,Math.ceil((deadline.current-Date.now())/1000)));},1000);return()=>{active.current=false;clearInterval(timer);void flow.close();};},[]);
 const changeEmail=useCallback(value=>{setEmail(value);setErrors({});setFailure('');},[]);
 const changeCode=useCallback(value=>{setCode(value);setErrors({});setFailure('');},[]);
 const changePassword=useCallback(value=>{setPassword(value);setErrors(current=>({...current,password:undefined}));setFailure('');},[]);
 const changeConfirmation=useCallback(value=>{setConfirmation(value);setErrors(current=>({...current,confirmation:undefined}));setFailure('');},[]);
 const focusConfirmation=useCallback(()=>confirmationRef.current?.focus(),[]);
 function cooldown(){deadline.current=Date.now()+60000;setRemaining(60);}
 async function run(action){if(busy.current)return;busy.current=true;setLoading(true);setErrors({});setFailure('');dismissAuthKeyboard();try{await action();}catch(error){if(active.current){setFailure(error.message);setErrors(error.fields||{});if(error.retryAfter)cooldown();}}finally{busy.current=false;if(active.current)setLoading(false);}}
 async function send(){if(remaining||busy.current)return;if(captcha.required&&!captcha.token){setFailure('Completa la verificación de seguridad.');return;}await run(async()=>{try{const clean=await flowRef.current.request(email,{captchaToken:captcha.token});if(active.current){setEmail(clean);setCode('');setStage('code');setNotice('Si el correo tiene una cuenta, recibirás un código. Revisa también Spam.');cooldown();}}finally{captcha.reset();}});}
 function verify(){return run(async()=>{await flowRef.current.verify(email,code);if(active.current){setCode('');deadline.current=0;setRemaining(0);setNotice('Código verificado. Elige una nueva contraseña.');setStage('password');}});}
 function save(){return run(async()=>{const result=await flowRef.current.update(password,confirmation);if(active.current){setPassword('');setConfirmation('');setNotice(result.warning||'Tu contraseña se actualizó. Ya puedes iniciar sesión con ella.');setStage('done');}});}
 function back(){if(!busy.current){dismissAuthKeyboard();navigation.goBack();}}
 return <AuthLayout showBanner={false} title={stage==='password'?'Tu nueva contraseña':stage==='done'?'Contraseña actualizada':'Recupera tu acceso'} description={stage==='email'?'Te enviaremos un código al correo de tu cuenta.':stage==='code'?`Escribe el código que llegó a ${email}.`:stage==='password'?'Usa una frase larga que puedas recordar.':'Vuelve al login para entrar a HEDA.'} onBack={loading?undefined:back} backLabel="Iniciar sesión" step={stage==='done'?undefined:stage==='email'?'1 de 3':stage==='code'?'2 de 3':'3 de 3'}>
 <AuthNotice text={failure}/>{notice?<AuthNotice success text={notice}/>:null}
 {stage==='email'?<><AuthField label="Correo de tu cuenta" value={email} onChangeText={changeEmail} placeholder="nombre@correo.com" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" maxLength={254} error={errors.email} editable={!loading} onSubmitEditing={send}/><AuthCaptcha captcha={captcha}/><AuthButton label={remaining?`Espera ${remaining} s`:'Enviar código'} loading={loading} disabled={!!remaining} onPress={send}/><Text style={{color:colors.muted,fontSize:13,lineHeight:20,marginTop:16}}>Si entras con Google, puedes usar “Continuar con Google” en el login.</Text></>:stage==='code'?<><AuthField label="Código de recuperación" value={code} onChangeText={changeCode} placeholder="Código del correo" keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={10} error={errors.code} editable={!loading} onSubmitEditing={verify}/><AuthButton label="Verificar código" loading={loading} onPress={verify}/><View style={{marginTop:14}}><AuthCaptcha captcha={captcha}/><AuthButton secondary label={remaining?`Reenviar en ${remaining} s`:'Reenviar código'} disabled={loading||!!remaining} onPress={send}/><AuthButton secondary label="Cambiar correo" disabled={loading} onPress={()=>{setStage('email');setCode('');setNotice('');setFailure('');setErrors({});}}/></View></>:stage==='password'?<><AuthField label="Nueva contraseña" value={password} onChangeText={changePassword} placeholder="Al menos 12 caracteres" password autoComplete="new-password" textContentType="newPassword" maxLength={128} error={errors.password} editable={!loading} returnKeyType="next" onSubmitEditing={focusConfirmation}/><PasswordStrength value={password}/><AuthField ref={confirmationRef} label="Repite la nueva contraseña" value={confirmation} onChangeText={changeConfirmation} placeholder="Escríbela una vez más" password autoComplete="new-password" textContentType="newPassword" maxLength={128} error={errors.confirmation} editable={!loading} returnKeyType="done" onSubmitEditing={save}/><AuthButton label="Guardar contraseña" loading={loading} onPress={save}/></>:<AuthButton label="Volver a iniciar sesión" onPress={back}/>}
 </AuthLayout>;
}
