import { oauthFailureReason } from '../utils/oauth';
import {Alert} from '../services/alerts';
import RecoverPasswordScreen from '../screens/RecoverPasswordScreen';
import GuidedTour from '../components/GuidedTour';
import { dismissAuthKeyboard } from '../services/keyboard';
import { completeGoogleSignIn, googleRedirectUri } from '../services/googleAuth';
import { notifications } from '../services/phoneReminders';
import ReminderProvider from '../components/ReminderProvider';
import { useThemeStyles, themeStyle, themeColor } from "../theme/ThemeProvider";
import ExperienceProvider from '../components/ExperienceProvider';
import { colors } from '../theme/colors';
import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Linking, Text } from 'react-native';

import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets } from
'react-native-safe-area-context';

import { supabase } from '../services/supabase';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

import DashboardScreen from '../screens/DashboardScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import GoalsScreen from '../screens/GoalsScreen';
import EducationScreen from '../screens/EducationScreen';
import EthereumScreen from '../screens/EthereumScreen';
import QRScreen from '../screens/QRScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FinancialEducationScreen from '../screens/FinancialEducationScreen';
import HabitsScreen from '../screens/HabitsScreen';
import AlertsScreen from '../screens/AlertsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabsNavigator() {
  const { colors } = useThemeStyles();
  const insets = useSafeAreaInsets();

  return (
    <View style={{flex:1}}><Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarActiveTintColor: colors.link,
        tabBarInactiveTintColor: colors.muted,

        tabBarStyle: {
          height: (Platform.OS==='web'?72:56) + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 6),
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 8
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: Platform.OS === 'android' ? 2 : 0
        },

        tabBarIconStyle: {
          marginTop: 2
        },

        tabBarHideOnKeyboard: true,

        tabBarIcon: ({ focused, color }) => {
          let iconName = 'ellipse-outline';

          if (route.name === 'Inicio') {
            iconName = focused ? 'home' : 'home-outline';
          }

          if (route.name === 'Movimientos') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          }

          if (route.name === 'IA') {
            iconName = focused ? 'sparkles' : 'sparkles-outline';
          }

          if (route.name === 'Reportes') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          }

          if (route.name === 'Perfil') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={22} color={themeColor(color, colors)} />;
        }
      })}>

      <Tab.Screen name="Inicio" component={DashboardScreen} />
      <Tab.Screen name="Movimientos" component={ExpensesScreen} />
      <Tab.Screen name="IA" component={EducationScreen} />
      <Tab.Screen name="Reportes" component={GoalsScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />

      <Tab.Screen
        name="Ethereum"
        component={EthereumScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' }
        }} />


      <Tab.Screen
        name="QR"
        component={QRScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' }
        }} />

      <Tab.Screen
        name="EducacionFinanciera"
        component={FinancialEducationScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' }
        }} />


      <Tab.Screen
        name="Habitos"
        component={HabitsScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' }
        }} />


      <Tab.Screen
        name="Alertas"
        component={AlertsScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' }
        }} />


    </Tab.Navigator><GuidedTour/></View>);

}

export default function AppNavigator() {
  const { colors } = useThemeStyles();
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const keyboardOwner=useRef(null);
  useEffect(()=>{dismissAuthKeyboard();},[session?.user?.id]);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') {
        const callbackUrl = new URL(window.location.href);
        const returning = callbackUrl.searchParams.has('code') || callbackUrl.searchParams.has('error') || callbackUrl.hash.includes('error=');
        if (returning) {
          const { error } = await supabase.auth.initialize();
          const { data } = await supabase.auth.getSession();
          if (error || !data.session) {
            // Never display or log callback codes, tokens, or provider error descriptions.
            Alert.alert('No se completó el acceso con Google', oauthFailureReason(error, callbackUrl.href));
            callbackUrl.searchParams.delete('code');
            for (const key of ['error', 'error_code', 'error_description']) callbackUrl.searchParams.delete(key);
            callbackUrl.hash = '';
            window.history.replaceState({}, '', callbackUrl.pathname + callbackUrl.search);
          }
          return { data };
        }
      }
      return supabase.auth.getSession();
    })().then(({ data }) => {
      setSession(data.session);
      setLoadingSession(false);
    }).catch(()=>{setLoadingSession(false);Alert.alert('Acceso protegido','No pudimos abrir la sesión guardada. Desbloquea el teléfono y vuelve a iniciar sesión.');});

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const nextOwner=newSession?.user?.id||null;
      if(keyboardOwner.current!==nextOwner){dismissAuthKeyboard();keyboardOwner.current=nextOwner;}
      setSession(newSession);
    });

    const callback=url=>{
      if(Platform.OS==='web'||!url||!url.startsWith(googleRedirectUri()))return;
      void completeGoogleSignIn(url).catch(()=>Alert.alert('Acceso con Google','No pudimos completar el acceso. Vuelve a intentarlo desde Iniciar sesión.'));
    };
    const linking=Linking.addEventListener('url',event=>callback(event.url));
    if(Platform.OS!=='web')void Linking.getInitialURL().then(callback).catch(()=>{});
    return () => {
      linking.remove();
      subscription.unsubscribe();
    };
  }, []);

  if (loadingSession) {
    return (
      <SafeAreaProvider>
        <View
          style={themeStyle({
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.primary
          }, colors)}>

          <ActivityIndicator size="large" color={themeColor("#FFFFFF", colors)} />
        </View>
      </SafeAreaProvider>);

  }

  return (
    <SafeAreaProvider>
      <ExperienceProvider key={session?.user?.id || 'guest'} user={session?.user}><ReminderProvider userId={session?.user?.id}><ThemedNavigation>
        <View style={{flex:1,width:'100%',maxWidth:Platform.OS==='web'?1000:undefined,alignSelf:'center'}}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {session ?
            <Stack.Screen name="App" component={TabsNavigator} /> :

            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="RecoverPassword" component={RecoverPasswordScreen} />
            </>
            }
        </Stack.Navigator></View>
      </ThemedNavigation></ReminderProvider></ExperienceProvider>
    </SafeAreaProvider>);

}
function ThemedNavigation({ children }) {
  const navigationRef=useRef(null), lastTap=useRef(null), pendingTap=useRef(null);
  async function openNotice(response){
    const request=response?.notification?.request;
    const meta=request?.content?.data;
    if(!meta?.hedaReminder || lastTap.current===request.identifier)return;
    if(!navigationRef.current?.isReady()){pendingTap.current=response;return;}
    const {data:{session}}=await supabase.auth.getSession();
    if(session?.user?.id===meta.owner){lastTap.current=request.identifier;navigationRef.current.navigate('App',{screen:'Alertas'});}
  }
  useEffect(()=>{
    if(Platform.OS==='web')return;
    let active=true,subscription;
    void notifications().then(async api=>{
      if(!active)return;
      subscription=api.addNotificationResponseReceivedListener(response=>{if(active)void openNotice(response).catch(()=>{});});
      const last=await api.getLastNotificationResponseAsync();if(active && last)await openNotice(last);
    }).catch(()=>{});
    return()=>{active=false;subscription?.remove();};
  },[]);
  const { colors } = useThemeStyles();
  const base = colors.dark ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, primary: colors.link, background: colors.background, card: colors.surface, text: colors.ink, border: colors.border, notification: colors.primary } };
  return <NavigationContainer ref={navigationRef} onReady={()=>{if(pendingTap.current){void openNotice(pendingTap.current).catch(()=>{});pendingTap.current=null;}}} theme={theme}>{children}</NavigationContainer>;
}
