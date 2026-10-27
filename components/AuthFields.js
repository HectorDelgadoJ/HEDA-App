import {Text, TextInput, TouchableOpacity} from './AccessiblePrimitives';
import { authAutofillProps } from '../utils/authInput';
import { dismissAuthKeyboard } from '../services/keyboard';
import React, { forwardRef, memo, useId, useImperativeHandle, useRef, useState } from 'react';
import {View, ActivityIndicator, StyleSheet, Platform} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStyles } from '../theme/ThemeProvider';
export const AuthField=memo(forwardRef(function AuthField({label,error,password=false,editable=true,autoComplete,textContentType,...props},ref){
  const {colors,styles}=useThemeStyles(makeStyles),[visible,setVisible]=useState(false);
  const input=useRef(null),errorId=useId();
  useImperativeHandle(ref,()=>input.current,[]);
  function toggleVisibility(){dismissAuthKeyboard();setVisible(current=>!current);}
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={[styles.inputRow,error&&{borderColor:colors.dark?'#FCA5A5':'#B91C1C'}]}><TextInput selectionColor={colors.link} cursorColor={colors.link} ref={input} {...(Platform.OS==='web'?{'aria-invalid':!!error,'aria-describedby':error?errorId:undefined}:{})} accessibilityLabel={label} accessibilityHint={error||undefined} editable={editable} placeholderTextColor={colors.placeholder} style={styles.input} secureTextEntry={password&&!visible} autoCapitalize="none" autoCorrect={false} keyboardAppearance={colors.dark?'dark':'light'} {...props} {...authAutofillProps(Platform.OS,{password,autoComplete,textContentType})}/>{password?<TouchableOpacity accessibilityRole="button" accessibilityLabel={`${visible?'Ocultar':'Mostrar'} ${label.toLowerCase()}`} disabled={!editable} style={styles.eye} onPress={toggleVisibility}><Ionicons accessible={false} name={visible?'eye-off-outline':'eye-outline'} size={22} color={colors.link}/></TouchableOpacity>:null}</View>{error?<Text nativeID={errorId} accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>:null}</View>;
}));
export function AuthButton({label,onPress,loading=false,disabled=false,secondary=false}){
  const {colors,styles}=useThemeStyles(makeStyles);
  return <TouchableOpacity accessibilityRole="button" accessibilityState={{disabled:disabled||loading,busy:loading}} disabled={disabled||loading} onPress={onPress} style={[styles.button,secondary&&styles.secondary,(disabled||loading)&&{opacity:0.55}]}>{loading?<ActivityIndicator color={secondary?colors.link:colors.onPrimary}/>:<Text style={[styles.buttonText,secondary&&styles.secondaryText]}>{label}</Text>}</TouchableOpacity>;
}
export function AuthNotice({text,success=false}){
  const {colors,styles}=useThemeStyles(makeStyles);
  if(!text)return null;
  return <View accessibilityLiveRegion="polite" style={[styles.notice,success&&{backgroundColor:colors.softBlue}]}><Ionicons accessible={false} name={success?'mail-outline':'alert-circle-outline'} size={20} color={success?colors.link:colors.dark?'#FCA5A5':'#B91C1C'}/><Text style={[styles.noticeText,success&&{color:colors.ink}]}>{text}</Text></View>;
}
const makeStyles=colors=>StyleSheet.create({
 field:{marginBottom:16},label:{fontSize:14,fontWeight:'600',color:colors.ink,marginBottom:8},inputRow:{flexDirection:'row',alignItems:'center',minHeight:54,borderRadius:14,borderWidth:1,borderColor: colors.inputBorder,backgroundColor:colors.input},input:{flex:1,minWidth:0,color:colors.ink,fontSize:16,paddingHorizontal:14,paddingVertical:14},eye:{minWidth:48,minHeight:52,alignItems:'center',justifyContent:'center'},error:{fontSize:13,lineHeight:19,color:colors.dark?'#FCA5A5':'#B91C1C',marginTop:6},button:{minHeight:54,justifyContent:'center',alignItems:'center',backgroundColor:colors.primary,borderRadius:14,padding:14,marginTop:8},buttonText:{color:'#FFFFFF',fontWeight:'700',fontSize:16,textAlign:'center'},secondary:{backgroundColor:colors.softBlue,borderWidth:1,borderColor:colors.border},secondaryText:{color:colors.link},notice:{flexDirection:'row',alignItems:'flex-start',gap:8,padding:12,borderRadius:12,backgroundColor:colors.dark?'#42232B':'#FEF2F2',marginBottom:16},noticeText:{flex:1,fontSize:14,lineHeight:20,color:colors.dark?'#FCA5A5':'#B91C1C'}
});
