import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

export default function ProfileScreen() {
  const [user, setUser] = useState(null);

  const [profile, setProfile] = useState({
    full_name: '',
    username: '',
    occupation: '',
    financial_level: 'Principiante',
  });

  const [loadingLogout, setLoadingLogout] = useState(false);

  // =====================================================
  // CARGAR USUARIO + PERFIL
  // =====================================================
  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      // Obtener usuario autenticado
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.log(
          'Error obteniendo usuario:',
          userError.message
        );
        return;
      }

      if (!user) {
        return;
      }

      setUser(user);

      // Obtener perfil correspondiente al usuario
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'full_name, username, occupation, financial_level'
        )
        .eq('id', user.id)
        .single();

      if (error) {
        console.log(
          'Error obteniendo perfil:',
          error.message
        );
        return;
      }

      if (data) {
        setProfile(data);
      }

    } catch (error) {
      console.log(
        'Error inesperado cargando perfil:',
        error
      );
    }
  }

  // =====================================================
  // OBTENER INICIALES
  // =====================================================
  function getInitials(name) {
    if (!name) {
      return 'HU';
    }

    const words = name
      .trim()
      .split(' ')
      .filter(Boolean);

    if (words.length === 1) {
      return words[0]
        .substring(0, 2)
        .toUpperCase();
    }

    return (
      words[0][0] +
      words[1][0]
    ).toUpperCase();
  }

  // =====================================================
  // CERRAR SESIÓN
  // =====================================================
  async function handleLogout() {
    try {
      setLoadingLogout(true);

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        Alert.alert(
          'Error',
          'No se pudo cerrar la sesión.'
        );

        console.log(
          'Error cerrando sesión:',
          error.message
        );
      }

    } catch (error) {
      console.log(
        'Error inesperado cerrando sesión:',
        error
      );

      Alert.alert(
        'Error',
        'Ocurrió un problema al cerrar la sesión.'
      );

    } finally {
      setLoadingLogout(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* HEADER */}

        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>
              Perfil
            </Text>

            <Text style={styles.subtitle}>
              Configuración y seguridad
            </Text>
          </View>

          <TouchableOpacity
            style={styles.notificationButton}
          >
            <Ionicons
              name="settings-outline"
              size={22}
              color={colors.ink}
            />
          </TouchableOpacity>
        </View>


        {/* TARJETA USUARIO */}

        <View style={styles.profileCard}>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(profile.full_name)}
            </Text>
          </View>

          <View style={{ flex: 1 }}>

            <Text style={styles.userName}>
              {profile.full_name ||
                'Usuario HEDA'}
            </Text>

            <Text style={styles.userEmail}>
              {user?.email || 'Cargando...'}
            </Text>

            {profile.username ? (
              <Text style={styles.username}>
                @{profile.username}
              </Text>
            ) : null}

            <View style={styles.badge}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color={colors.primary}
              />

              <Text style={styles.badgeText}>
                Cuenta activa
              </Text>
            </View>

          </View>
        </View>


        {/* NIVEL FINANCIERO */}

        <View style={styles.levelCard}>

          <View style={styles.levelHeader}>

            <View style={styles.levelIcon}>
              <Ionicons
                name="school-outline"
                size={24}
                color={colors.primary}
              />
            </View>

            <View style={{ flex: 1 }}>

              <Text style={styles.cardTitle}>
                Perfil financiero
              </Text>

              <Text style={styles.cardText}>
                Nivel de conocimiento:{' '}
                {profile.financial_level ||
                  'Principiante'}
              </Text>

            </View>
          </View>

          <View style={styles.progressBackground}>
            <View style={styles.progressFill} />
          </View>

          <Text style={styles.progressText}>
            Tu perfil ayuda a personalizar
            recomendaciones, alertas y contenido
            educativo.
          </Text>

        </View>


        {/* RESUMEN */}

        <View style={styles.statsRow}>

          <StatCard
            title="Movimientos"
            value="0"
            icon="wallet-outline"
          />

          <StatCard
            title="Metas"
            value="0"
            icon="flag-outline"
          />

          <StatCard
            title="Alertas"
            value="0"
            icon="notifications-outline"
          />

        </View>


        {/* CUENTA */}

        <Text style={styles.sectionTitle}>
          Cuenta
        </Text>

        <OptionItem
          icon="person-outline"
          title="Editar perfil"
          subtitle="Nombre, correo, ocupación y datos generales"
        />

        <OptionItem
          icon="lock-closed-outline"
          title="Seguridad"
          subtitle="Contraseña, sesión y autenticación"
        />

        <OptionItem
          icon="notifications-outline"
          title="Notificaciones"
          subtitle="Alertas, metas, presupuestos y recomendaciones"
        />


        {/* FINANZAS */}

        <Text style={styles.sectionTitle}>
          Preferencias financieras
        </Text>

        <OptionItem
          icon="cash-outline"
          title="Ingresos y hábitos"
          subtitle="Nivel de ingresos, frecuencia de ahorro y gastos"
        />

        <OptionItem
          icon="sparkles-outline"
          title="Personalización IA"
          subtitle="Ajustar recomendaciones y contenido educativo"
        />

        <OptionItem
          icon="trending-up-outline"
          title="Ethereum informativo"
          subtitle="Preferencias del módulo predictivo y advertencias"
        />


        {/* PRIVACIDAD */}

        <Text style={styles.sectionTitle}>
          Privacidad y soporte
        </Text>

        <OptionItem
          icon="shield-outline"
          title="Privacidad de datos"
          subtitle="Información financiera y protección de cuenta"
        />

        <OptionItem
          icon="help-circle-outline"
          title="Ayuda"
          subtitle="Preguntas frecuentes y soporte del sistema"
        />

        <OptionItem
          icon="document-text-outline"
          title="Términos y aviso de privacidad"
          subtitle="Uso responsable de la plataforma"
        />


        {/* INFORMACIÓN */}

        <View style={styles.infoCard}>

          <Ionicons
            name="information-circle-outline"
            size={22}
            color={colors.primary}
          />

          <Text style={styles.infoText}>
            HEDA protege tu información financiera y
            utiliza tus datos únicamente para mostrar
            reportes, recomendaciones y alertas dentro
            del prototipo académico.
          </Text>

        </View>


        {/* CERRAR SESIÓN */}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loadingLogout}
          activeOpacity={0.8}
        >

          <Ionicons
            name="log-out-outline"
            size={21}
            color="#D71920"
          />

          <Text style={styles.logoutText}>
            {loadingLogout
              ? 'Cerrando sesión...'
              : 'Cerrar sesión'}
          </Text>

        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}


// =====================================================
// STAT CARD
// =====================================================

function StatCard({
  title,
  value,
  icon,
}) {
  return (
    <View style={styles.statCard}>

      <View style={styles.statIcon}>
        <Ionicons
          name={icon}
          size={21}
          color={colors.primary}
        />
      </View>

      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statTitle}>
        {title}
      </Text>

    </View>
  );
}


// =====================================================
// OPTION ITEM
// =====================================================

function OptionItem({
  icon,
  title,
  subtitle,
}) {
  return (
    <TouchableOpacity
      style={styles.optionCard}
      activeOpacity={0.8}
    >

      <View style={styles.optionLeft}>

        <View style={styles.optionIcon}>
          <Ionicons
            name={icon}
            size={22}
            color={colors.primary}
          />
        </View>

        <View style={{ flex: 1 }}>

          <Text style={styles.optionTitle}>
            {title}
          </Text>

          <Text style={styles.optionSubtitle}>
            {subtitle}
          </Text>

        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color="#9CA3AF"
      />

    </TouchableOpacity>
  );
}


// =====================================================
// ESTILOS
// =====================================================

const styles = StyleSheet.create({

  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: 18,
    paddingBottom: 28,
  },

  header: {
    marginTop: 2,
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  logo: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.ink,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.muted,
  },

  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },

  profileCard: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 76,
    height: 76,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },

  avatarText: {
    fontSize: 21,
    fontWeight: '700',
    color: colors.primary,
  },

  userName: {
    fontSize: 23,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  userEmail: {
    marginTop: 4,
    fontSize: 14,
    color: '#DCEEFF',
  },

  username: {
    marginTop: 3,
    fontSize: 13,
    color: '#DCEEFF',
    fontWeight: '700',
  },

  badge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },

  badgeText: {
    marginLeft: 5,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },

  levelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    elevation: 2,
  },

  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  levelIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
  },

  cardText: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },

  progressBackground: {
    height: 9,
    backgroundColor: '#DDEBFA',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
  },

  progressFill: {
    width: '35%',
    height: '100%',
    backgroundColor: colors.ink,
    borderRadius: 18,
  },

  progressText: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    fontWeight: '600',
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  statCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    elevation: 2,
  },

  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },

  statTitle: {
    marginTop: 3,
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
    textAlign: 'center',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 14,
    marginTop: 6,
  },

  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 17,
    marginBottom: 13,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },

  optionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },

  infoCard: {
    marginTop: 8,
    backgroundColor: colors.softBlue,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D7EAFE',
    marginBottom: 18,
  },

  infoText: {
    flex: 1,
    marginLeft: 10,
    color: '#24527A',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },

  logoutButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#F2B8B5',
    marginTop: 2,
  },

  logoutText: {
    marginLeft: 8,
    color: '#D71920',
    fontSize: 16,
    fontWeight: '700',
  },

});