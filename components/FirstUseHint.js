import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useIsFocused} from '@react-navigation/native';
import {Text,TouchableOpacity} from './AccessiblePrimitives';
import {useThemeStyles} from '../theme/ThemeProvider';
import {firstUseKey,firstUseTips,normalizeSeenHelp} from '../utils/firstUseHelp';
const Context=createContext(null);
export const useFirstUseHelp=()=>useContext(Context);
export function FirstUseHelpProvider({ownerId,enabled,paused,children}){
 const [seen,setSeen]=useState({}),[ready,setReady]=useState(false),[failure,setFailure]=useState('');
 const value=useRef({}),alive=useRef(true),writes=useRef(Promise.resolve());
 const key=firstUseKey(ownerId);
 useEffect(()=>{alive.current=true;let current=true;setReady(false);value.current={};setSeen({});setFailure('');if(!key){setReady(true);return()=>{current=false;alive.current=false;};}AsyncStorage.getItem(key).then(raw=>{if(current){let saved={};try{saved=normalizeSeenHelp(JSON.parse(raw));}catch{}value.current=saved;setSeen(saved);}}).catch(()=>{}).finally(()=>{if(current)setReady(true);});return()=>{current=false;alive.current=false;};},[key]);
 function persist(next){value.current=next;setSeen(next);setFailure('');if(!key)return Promise.resolve(true);const job=writes.current.catch(()=>{}).then(()=>AsyncStorage.setItem(key,JSON.stringify(next)));writes.current=job;return job.then(()=>true,()=>{if(alive.current)setFailure('No se pudo guardar la ayuda en este dispositivo. Puede aparecer otra vez.');return false;});}
 function dismiss(id){if(firstUseTips[id])void persist({...value.current,[id]:true});}
 async function reset(){return persist({});}
 return <Context.Provider value={{seen,ready,enabled:enabled&&!paused,dismiss,reset,failure}}>{children}</Context.Provider>;
}
export default function FirstUseHint({id}){
 const help=useFirstUseHelp(),focused=useIsFocused(),{colors:c}=useThemeStyles(),tip=firstUseTips[id];
 if(!focused||!tip||!help?.ready||!help.enabled||help.seen[id])return null;
 return <View style={{padding:16,borderRadius:16,borderWidth:1,borderColor:c.headerBorder,backgroundColor:c.softBlue,marginBottom:16,gap:8}}>
 <Text style={{color:c.ink,fontSize:16,fontWeight:'700'}}>{tip.title}</Text>
 <Text style={{color:c.ink,fontSize:14,lineHeight:22}}>{tip.text}</Text>
 <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Entendido: ${tip.title}`} onPress={()=>help.dismiss(id)} style={{minHeight:44,alignSelf:'flex-start',justifyContent:'center',paddingHorizontal:8}}><Text style={{color:c.link,fontWeight:'700'}}>Entendido · No mostrar otra vez</Text></TouchableOpacity>
 </View>;
}
