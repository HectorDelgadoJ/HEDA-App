import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

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

function TabsNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarActiveTintColor: '#0A84FF',
        tabBarInactiveTintColor: '#8A8A8A',

        tabBarStyle: {
          height: 65 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 10),
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          elevation: 8,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: Platform.OS === 'android' ? 2 : 0,
        },

        tabBarIconStyle: {
          marginTop: 2,
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

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      {/* Pantallas principales del menú inferior */}
      <Tab.Screen name="Inicio" component={DashboardScreen} />
      <Tab.Screen name="Movimientos" component={ExpensesScreen} />
      <Tab.Screen name="IA" component={EducationScreen} />
      <Tab.Screen name="Reportes" component={GoalsScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />

      {/* Pantallas ocultas, navegables desde botones internos */}
      <Tab.Screen
        name="Ethereum"
        component={EthereumScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />

      <Tab.Screen
        name="QR"
        component={QRScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />

      <Tab.Screen
        name="EducacionFinanciera"
        component={FinancialEducationScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />

      <Tab.Screen
        name="Habitos"
        component={HabitsScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="Alertas"
        component={AlertsScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <TabsNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}