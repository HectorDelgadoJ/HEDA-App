import {Text} from './AccessiblePrimitives';
import React from 'react';
import {Image, View} from 'react-native';
import {useThemeStyles} from '../theme/ThemeProvider';
export default function HedaBrand({size=42,light=false,compact=false}){
 const {colors}=useThemeStyles();
 return <View style={{flexDirection:'row',alignItems:'center',gap:10}}><Image source={require('../assets/heda-logo.png')} accessibilityLabel="Logo HEDA" style={{width:size,height:size,borderRadius:size*0.25}}/>{!compact&&<Text style={{color:light?'#FFFFFF':colors.ink,fontWeight:'800',fontSize:21,letterSpacing:1}}>HEDA</Text>}</View>;
}
