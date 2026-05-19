import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import DashboardScreen from '../screens/DashboardScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import GoalsScreen from '../screens/GoalsScreen';
import EducationScreen from '../screens/EducationScreen';
import EthereumScreen from '../screens/EthereumScreen';
import QRScreen from '../screens/QRScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Inicio" component={DashboardScreen} />
        <Tab.Screen name="Gastos" component={ExpensesScreen} />
        <Tab.Screen name="Metas" component={GoalsScreen} />
        <Tab.Screen name="Educación" component={EducationScreen} />
        <Tab.Screen name="Ethereum" component={EthereumScreen} />
        <Tab.Screen name="QR" component={QRScreen} />
        <Tab.Screen name="Perfil" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}