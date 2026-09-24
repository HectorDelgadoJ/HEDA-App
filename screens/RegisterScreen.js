import { useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { supabase } from '../services/supabase';

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // =====================================================
  // REGISTRAR USUARIO
  // =====================================================
  async function handleRegister() {
    const cleanFullName = fullName.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Validar campos vacíos
    if (
      !cleanFullName ||
      !cleanUsername ||
      !cleanEmail ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert(
        'Campos incompletos',
        'Completa todos los campos.'
      );
      return;
    }

    // Validar longitud del nombre de usuario
    if (cleanUsername.length < 3) {
      Alert.alert(
        'Nombre de usuario inválido',
        'El nombre de usuario debe tener al menos 3 caracteres.'
      );
      return;
    }

    // Validar caracteres del username
    const usernameRegex = /^[a-z0-9._]+$/;

    if (!usernameRegex.test(cleanUsername)) {
      Alert.alert(
        'Nombre de usuario inválido',
        'Utiliza únicamente letras, números, puntos o guiones bajos.'
      );
      return;
    }

    // Validar contraseña
    if (password !== confirmPassword) {
      Alert.alert(
        'Contraseñas diferentes',
        'Las contraseñas no coinciden.'
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        'Contraseña muy corta',
        'La contraseña debe tener al menos 6 caracteres.'
      );
      return;
    }

    try {
      setLoading(true);

      // =====================================================
      // CREAR USUARIO EN SUPABASE AUTH
      // =====================================================
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,

        options: {
          data: {
            full_name: cleanFullName,
            username: cleanUsername,
          },
        },
      });

      if (error) {
        console.log(
          'Error registrando usuario:',
          error.message
        );

        Alert.alert(
          'No se pudo crear la cuenta',
          error.message
        );

        return;
      }

      console.log(
        'Usuario creado:',
        data.user?.id
      );

      /*
       * Nuestro trigger de Supabase hará automáticamente:
       *
       * auth.users
       *      ↓
       * public.profiles
       *
       * y copiará:
       *
       * full_name
       * username
       */

      // =====================================================
      // SI SUPABASE ENTREGA SESIÓN
      // =====================================================
      if (data.session) {
        /*
         * No necesitamos navigation.navigate().
         *
         * AppNavigator detectará automáticamente
         * la nueva sesión y mostrará la aplicación.
         */
        return;
      }

      // =====================================================
      // SI EN EL FUTURO ACTIVAMOS CONFIRMACIÓN POR CORREO
      // =====================================================
      Alert.alert(
        'Cuenta creada',
        'Tu cuenta fue creada. Revisa tu correo electrónico para confirmar tu cuenta.',
        [
          {
            text: 'Aceptar',
            onPress: () => navigation.goBack(),
          },
        ]
      );

    } catch (error) {
      console.log(
        'Error inesperado registrando usuario:',
        error
      );

      Alert.alert(
        'Error',
        'Ocurrió un problema al crear la cuenta.'
      );

    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.logo}>
          HEDA
        </Text>

        <Text style={styles.subtitle}>
          Crea tu cuenta
        </Text>

        {/* NOMBRE COMPLETO */}
        <TextInput
          placeholder="Nombre completo"
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          autoCorrect={false}
        />

        {/* NOMBRE DE USUARIO */}
        <TextInput
          placeholder="Nombre de usuario"
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* CORREO */}
        <TextInput
          placeholder="Correo electrónico"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
        />

        {/* CONTRASEÑA */}
        <TextInput
          placeholder="Contraseña"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        {/* CONFIRMAR CONTRASEÑA */}
        <TextInput
          placeholder="Confirmar contraseña"
          secureTextEntry
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {/* BOTÓN CREAR CUENTA */}
        <TouchableOpacity
          style={[
            styles.button,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              Crear cuenta
            </Text>
          )}
        </TouchableOpacity>

        {/* REGRESAR AL LOGIN */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.loginText}>
            Ya tengo una cuenta
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#0A84FF',
  },

  container: {
    flexGrow: 1,
    backgroundColor: '#0A84FF',
    justifyContent: 'center',
    padding: 25,
    paddingVertical: 45,
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
    marginBottom: 35,
    fontSize: 16,
  },

  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    fontSize: 16,
  },

  button: {
    backgroundColor: '#001F54',
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
    minHeight: 50,
    justifyContent: 'center',
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },

  loginText: {
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
});