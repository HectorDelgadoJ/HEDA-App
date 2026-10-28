import React from 'react';
import {View} from 'react-native';
import {Text} from './AccessiblePrimitives';
import {useThemeStyles} from '../theme/ThemeProvider';
import {passwordAssessment} from '../utils/passwordPolicy';
export default function PasswordStrength({value}) {
 const {colors:c}=useThemeStyles(),result=passwordAssessment(value);
 const tone=result.level===3?c.income:result.level===1?c.expense:c.link;
 return <View style={{marginTop:-4,marginBottom:18,gap:8}}>
  <Text accessibilityLiveRegion="polite" style={{color:tone,fontWeight:'700',fontSize:14}}>Seguridad orientativa: {result.label}</Text>
  <View accessible={false} importantForAccessibility="no-hide-descendants" style={{flexDirection:'row',gap:5}}>{[1,2,3].map(n=><View key={n} style={{flex:1,height:6,borderRadius:3,backgroundColor:n<=result.level?tone:c.border}}/>)}</View>
  {result.requirements.map(r=><Text key={r.key} style={{fontSize:13,lineHeight:20,color:r.met?c.income:c.muted}}>{r.met?'✓ Cumple: ':'○ Falta: '}{r.label}</Text>)}
  {!!result.warning&&<Text style={{color:c.expense,fontSize:13,lineHeight:20}}>{result.warning}</Text>}
  <Text style={{color:c.muted,fontSize:13,lineHeight:20}}>Mejor si es larga y exclusiva de HEDA. Puedes pegar una contraseña de tu gestor. Esta estimación se calcula en tu dispositivo.</Text>
 </View>;
}
