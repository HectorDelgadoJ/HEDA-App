import {TouchableOpacity, Text} from './AccessiblePrimitives';
import React,{useEffect,useState} from 'react';

import {supabase} from '../services/supabase';
import {useThemeStyles} from '../theme/ThemeProvider';
export default function AdminEntry({navigation}){const [admin,setAdmin]=useState(false),{colors:c}=useThemeStyles();useEffect(()=>{let active=true;supabase.rpc('heda_is_admin').then(({data,error})=>{if(active)setAdmin(!error&&data===true);});const {data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT')setAdmin(false);});return()=>{active=false;subscription.unsubscribe();};},[]);return admin?<TouchableOpacity accessibilityRole="button" onPress={()=>navigation.navigate('Administracion')} style={{padding:16,borderRadius:16,backgroundColor:c.softBlue,marginBottom:12}}><Text style={{color:c.link,fontWeight:'700'}}>Administrar HEDA →</Text></TouchableOpacity>:null;}
