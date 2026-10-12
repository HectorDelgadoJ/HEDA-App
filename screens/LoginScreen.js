import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useState } from 'react';

import {
  View,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { supabase } from '../services/supabase';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        'Campos incompletos',
        'Ingresa tu correo electrónico y contraseña.'
      );
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
  email: email.trim(),
  password,
});

if (error) {
  console.log('ERROR LOGIN:', error);
  Alert.alert(
    'No se pudo iniciar sesión',
    error.message
  );
  return;
}

console.log('LOGIN EXITOSO');
console.log('USUARIO:', data.user);
console.log('SESION:', data.session);

      // No necesitamos navigation.navigate().
      // AppNavigator detectará automáticamente la sesión.
    } catch (error) {
      Alert.alert(
        'Error',
        'Ocurrió un problema al iniciar sesión.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

      <Text style={styles.logo}>HEDA</Text>

      <Text style={styles.subtitle}>
        Gestión financiera inteligente
      </Text>

      <TextInput
        placeholder="Correo electrónico"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoCorrect={false}
      />

      <TextInput
        placeholder="Contraseña"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>
            Iniciar Sesión
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('Register')}
      >
        <Text style={styles.registerText}>
          ¿No tienes cuenta? Crear cuenta
        </Text>
      </TouchableOpacity>

    </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: 18,
  },

  logo: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 10,
  },

  subtitle: {
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 40,
    fontSize: 16,
  },

  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.ink,
    minHeight: 52,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },

  button: {
    backgroundColor: colors.ink,
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
    minHeight: 50,
    justifyContent: 'center',
  },

  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },

  registerText: {
    color: colors.ink,
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
});