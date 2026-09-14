import { useState } from 'react';

import {
  View,
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
    <View style={styles.container}>

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

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A84FF',
    justifyContent: 'center',
    padding: 25,
  },

  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },

  subtitle: {
    color: 'white',
    textAlign: 'center',
    marginBottom: 40,
    fontSize: 16,
  },

  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },

  button: {
    backgroundColor: '#001F54',
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
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
});