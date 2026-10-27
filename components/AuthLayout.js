import {Text, TouchableOpacity} from './AccessiblePrimitives';
import LegalLinks from './LegalLinks';
import {InstallHint} from './WebInstallProvider';
import HedaBrand from './HedaBrand';
import { useFocusEffect } from '@react-navigation/native';
import { dismissAuthKeyboard } from '../services/keyboard';
import React, { useCallback } from 'react';
import {View, ScrollView, KeyboardAvoidingView, Platform, StyleSheet} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStyles } from '../theme/ThemeProvider';
export default function AuthLayout({title,description,children,onBack,backLabel='Volver',step,showBanner=true}){
  const {colors,styles}=useThemeStyles(makeStyles);
  useFocusEffect(useCallback(()=>()=>dismissAuthKeyboard(),[]));
  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets={false} contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false}>
    <View style={styles.shell}>
      <View style={styles.top}>{onBack?<TouchableOpacity accessibilityRole="button" onPress={onBack} style={styles.back}><Ionicons accessible={false} name="arrow-back" size={21} color={colors.link}/><Text style={styles.link}>{backLabel}</Text></TouchableOpacity>:<Text style={styles.wordmark}>FINANZAS A TU RITMO</Text>}{step?<Text style={styles.step}>{step}</Text>:null}</View>
      {showBanner?<View style={styles.banner}><View style={{marginBottom:14}}><HedaBrand light/></View><Text style={styles.bannerTitle}>Tu dinero, más claro.</Text><Text style={styles.bannerText}>Organiza tus gastos, recuerda tus pagos y avanza a tu ritmo.</Text></View>:<View style={{marginBottom:18}}><HedaBrand/></View>}
      <View style={styles.card}><Text accessibilityRole="header" style={styles.title}>{title}</Text><Text style={styles.description}>{description}</Text>{children}<LegalLinks/></View><InstallHint/>
    </View>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
const makeStyles=colors=>StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.background},flex:{flex:1},scroll:{flexGrow:1,padding:20,paddingBottom:30,justifyContent:'flex-start'},shell:{width:'100%',maxWidth:460,alignSelf:'center'},top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:48,marginBottom:16},wordmark:{fontSize:12,fontWeight:'700',letterSpacing:1,color:colors.muted},back:{flexDirection:'row',alignItems:'center',gap:8,minHeight:48,paddingRight:12},link:{color:colors.link,fontSize:15,fontWeight:'600'},step:{color:colors.muted,fontSize:13},banner:{backgroundColor:colors.primary,borderRadius:24,padding:22,marginBottom:18},mark:{width:48,height:48,borderRadius:16,backgroundColor:'rgba(255,255,255,0.16)',alignItems:'center',justifyContent:'center'},bannerTitle:{fontSize:27,lineHeight:33,fontWeight:'800',color:'#FFFFFF'},bannerText:{fontSize:14,lineHeight:21,color:'#FFFFFF',marginTop:8,maxWidth:330},card:{backgroundColor:colors.surface,borderRadius:24,borderWidth:1,borderColor:colors.border,padding:20},title:{fontSize:25,lineHeight:32,fontWeight:'700',color:colors.ink},description:{fontSize:14,lineHeight:21,color:colors.muted,marginTop:6,marginBottom:22}
});
