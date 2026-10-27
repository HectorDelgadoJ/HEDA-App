import {Text} from './AccessiblePrimitives';
import React from 'react';
import {View} from 'react-native';
import {AuthField} from './AuthFields';
import {maskBirthDate,ageFromBirthDate} from '../utils/birthDate';
import {useThemeStyles} from '../theme/ThemeProvider';
export default function BirthDateField({value,onChangeText,error,editable=true}){const {colors}=useThemeStyles(),age=ageFromBirthDate(value);return <View><AuthField label="Fecha de nacimiento" placeholder="DD/MM/AAAA" value={value} onChangeText={v=>onChangeText(maskBirthDate(v))} keyboardType="number-pad" maxLength={10} error={error} editable={editable}/><Text style={{color:colors.muted,fontSize:13,lineHeight:19,marginTop:-6,marginBottom:18}}>{age!==null?`${age} años · Tu edad se actualiza automáticamente.`:'Tu fecha queda privada. Calcularemos tu edad sin volver a preguntártela.'}</Text></View>;}
