import {useAccessibility} from './AccessibilityContext';
import {Text, TouchableOpacity} from './AccessiblePrimitives';
import React,{useEffect,useState} from 'react';
import {View, ScrollView} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useExperience} from './ExperienceProvider';
import {useThemeStyles} from '../theme/ThemeProvider';
import {tourStopsForPriority} from '../utils/welcome';
import HedaBrand from './HedaBrand';
export default function GuidedTour(){
 const {preferences,tourOpen,tourRun,finishTour,openSettings,saving,error}=useExperience(),[index,setIndex]=useState(0);
 const tourStops=tourStopsForPriority(preferences.priority),accessibility=useAccessibility();
 const navigation=useNavigation(),{colors}=useThemeStyles(),insets=useSafeAreaInsets();
 useEffect(()=>{setIndex(0);},[tourRun]);
 useEffect(()=>{if(tourOpen)navigation.navigate('App',{screen:tourStops[index].route});},[tourOpen,index,navigation]);
 if(!tourOpen)return null;
 const stop=tourStops[index];
 const button={minHeight:46,borderRadius:12,paddingHorizontal:18,alignItems:'center',justifyContent:'center'};
 return <View accessibilityViewIsModal style={{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:colors.overlay}}><View style={{position:'absolute',left:12,right:12,bottom:66+insets.bottom,maxHeight:'60%',backgroundColor:colors.surface,borderRadius:22,borderWidth:2,borderColor:colors.link,padding:18,elevation:12,shadowColor:'#000',shadowOpacity:0.15,shadowRadius:12,shadowOffset:{width:0,height:4}}}>
 <ScrollView showsVerticalScrollIndicator={false}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><HedaBrand size={30}/><TouchableOpacity accessibilityRole="button" accessibilityLabel="Salir del tutorial" disabled={saving} onPress={finishTour} style={{minHeight:44,justifyContent:'center',paddingHorizontal:8}}><Text style={{color:colors.link,fontWeight:'600'}}>Salir</Text></TouchableOpacity></View>
 <Text style={{color:colors.link,fontSize:16,fontWeight:'700',marginTop:8}}>Tutorial de HEDA · Paso {index+1} de {tourStops.length}</Text>{index===0&&<Text style={{color:colors.ink,fontSize:14,lineHeight:21,marginTop:10}}>Esta guía te enseña a usar HEDA. Puedes salir cuando quieras y volver a abrir el tutorial desde Perfil.</Text>}<Text accessibilityRole="header" accessibilityLiveRegion="polite" style={{fontSize:21,fontWeight:'700',color:colors.ink,marginTop:14}}>{stop.title}</Text>
 <Text style={{fontSize:15,lineHeight:22,color:colors.muted,marginTop:8}}>{stop.text}</Text>
 <Text style={{fontSize:14,lineHeight:21,color:colors.ink,backgroundColor:colors.softBlue,padding:12,borderRadius:12,marginTop:12}}>{stop.action}</Text>
 {stop.tryLabel&&<TouchableOpacity accessibilityRole="button" disabled={saving} onPress={async()=>{if(await finishTour())navigation.navigate('App',{screen:stop.route,params:stop.params});}} style={{...button,marginTop:12,borderWidth:1,borderColor:colors.link,backgroundColor:colors.softBlue,paddingVertical:12}}><Text style={{color:colors.link,fontWeight:'700',textAlign:'center'}}>{stop.tryLabel}</Text></TouchableOpacity>}
 {stop.settingsSection&&<TouchableOpacity accessibilityRole="button" accessibilityLabel={stop.settingsLabel} disabled={saving} onPress={()=>openSettings(stop.settingsSection)} style={{...button,marginTop:12,borderWidth:1,borderColor:colors.link,backgroundColor:colors.softBlue,paddingVertical:12}}><Text style={{color:colors.link,fontWeight:'700',textAlign:'center'}}>{stop.settingsLabel}</Text></TouchableOpacity>}
 {error?<Text accessibilityLiveRegion="polite" style={{color:colors.expense||'#B91C1C',marginTop:8}}>{error}</Text>:null}
 <View style={{flexDirection:accessibility.textScale>=1.4?'column':'row',gap:8,justifyContent:'space-between',marginTop:14}}><TouchableOpacity accessibilityRole="button" disabled={saving} onPress={()=>index?setIndex(index-1):finishTour()} style={button}><Text style={{color:colors.link,fontWeight:'600'}}>{index?'Anterior':'Omitir tutorial'}</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" disabled={saving} onPress={()=>index===tourStops.length-1?finishTour():setIndex(index+1)} style={[button,{backgroundColor:colors.primary}]}><Text style={{color:'#FFFFFF',fontWeight:'700',textAlign:'center'}}>{saving?'Guardando…':index===tourStops.length-1?'Empezar a usar HEDA':'Siguiente'}</Text></TouchableOpacity></View>
 </ScrollView></View></View>;
}
