import React from 'react';
import {View,Text,Linking,TouchableOpacity} from 'react-native';
import {useThemeStyles} from '../theme/ThemeProvider';
import {Alert} from '../services/alerts';
export default function LegalLinks(){const {colors}=useThemeStyles();async function open(path){try{await Linking.openURL(`https://heda-app.netlify.app/${path}/`);}catch{Alert.alert('No se pudo abrir','Revisa tu conexión e inténtalo de nuevo.');}}return <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:8,marginTop:12}}>{[['privacidad','Privacidad'],['condiciones','Condiciones']].map(([path,label])=><TouchableOpacity accessibilityRole="link" key={path} onPress={()=>open(path)} style={{minHeight:44,justifyContent:'center',paddingHorizontal:10}}><Text style={{fontSize:14,color:colors.link,textDecorationLine:'underline'}}>{label}</Text></TouchableOpacity>)}</View>;}
