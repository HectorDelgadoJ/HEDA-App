import React from 'react';
import { View, Text, Switch, TouchableOpacity, Linking } from 'react-native';
import { useReminders } from './ReminderProvider';
import { useThemeStyles } from '../theme/ThemeProvider';
import InfoButton from './InfoButton';
export default function ReminderSettings(){
  const reminders=useReminders(),{colors}=useThemeStyles();
  if(!reminders)return null;
  const {enabled,busy,status,toggle,refresh,test,supported}=reminders;
  const button={padding:12,minHeight:44,borderRadius:12,borderWidth:1,borderColor:colors.border,backgroundColor:colors.softBlue};
  return <View style={{padding:16,borderRadius:18,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,marginBottom:16,gap:10}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:12}}><Text style={{flex:1,fontSize:16,fontWeight:'700',color:colors.ink}}>Recordarme en este teléfono</Text><Switch trackColor={{true:colors.primary,false:colors.switchOff}} thumbColor={colors.onPrimary} ios_backgroundColor={colors.switchOff} accessibilityLabel="Activar recordatorios en este teléfono" value={enabled} disabled={busy||!supported} onValueChange={toggle}/></View>
    <Text accessibilityLiveRegion="polite" style={{fontSize:14,lineHeight:20,color:colors.muted}}>{supported?status:'Los avisos del teléfono están disponibles en la app de iOS y Android. En web puedes revisar Alertas.'}</Text>
    {supported && <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{enabled && <><TouchableOpacity accessibilityRole="button" disabled={busy} style={button} onPress={refresh}><Text style={{color:colors.link}}>Actualizar avisos</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" disabled={busy} style={button} onPress={test}><Text style={{color:colors.link}}>Probar aviso</Text></TouchableOpacity></>}<TouchableOpacity accessibilityRole="button" style={button} onPress={()=>Linking.openSettings().catch(()=>{})}><Text style={{color:colors.link}}>Permisos</Text></TouchableOpacity></View>}
    <InfoButton title="Cómo llegan los recordatorios" text="Avisos locales de pagos, ingresos programados, tarjetas con recordatorio y metas con fecha, a las 9:00 de este teléfono. Se programa solo la próxima fecha pendiente, un día antes y ese día. Funcionan con la app cerrada una vez programados; el sistema puede retrasarlos. No muestran nombres ni importes. Abre HEDA para renovarlos después de confirmar o cambiar fechas. Los cambios desde otro dispositivo se actualizan al abrir esta app. No registran ni pagan automáticamente. Los presupuestos se revisan al actualizar la app, sin avisos del teléfono. Al cerrar sesión se cancelan los pendientes de HEDA."/>
  </View>;
}
