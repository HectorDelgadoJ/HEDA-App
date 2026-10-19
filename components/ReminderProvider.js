import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { accountRows } from '../services/finance';
import { onFinanceChange } from '../services/financeEvents';
import { notifications, reconcileReminders, requestReminderPermission, clearForeignReminders } from '../services/phoneReminders';
const Context=createContext(null);
export const useReminders=()=>useContext(Context);
export default function ReminderProvider({userId,children}) {
  const [enabled,setEnabled]=useState(false), [busy,setBusy]=useState(true), [status,setStatus]=useState('Activa los recordatorios en este teléfono.'), [count,setCount]=useState(0);
  const active=useRef(true), enabledRef=useRef(false), running=useRef(false), again=useRef(false), setting=useRef(false);
  const storageKey=`heda:phone-reminders:v1:${userId}`;
  const refresh=useCallback(async()=>{
    if (!active.current || !userId || !enabledRef.current || Platform.OS==='web') return;
    if (running.current) {again.current=true;return;}
    running.current=true;
    try {
      const tables=[['rules','recurring_movements','id,active,next_date'],['cards','card_payments','id,reminder,ledger_enabled,opening_balance,amount,paid,due_date'],['rows','transactions','id,amount,type,card_id,is_card_payment,transaction_date,recurring_movement_id,recurring_date'],['goals','goals','id,status,current_amount,target_amount,target_date']];
      const results=await Promise.all(tables.map(async([key,table,columns])=>{const result=await accountRows(table,columns,userId);if(result.error) throw new Error('No pudimos actualizar tus recordatorios. Conservamos los anteriores; reintenta.');return [key,result.data];}));
      const {data:{session}}=await supabase.auth.getSession();
      if(!active.current || !enabledRef.current || session?.user?.id!==userId) return;
      const result=await reconcileReminders(userId,Object.fromEntries(results),()=>active.current && enabledRef.current);
      if(active.current) {setCount(result.count);setStatus(!result.allowed?'Permiso desactivado. Abre Ajustes para permitir notificaciones.':result.total>60?'Se programaron los próximos 60 avisos. Abre HEDA para renovar los siguientes.':result.count?`${result.count} avisos programados · 9:00 a. m., un día antes y el día indicado.`:'No hay fechas futuras pendientes. Los vencidos se revisan en Alertas.');}
    } catch(error) {if(active.current)setStatus(error.message || 'No pudimos programar los avisos. Reintenta.');}
    finally {running.current=false;if(again.current && active.current){again.current=false;void refresh();}}
  },[userId]);
  useEffect(()=>{
    active.current=true;
    // Clear only foreign schedules; preserve existing reminders if startup is offline.
    void clearForeignReminders(userId).then(()=>AsyncStorage.getItem(storageKey)).then(value=>{
      if(!active.current)return;enabledRef.current=value==='true';setEnabled(enabledRef.current);if(enabledRef.current)void refresh();else void reconcileReminders(null,null).catch(()=>{});
    }).catch(()=>{if(active.current)setStatus('No pudimos recuperar los recordatorios. Actívalos de nuevo.');}).finally(()=>{if(active.current)setBusy(false);});
    const foreground=AppState.addEventListener('change',state=>{if(state==='active')void refresh();});
    const unsubscribe=onFinanceChange(()=>void refresh());
    const timer=setInterval(()=>{if(AppState.currentState==='active')void refresh();},60000);
    return ()=>{active.current=false;enabledRef.current=false;foreground.remove();unsubscribe();clearInterval(timer);void reconcileReminders(null,null).catch(()=>{});};
  },[refresh,storageKey]);
  async function toggle(value) {
    if(setting.current || busy || !userId || Platform.OS==='web')return;
    setting.current=true;setBusy(true);
    try {
      if(value){const permission=await requestReminderPermission();const api=await notifications();if(!permission.granted && permission.ios?.status!==api.IosAuthorizationStatus.PROVISIONAL){setStatus('No se concedió permiso. Puedes habilitarlo en Ajustes del teléfono.');return;}}
      await AsyncStorage.setItem(storageKey,String(value));
      if(!active.current)return;enabledRef.current=value;setEnabled(value);
      if(value)await refresh();else{await reconcileReminders(null,null);if(active.current){setCount(0);setStatus('Recordatorios del teléfono desactivados.');}}
    } catch {if(active.current)setStatus('No se guardó el cambio. Reintenta.');}
    finally {setting.current=false;if(active.current)setBusy(false);}
  }
  async function test() {
    if(!active.current || !enabledRef.current || busy)return;
    try {
      const api=await notifications();
      if(!active.current || !enabledRef.current)return;
      const id=await api.scheduleNotificationAsync({content:{title:'HEDA · Prueba',body:'Este es un aviso de prueba.',data:{hedaReminder:true,owner:userId,key:'test',test:true,expiresAt:Date.now()+30000}},trigger:{type:api.SchedulableTriggerInputTypes.TIME_INTERVAL,seconds:10,...(Platform.OS==='android'?{channelId:'heda-reminders'}:{})}});
      if(!active.current || !enabledRef.current){await api.cancelScheduledNotificationAsync(id);return;}
      setStatus('Prueba programada para dentro de 10 segundos.');
    }catch{if(active.current)setStatus('No pudimos programar la prueba. Revisa el permiso y reintenta.');}
  }
  return <Context.Provider value={{enabled,busy,status,count,toggle,refresh,test,supported:Platform.OS!=='web'}}>{children}</Context.Provider>;
}
