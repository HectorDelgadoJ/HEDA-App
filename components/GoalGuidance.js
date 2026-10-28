import React,{useState} from 'react';
import {View} from 'react-native';
import {Text,TouchableOpacity} from './AccessiblePrimitives';
import {useThemeStyles} from '../theme/ThemeProvider';
import InfoButton from './InfoButton';
import {goalPlan} from '../utils/goalPlan';
const money=n=>'$'+Number(n).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
const date=d=>new Date(d+'T12:00:00').toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'});
export default function GoalGuidance({goal,today,onContribute,onChangeDate}){
 const {colors:c}=useThemeStyles(),[expanded,setExpanded]=useState(false),plan=goalPlan(goal,today);
 if(plan.status==='unavailable')return null;
 const title={complete:'¡Alcanzaste tu meta!',noDate:'Pon una fecha si quieres planear tu ahorro',overdue:'La fecha de tu meta ya pasó',today:'Tu fecha objetivo es hoy',insufficient:'Todavía estamos conociendo tu ritmo',onTrack:'A este ritmo, vas encaminado',behind:'Conviene ajustar tu plan'}[plan.status];
 const tone=plan.status==='complete'||plan.status==='onTrack'?c.income:plan.status==='behind'||plan.status==='overdue'?c.warning:c.link;
 const button={minHeight:46,paddingVertical:12,paddingHorizontal:10,borderRadius:12,borderWidth:1,borderColor:c.inputBorder,justifyContent:'center'};
 return <View style={{marginTop:12,marginBottom:10,padding:14,borderWidth:1,borderColor:c.border,borderRadius:14,gap:8}}>
 <Text style={{fontSize:16,fontWeight:'700',color:tone}}>{title}</Text>
 {plan.status!=='complete'&&<Text style={{fontSize:14,lineHeight:22,color:c.ink}}>Te faltan {money(plan.remaining)}.</Text>}
 {plan.weeklyRequired!==null&&plan.daysLeft>0&&<Text style={{fontSize:14,lineHeight:22,color:c.ink}}>Para tu fecha: aparta aproximadamente {money(plan.weeklyRequired)} por semana.</Text>}
 {plan.status==='insufficient'&&<Text style={{fontSize:14,lineHeight:22,color:c.muted}}>Necesitamos al menos 7 días desde que creaste la meta y algo de ahorro para estimar un ritmo.</Text>}
 {plan.estimatedDate&&['onTrack','behind','noDate'].includes(plan.status)&&<Text style={{fontSize:14,lineHeight:22,color:c.muted}}>Si mantienes el promedio registrado: terminarías cerca del {date(plan.estimatedDate)}.</Text>}
 {plan.status==='today'&&<Text style={{fontSize:14,lineHeight:22,color:c.muted}}>Para terminar hoy necesitarías apartar lo que falta. También puedes elegir otra fecha.</Text>}
 {plan.status!=='complete'&&<TouchableOpacity accessibilityRole="button" accessibilityLabel={`Ideas para la meta ${goal.name}`} accessibilityState={{expanded}} onPress={()=>setExpanded(v=>!v)} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:c.link,fontWeight:'700'}}>{expanded?'Ocultar opciones':'¿Cómo puedo avanzar?'}</Text></TouchableOpacity>}
 {expanded&&plan.status!=='complete'&&<View style={{gap:10}}>
 {plan.weeklyRequired!==null&&plan.daysLeft>0?<><Text style={{color:c.ink,fontSize:14,lineHeight:22}}>Puedes dividirlo en {money(plan.dailyRequired)} al día. Elige una cantidad que puedas sostener; no sabemos cuánto tienes disponible para ahorrar.</Text><TouchableOpacity accessibilityRole="button" onPress={()=>onContribute(plan.weeklyRequired)} style={button}><Text style={{color:c.link,fontWeight:'700'}}>Registrar una aportación de {money(plan.weeklyRequired)}</Text></TouchableOpacity></>:<Text style={{color:c.ink,fontSize:14,lineHeight:22}}>Elige una fecha realista o registra una aportación pequeña para empezar.</Text>}
 <Text style={{color:c.muted,fontSize:14,lineHeight:22}}>Si la cantidad es difícil, puedes ampliar la fecha o revisar qué gastos podrías reducir.</Text>
 <TouchableOpacity accessibilityRole="button" onPress={onChangeDate} style={button}><Text style={{color:c.link,fontWeight:'700'}}>{goal.target_date?'Ajustar fecha de la meta':'Elegir fecha de la meta'}</Text></TouchableOpacity>
 </View>}
 {plan.status!=='complete'&&<InfoButton title="Cómo estimamos tu meta" text="Usamos el ahorro acumulado dividido entre los días desde que creaste la meta; no tenemos el historial de cada aportación. Suponemos que ese promedio continúa. No es una garantía ni comprueba si el ahorro es asequible. Las cantidades necesarias se recalculan al aportar o cambiar la fecha. No usamos IA ni compartimos tus datos para este cálculo."/>}
 </View>;
}
