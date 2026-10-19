import React,{useEffect,useRef,useState} from 'react';
import {Modal,View,Text,ScrollView,TouchableOpacity} from 'react-native';
import {webAlerts} from '../utils/alertQueue';
import {useThemeStyles} from '../theme/ThemeProvider';
export default function AppDialogs(){
 const [item,setItem]=useState(null),{colors}=useThemeStyles(),first=useRef(null);
 useEffect(()=>webAlerts.subscribe(setItem),[]);
 useEffect(()=>{if(item){const id=requestAnimationFrame(()=>first.current?.focus());return()=>cancelAnimationFrame(id);}},[item?.id]);
 if(!item)return null;
 return <Modal visible transparent animationType="fade" onRequestClose={()=>webAlerts.dismiss(item.id)}><View style={{flex:1,backgroundColor:colors.overlay,padding:20,justifyContent:'center'}}><View role="alertdialog" aria-label={item.title} style={{width:'100%',maxWidth:440,maxHeight:'85%',alignSelf:'center',padding:22,borderRadius:20,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface}}><ScrollView><Text accessibilityRole="header" style={{fontSize:22,lineHeight:29,fontWeight:'700',color:colors.ink}}>{item.title}</Text>{item.message?<Text style={{fontSize:15,lineHeight:23,color:colors.muted,marginTop:12}}>{item.message}</Text>:null}<View style={{flexDirection:'row',flexWrap:'wrap',gap:10,justifyContent:'flex-end',marginTop:22}}>{item.buttons.map((button,index)=><TouchableOpacity key={index} ref={index===0?first:undefined} accessibilityRole="button" onPress={()=>webAlerts.choose(item.id,index)} style={{minHeight:46,paddingHorizontal:16,paddingVertical:12,borderRadius:12,backgroundColor:button.style==='destructive'?'#B42332':button.style==='cancel'?colors.softBlue:colors.primary}}><Text style={{fontWeight:'700',color:button.style==='cancel'?colors.link:colors.onPrimary}}>{button.text||'Entendido'}</Text></TouchableOpacity>)}</View></ScrollView></View></View></Modal>;
}
