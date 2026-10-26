import AsyncStorage from '@react-native-async-storage/async-storage';
import {financialAlerts} from '../utils/alerts';
import { Platform } from 'react-native';
import { reminderPlan } from '../utils/reminders';
// Lazy import keeps browsers and Expo Go Android (remote push unavailable) from registering push tokens.
let modulePromise;
export const notifications = () => modulePromise ||= import('expo-notifications').then(api => {
  api.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false})});
  return api;
});
let queue = Promise.resolve();
export function reconcileReminders(userId, data, current = () => true) {
  const run = async () => {
    if (Platform.OS === 'web' || !current()) return { count: 0, total: 0 };
    const api = await notifications();
    const all = await api.getAllScheduledNotificationsAsync();
    const permission = await api.getPermissionsAsync();
    const allowed = permission.granted || permission.ios?.status === api.IosAuthorizationStatus.PROVISIONAL;
    const plan = userId && data && allowed ? reminderPlan(data) : [];
    // Reserve space below iOS' limit. Show overflow in settings instead of hiding it.
    const wanted = new Map(plan.slice(0,60).map(item => [item.key,item]));
    const keep = new Set();
    for (const item of [...all]) {
      const meta = item.content.data;
      if (meta?.hedaReminder !== true) continue;
      if (allowed && meta.owner === userId && meta.test === true && Number(meta.expiresAt) > Date.now()) continue;
      if (meta.owner === userId && wanted.has(meta.key) && !keep.has(meta.key)) keep.add(meta.key);
      else await api.cancelScheduledNotificationAsync(item.identifier);
    }
    const delivered = await api.getPresentedNotificationsAsync();
    for (const item of delivered) if (item.request.content.data?.hedaReminder && item.request.content.data.owner !== userId) await api.dismissNotificationAsync(item.request.identifier);
    if (!current()) return { count: 0, total: 0 };
    for (const [key,item] of wanted) {
      if (!current()) break;
      if (!keep.has(key)) await api.scheduleNotificationAsync({
        content: { title:item.title, body:item.body, sound:'default', data:{hedaReminder:true,owner:userId,key,kind:item.kind} },
        trigger: {type:api.SchedulableTriggerInputTypes.DATE,date:new Date(item.at),...(Platform.OS==='android'?{channelId:'heda-reminders'}:{})},
      });
    }
    return {count:wanted.size,total:plan.length,allowed};
  };
  const next = queue.then(run,run); queue = next.catch(()=>{}); return next;
}
export async function requestReminderPermission() {
  const api=await notifications();
  api.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false})});
  if (Platform.OS==='android') await api.setNotificationChannelAsync('heda-reminders',{name:'Pagos y metas',importance:api.AndroidImportance.DEFAULT});
  return api.requestPermissionsAsync();
}

// On startup keep this account's existing schedule even if the network is offline.
export function clearForeignReminders(userId) {
  const run=async()=>{
    if(Platform.OS==='web')return;
    const api=await notifications();
    for(const item of await api.getAllScheduledNotificationsAsync())if(item.content.data?.hedaReminder && item.content.data.owner!==userId)await api.cancelScheduledNotificationAsync(item.identifier);
    for(const item of await api.getPresentedNotificationsAsync())if(item.request.content.data?.hedaReminder && item.request.content.data.owner!==userId)await api.dismissNotificationAsync(item.request.identifier);
  };
  const next=queue.then(run,run);queue=next.catch(()=>{});return next;
}

// Account deletion clears only this owner's scheduled and delivered HEDA reminders.
export function cancelAccountReminders(userId){
 const run=async()=>{
  if(Platform.OS==='web')return;
  const api=await notifications();
  for(const item of await api.getAllScheduledNotificationsAsync())if(item.content.data?.hedaReminder&&item.content.data.owner===userId)await api.cancelScheduledNotificationAsync(item.identifier);
  for(const item of await api.getPresentedNotificationsAsync())if(item.request.content.data?.hedaReminder&&item.request.content.data.owner===userId)await api.dismissNotificationAsync(item.request.identifier);
 };
 const next=queue.then(run,run);queue=next.catch(()=>{});return next;
}

export async function notifyPatternAlerts(userId,data,current=()=>true){
 if(Platform.OS==='web'||!current())return;const api=await notifications(),permission=await api.getPermissionsAsync();if(!permission.granted&&permission.ios?.status!==api.IosAuthorizationStatus.PROVISIONAL)return;
 const alerts=financialAlerts(data).filter(a=>['Presupuestos','Hábitos','Recomendaciones','Ethereum'].includes(a.type)),key=`heda:noticed:v1:${userId}`,raw=await AsyncStorage.getItem(key),sent=new Set(raw?JSON.parse(raw):[]);let count=0;
 for(const a of alerts){if(sent.has(a.id)||!current())continue;if(count>=3)break;await api.scheduleNotificationAsync({identifier:`heda-pattern:${userId}:${a.id}`,content:{title:'HEDA · Revisa tus alertas',body:'Hay una actualización sobre tus registros. Abre HEDA para revisarla.',data:{hedaReminder:true,owner:userId,key:a.id,kind:'pattern'}},trigger:null});sent.add(a.id);count++;await AsyncStorage.setItem(key,JSON.stringify([...sent].slice(-1000)));}
}
