import React,{useEffect,useRef} from 'react';
import {Animated,View,Platform} from 'react-native';
import {useAccessibility} from './AccessibilityContext';
import {useThemeStyles} from '../theme/ThemeProvider';
export default function GoalProgress({name,percent}){
 const {colors:c}=useThemeStyles(),{reduceMotion}=useAccessibility(),progress=useRef(new Animated.Value(percent)).current;
 useEffect(()=>{if(reduceMotion){progress.setValue(percent);return;}const animation=Animated.timing(progress,{toValue:percent,duration:350,useNativeDriver:false});animation.start();return()=>animation.stop();},[percent,reduceMotion,progress]);
 return <View {...(Platform.OS==='web'?{'aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':Math.round(percent),'aria-valuetext':`${percent.toFixed(0)} por ciento`}:{})} accessibilityRole="progressbar" accessibilityLabel={`Avance de ${name}`} accessibilityValue={{min:0,max:100,now:Math.round(percent),text:`${percent.toFixed(0)} por ciento`}} style={{height:12,backgroundColor:c.raised,borderRadius:12,overflow:'hidden',marginBottom:12}}><Animated.View style={{height:'100%',borderRadius:12,backgroundColor:c.income,width:progress.interpolate({inputRange:[0,100],outputRange:['0%','100%'],extrapolate:'clamp'})}}/></View>;
}
