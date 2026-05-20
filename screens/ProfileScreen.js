import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>Perfil</Text>
            <Text style={styles.subtitle}>Cuenta, seguridad y preferencias</Text>
          </View>

          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="settings-outline" size={22} color="#062B5F" />
          </TouchableOpacity>
        </View>

        {/* PERFIL PRINCIPAL */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>VD</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>Vicente David</Text>
            <Text style={styles.userEmail}>vicente@heda.app</Text>

            <View style={styles.badge}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#0A84FF" />
              <Text style={styles.badgeText}>Cuenta protegida</Text>
            </View>
          </View>
        </View>

        {/* PERFIL FINANCIERO */}
        <View style={styles.financialProfileCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Ionicons name="school-outline" size={24} color="#0A84FF" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Perfil financiero</Text>
              <Text style={styles.cardText}>
                Nivel de conocimiento: Intermedio
              </Text>
            </View>

            <Text style={styles.percent}>65%</Text>
          </View>

          <View style={styles.progressBackground}>
            <View style={styles.progressFill} />
          </View>

          <Text style={styles.progressText}>
            Este perfil se usa para personalizar recomendaciones, alertas y contenido educativo.
          </Text>
        </View>

        {/* RESUMEN DE USO */}
        <View style={styles.statsRow}>
          <StatCard title="Movimientos" value="48" icon="wallet-outline" />
          <StatCard title="Alertas" value="5" icon="notifications-outline" />
          <StatCard title="Lecciones" value="6" icon="book-outline" />
        </View>

        {/* CUENTA */}
        <Text style={styles.sectionTitle}>Cuenta</Text>

        <OptionItem
          icon="person-outline"
          title="Editar perfil"
          subtitle="Nombre, correo, ocupación y datos generales"
        />

        <OptionItem
          icon="lock-closed-outline"
          title="Seguridad de cuenta"
          subtitle="Contraseña, sesión activa y autenticación"
        />

        <OptionItem
          icon="notifications-outline"
          title="Preferencias de notificaciones"
          subtitle="Presupuestos, metas, alertas y recomendaciones"
          onPress={() => navigation.navigate('Alertas')}
        />

        {/* PERSONALIZACIÓN */}
        <Text style={styles.sectionTitle}>Personalización HEDA</Text>

        <OptionItem
          icon="sparkles-outline"
          title="Personalización con IA"
          subtitle="Ajustar recomendaciones según hábitos financieros"
        />

        <OptionItem
          icon="cash-outline"
          title="Datos financieros"
          subtitle="Ingresos, gastos frecuentes, presupuestos y metas"
        />

        <OptionItem
          icon="shield-outline"
          title="Privacidad de datos"
          subtitle="Protección de información financiera personal"
        />

        {/* SEGURIDAD */}
        <View style={styles.securityCard}>
          <View style={styles.securityHeader}>
            <View style={styles.securityIcon}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#0A84FF" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Seguridad</Text>
              <Text style={styles.cardText}>
                Tu información financiera se protege mediante autenticación, control de acceso
                y almacenamiento seguro dentro del prototipo.
              </Text>
            </View>
          </View>
        </View>

        {/* PRIVACIDAD Y SOPORTE */}
        <Text style={styles.sectionTitle}>Privacidad y soporte</Text>

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

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={22} color="#0A84FF" />
          <Text style={styles.infoText}>
            HEDA utiliza tus datos dentro del prototipo para generar reportes,
            recomendaciones, alertas y contenido educativo. Las predicciones y sugerencias
            son informativas y no sustituyen asesoría profesional.
          </Text>
        </View>

        {/* CERRAR SESIÓN */}
        <TouchableOpacity style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={21} color="#D71920" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={21} color="#0A84FF" />
      </View>

      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}


function OptionItem({ icon, title, subtitle, onPress }) {
  return (
    <TouchableOpacity style={styles.optionCard} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.optionLeft}>
        <View style={styles.optionIcon}>
          <Ionicons name={icon} size={22} color="#0A84FF" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.optionTitle}>{title}</Text>
          <Text style={styles.optionSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },

  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },

  content: {
    padding: 22,
    paddingBottom: 115,
  },

  header: {
    marginTop: 10,
    marginBottom: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  logo: {
    fontSize: 32,
    fontWeight: '900',
    color: '#062B5F',
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },

  profileCard: {
    backgroundColor: '#0A84FF',
    borderRadius: 26,
    padding: 22,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },

  avatarText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0A84FF',
  },

  userName: {
    fontSize: 23,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  userEmail: {
    marginTop: 4,
    fontSize: 14,
    color: '#DCEEFF',
  },

  badge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },

  badgeText: {
    marginLeft: 5,
    color: '#0A84FF',
    fontWeight: '900',
    fontSize: 12,
  },

  financialProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    elevation: 2,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#062B5F',
    marginBottom: 4,
  },

  cardText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  percent: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0A84FF',
  },

  progressBackground: {
    height: 9,
    backgroundColor: '#DDEBFA',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
  },

  progressFill: {
    width: '65%',
    height: '100%',
    backgroundColor: '#062B5F',
    borderRadius: 20,
  },

  progressText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    fontWeight: '600',
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  statCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    elevation: 2,
  },

  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#062B5F',
  },

  statTitle: {
    marginTop: 3,
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '800',
    textAlign: 'center',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#062B5F',
    marginBottom: 14,
    marginTop: 6,
  },

  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
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
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  optionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#062B5F',
  },

  optionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },

  securityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    elevation: 2,
  },

  securityHeader: {
    flexDirection: 'row',
  },

  securityIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  infoCard: {
    marginTop: 8,
    backgroundColor: '#EAF4FF',
    borderRadius: 20,
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
    borderRadius: 20,
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
    fontWeight: '900',
  },
});