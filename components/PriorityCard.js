import React from 'react';
import {View} from 'react-native';
import {Text,TouchableOpacity} from './AccessiblePrimitives';
import {useThemeStyles} from '../theme/ThemeProvider';
import {useExperience} from './ExperienceProvider';
import {priorityGuide} from '../utils/priorityGuide';
export default function PriorityCard({navigation,goal,payment,spent,budgetCount}){
 const {colors:c}=useThemeStyles(),{preferences,openSettings}=useExperience();
 if(!preferences.guidance.priority)return null;
 const guide=priorityGuide(preferences.priority,{goal,payment,spent,budgetCount});
 return <View style={{padding:18,borderWidth:1,borderColor:c.headerBorder,backgroundColor:c.surface,borderRadius:18,marginBottom:18,gap:10}}>
 <Text accessibilityRole="header" style={{color:c.ink,fontWeight:'700',fontSize:19}}>{guide.title}</Text>
 <Text style={{color:c.muted,fontSize:15,lineHeight:23}}>{guide.text}</Text>
 <TouchableOpacity accessibilityRole="button" onPress={()=>navigation.navigate(guide.route,guide.params)} style={{minHeight:50,padding:14,borderRadius:13,backgroundColor:c.primary,justifyContent:'center'}}><Text style={{color:c.onPrimary,fontWeight:'700',textAlign:'center'}}>{guide.action}</Text></TouchableOpacity>
 <TouchableOpacity accessibilityRole="button" onPress={()=>openSettings('view')} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:c.link,fontSize:14}}>Cambiar mi prioridad</Text></TouchableOpacity>
 </View>;
}
