import React,{createContext,useContext,useEffect,useMemo,useState} from 'react';
import {AccessibilityInfo,Platform} from 'react-native';
import {accessibilityDefaults} from '../utils/experience';
const Context=createContext(accessibilityDefaults);
export const useAccessibility=()=>useContext(Context);
export default function AccessibilityProvider({options,children}){const [systemReduce,setSystemReduce]=useState(false);useEffect(()=>{let active=true;void AccessibilityInfo.isReduceMotionEnabled().then(v=>{if(active)setSystemReduce(v);}).catch(()=>{});const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',setSystemReduce);return()=>{active=false;sub.remove();};},[]);const value=useMemo(()=>({...accessibilityDefaults,...options,reduceMotion:systemReduce||options?.reduceMotion===true}),[options,systemReduce]);useEffect(()=>{if(Platform.OS!=='web')return;const root=document.documentElement;root.dataset.hedaReducedMotion=value.reduceMotion?'true':'false';root.dataset.hedaContrast=value.highContrast?'high':'default';},[value.reduceMotion,value.highContrast]);return <Context.Provider value={value}>{children}</Context.Provider>;}
