import {FirstUseHelpProvider} from './FirstUseHint';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Modal, TouchableOpacity, Text} from './AccessiblePrimitives';
import GoogleProfileGate from './GoogleProfileGate';
import WebInstallProvider from './WebInstallProvider';
import AppDialogs from './AppDialogs';
import {welcomeStage} from '../utils/welcome';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {View, ActivityIndicator} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { normalizeExperience } from '../utils/experience';
import ExperienceForm from './ExperienceForm';
import { lightColors, darkColors } from '../theme/colors';
import ThemeProvider, { useThemeStyles } from '../theme/ThemeProvider';
const Context = createContext(null);
export const useExperience = () => useContext(Context);

export default function ExperienceProvider({ user, children }) {
  // The keyed provider is recreated when the authenticated account changes.
  const [preferences, setPreferences] = useState(() => normalizeExperience(user?.user_metadata?.heda_experience));
  const [profileReady, setProfileReady] = useState(!user);
  const [ready, setReady] = useState(!user);
  const [manualTour,setManualTour]=useState(false),[tourRun,setTourRun]=useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false),[settingsSection,setSettingsSection]=useState('view');
  const [previewTheme, setPreviewTheme] = useState(null);
  const colors = (previewTheme || preferences.theme) === 'dark' ? darkColors : lightColors;
  const [deferred, setDeferred] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false), active = useRef(true), revision = useRef(0);
  const userId = user?.id;
  useEffect(() => {
    active.current = true;
    const version = revision.current;
    const fallback = setTimeout(() => { if (active.current) setReady(true); }, 8000);
    if(!userId)void AsyncStorage.getItem('heda:guest-accessibility:v1').then(raw=>{if(active.current&&revision.current===version&&raw){const saved=JSON.parse(raw);setPreferences(normalizeExperience({...preferences,accessibility:saved.accessibility,theme:saved.theme}));}}).catch(()=>{});
    if (userId) supabase.auth.getUser().then(({ data, error }) => {
      if (active.current && revision.current === version && !error && data.user?.id === userId) setPreferences(normalizeExperience(data.user.user_metadata?.heda_experience));
    }).catch(() => {}).finally(() => { if (active.current) setReady(true); });
    return () => { clearTimeout(fallback); active.current = false; revision.current++; };
  }, [userId]);
  async function savePreferences(next) {
    if(busy.current)return false;if(!userId){revision.current++;const guest=normalizeExperience({...next,version:1});try{await AsyncStorage.setItem('heda:guest-accessibility:v1',JSON.stringify({accessibility:guest.accessibility,theme:guest.theme}));setPreferences(guest);setPreviewTheme(null);setSettingsOpen(false);return true;}catch{setError('No se pudieron guardar los ajustes en este dispositivo. Reintenta.');return false;}}
    busy.current = true; setSaving(true); setError(''); revision.current++;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!active.current || sessionData.session?.user?.id !== userId) throw new Error('Tu sesión cambió. Vuelve a abrir la app.');
      const normalized = normalizeExperience({ ...next, configured: true, welcomeDone:true, version: 1 });
      const { data, error } = await supabase.auth.updateUser({ data: { heda_experience: normalized } });
      if (error || data.user?.id !== userId) throw new Error('No pudimos guardar tus preferencias. Revisa tu conexión e inténtalo de nuevo.');
      if (!active.current) return false;
      setPreferences(normalized); setPreviewTheme(null); setSettingsOpen(false); setDeferred(false); return true;
    } catch (failure) { if (active.current) setError(failure.message); return false; }
    finally { busy.current = false; if (active.current) setSaving(false); }
  }
  const stage=welcomeStage(preferences,{ready,deferred});
  const onboarding=!!userId&&stage==='personalize';
  const tourOpen=!!userId&&profileReady&&ready&&!onboarding&&!settingsOpen&&(manualTour||stage==='tour');
  async function finishTour(){const saved=await savePreferences({...preferences,tourDone:true});if(saved)setManualTour(false);return saved;}
  function openTour(){setError('');setTourRun(value=>value+1);setManualTour(true);}
  return <ThemeProvider theme={previewTheme || preferences.theme} accessibility={preferences.accessibility}><Context.Provider value={{ preferences, tourOpen,tourRun,finishTour,openTour,saving,error, simple: preferences.mode === 'simple', openSettings: (section='view') => {setSettingsSection(section);setError(''); setPreviewTheme(null); setSettingsOpen(true); }, savePreferences }}>
    <FirstUseHelpProvider ownerId={userId} enabled={preferences.guidance.firstUse} paused={!ready||onboarding||tourOpen||settingsOpen}><WebInstallProvider><GoogleProfileGate key={userId||'guest'} user={user} onReady={setProfileReady}>{children}</GoogleProfileGate><AppDialogs/>
    <Modal visible={settingsOpen || !!userId && profileReady && (!ready || onboarding)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { if (!saving) { setPreviewTheme(null); if(onboarding){void savePreferences({...preferences,tourDone:true});}else{setSettingsOpen(false);} } }}>
      <SafeAreaProvider><SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {!ready ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View> : <ExperienceForm key={settingsOpen ? 'settings' : 'onboarding'} initial={preferences} onboarding={!settingsOpen} initialSection={settingsSection} saving={saving} error={error} onSave={savePreferences} onPreviewTheme={setPreviewTheme} onClose={() => { setPreviewTheme(null); setSettingsOpen(false); }} />}
        {error && onboarding ? <View style={{ paddingHorizontal: 22, paddingBottom: 12 }}><Defer onPress={() => { setPreviewTheme(null); setDeferred(true); setError(''); }} /></View> : null}
      </SafeAreaView></SafeAreaProvider>
    </Modal></WebInstallProvider></FirstUseHelpProvider>
  </Context.Provider></ThemeProvider>;
}
function Defer({ onPress }) { const { colors } = useThemeStyles(); return <TouchableOpacity accessibilityRole="button" style={{ padding: 14 }} onPress={onPress}><Text style={{ color: colors.primary, textAlign: 'center' }}>Continuar sin guardar por ahora</Text></TouchableOpacity>; }
