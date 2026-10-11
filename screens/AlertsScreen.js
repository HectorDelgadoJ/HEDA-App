import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const alerts = [
  {
    id: 1,
    type: 'Presupuesto',
    title: 'Presupuesto casi agotado',
    message: 'Has usado el 92% de tu presupuesto de entretenimiento este mes.',
    time: 'Hace 10 min',
    priority: 'Alta',
    icon: 'warning-outline',
    category: 'danger',
  },
  {
    id: 2,
    type: 'Gasto inusual',
    title: 'Gasto mayor al promedio',
    message: 'Tu gasto en comida aumentó 34% respecto a semanas anteriores.',
    time: 'Hace 1 hora',
    priority: 'Media',
    icon: 'fast-food-outline',
    category: 'warning',
  },
  {
    id: 3,
    type: 'Meta de ahorro',
    title: 'Buen avance en tu meta',
    message: 'Estás al 85% de completar tu meta principal de ahorro.',
    time: 'Hoy',
    priority: 'Positiva',
    icon: 'flag-outline',
    category: 'success',
  },
  {
    id: 4,
    type: 'Ethereum',
    title: 'Alta volatilidad detectada',
    message: 'Ethereum presenta variaciones importantes. Consulta la información solo con fines educativos.',
    time: 'Hoy',
    priority: 'Media',
    icon: 'trending-up-outline',
    category: 'warning',
  },
  {
    id: 5,
    type: 'Seguridad',
    title: 'Revisa tus datos de acceso',
    message: 'Recuerda no compartir tus credenciales ni códigos de verificación.',
    time: 'Ayer',
    priority: 'Informativa',
    icon: 'shield-checkmark-outline',
    category: 'info',
  },
];

export default function AlertsScreen({ navigation }) {
  const [selectedFilter, setSelectedFilter] = useState('Todas');

  const filters = ['Todas', 'Alta', 'Media', 'Positiva'];

  const filteredAlerts =
    selectedFilter === 'Todas'
      ? alerts
      : alerts.filter((alert) => alert.priority === selectedFilter);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('IA')}
          >
            <Ionicons name="arrow-back" size={22} color="#062B5F" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.logo}>Alertas</Text>
            <Text style={styles.subtitle}>Avisos preventivos de HEDA</Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons name="notifications-outline" size={22} color="#062B5F" />
          </View>
        </View>

        {/* HERO */}
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="notifications" size={28} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>Alertas inteligentes</Text>
          <Text style={styles.heroText}>
            HEDA te avisa cuando detecta gastos inusuales, exceso de presupuesto,
            riesgos financieros o eventos importantes.
          </Text>
        </View>

        {/* RESUMEN */}
        <View style={styles.summaryRow}>
          <SummaryCard title="Alertas" value="5" icon="notifications-outline" />
          <SummaryCard title="Alta" value="1" icon="warning-outline" />
          <SummaryCard title="Leídas" value="2" icon="checkmark-done-outline" />
        </View>

        {/* FILTROS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                selectedFilter === filter && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === filter && styles.filterTextActive,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ALERTA DESTACADA */}
        <View style={styles.featuredCard}>
          <View style={styles.featuredHeader}>
            <View style={styles.featuredIcon}>
              <Ionicons name="warning-outline" size={24} color="#D71920" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Atención recomendada</Text>
              <Text style={styles.cardText}>
                Tu presupuesto de entretenimiento está cerca de agotarse. Puedes
                reducir gastos esta semana para mantener tu meta de ahorro.
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Ver presupuesto</Text>
          </TouchableOpacity>
        </View>

        {/* LISTA DE ALERTAS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Alertas recientes</Text>
          <Text style={styles.sectionLink}>{filteredAlerts.length} activas</Text>
        </View>

        {filteredAlerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}

        {/* CONFIGURACIÓN */}
        <Text style={styles.sectionTitle}>Configuración de alertas</Text>

        <ConfigCard
          icon="wallet-outline"
          title="Presupuestos"
          text="Recibir avisos cuando una categoría esté cerca de su límite."
          enabled
        />

        <ConfigCard
          icon="flag-outline"
          title="Metas de ahorro"
          text="Recibir recordatorios sobre el avance de tus metas."
          enabled
        />

        <ConfigCard
          icon="trending-up-outline"
          title="Ethereum informativo"
          text="Recibir avisos sobre volatilidad o tendencias informativas."
        />

        {/* INFO */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={22} color="#0A84FF" />
          <Text style={styles.infoText}>
            Las alertas son orientativas y se generan con base en la información
            registrada por el usuario. No sustituyen asesoría financiera profesional.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({ title, value, icon }) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryIcon}>
        <Ionicons name={icon} size={21} color="#0A84FF" />
      </View>

      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryTitle}>{title}</Text>
    </View>
  );
}

function AlertCard({ alert }) {
  const isDanger = alert.category === 'danger';
  const isWarning = alert.category === 'warning';
  const isSuccess = alert.category === 'success';

  return (
    <TouchableOpacity style={styles.alertCard} activeOpacity={0.85}>
      <View
        style={[
          styles.alertIcon,
          isDanger && styles.dangerBg,
          isWarning && styles.warningBg,
          isSuccess && styles.successBg,
        ]}
      >
        <Ionicons
          name={alert.icon}
          size={23}
          color={
            isDanger
              ? '#D71920'
              : isWarning
              ? '#B7791F'
              : isSuccess
              ? '#008A2E'
              : '#0A84FF'
          }
        />
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.alertHeader}>
          <Text style={styles.alertType}>{alert.type}</Text>
          <Text
            style={[
              styles.priority,
              isDanger && styles.priorityDanger,
              isWarning && styles.priorityWarning,
              isSuccess && styles.prioritySuccess,
            ]}
          >
            {alert.priority}
          </Text>
        </View>

        <Text style={styles.alertTitle}>{alert.title}</Text>
        <Text style={styles.alertMessage}>{alert.message}</Text>
        <Text style={styles.alertTime}>{alert.time}</Text>
      </View>
    </TouchableOpacity>
  );
}

function ConfigCard({ icon, title, text, enabled }) {
  return (
    <View style={styles.configCard}>
      <View style={styles.configLeft}>
        <View style={styles.configIcon}>
          <Ionicons name={icon} size={22} color="#0A84FF" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.configTitle}>{title}</Text>
          <Text style={styles.configText}>{text}</Text>
        </View>
      </View>

      <View style={[styles.switch, enabled && styles.switchActive]}>
        <View style={[styles.switchCircle, enabled && styles.switchCircleActive]} />
      </View>
    </View>
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
    alignItems: 'center',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    elevation: 2,
  },

  logo: {
    fontSize: 31,
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

  heroCard: {
    backgroundColor: '#0A84FF',
    borderRadius: 26,
    padding: 24,
    marginBottom: 18,
  },

  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    marginBottom: 8,
  },

  heroText: {
    color: '#DCEEFF',
    fontSize: 15,
    lineHeight: 21,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  summaryCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    elevation: 2,
  },

  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  summaryValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#062B5F',
  },

  summaryTitle: {
    marginTop: 3,
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '800',
    textAlign: 'center',
  },

  filterList: {
    paddingBottom: 14,
  },

  filterChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    elevation: 2,
  },

  filterChipActive: {
    backgroundColor: '#062B5F',
  },

  filterText: {
    color: '#0A84FF',
    fontSize: 13,
    fontWeight: '900',
  },

  filterTextActive: {
    color: '#FFFFFF',
  },

  featuredCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 22,
    elevation: 2,
  },

  featuredHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },

  featuredIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFEAEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#062B5F',
    marginBottom: 5,
  },

  cardText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  primaryButton: {
    backgroundColor: '#062B5F',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  sectionHeader: {
    marginTop: 4,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#062B5F',
    marginBottom: 14,
  },

  sectionLink: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0A84FF',
    textTransform: 'uppercase',
  },

  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
    flexDirection: 'row',
  },

  alertIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  dangerBg: {
    backgroundColor: '#FFEAEA',
  },

  warningBg: {
    backgroundColor: '#FFF8E6',
  },

  successBg: {
    backgroundColor: '#EAF8EF',
  },

  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  alertType: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0A84FF',
    textTransform: 'uppercase',
  },

  priority: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0A84FF',
    backgroundColor: '#EAF4FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },

  priorityDanger: {
    color: '#D71920',
    backgroundColor: '#FFEAEA',
  },

  priorityWarning: {
    color: '#B7791F',
    backgroundColor: '#FFF8E6',
  },

  prioritySuccess: {
    color: '#008A2E',
    backgroundColor: '#EAF8EF',
  },

  alertTitle: {
    marginTop: 7,
    fontSize: 16,
    fontWeight: '900',
    color: '#062B5F',
  },

  alertMessage: {
    marginTop: 5,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },

  alertTime: {
    marginTop: 8,
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '800',
  },

  configCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  configLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  configIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  configTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#062B5F',
  },

  configText: {
    marginTop: 5,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },

  switch: {
    width: 46,
    height: 26,
    borderRadius: 30,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    paddingHorizontal: 3,
    marginLeft: 10,
  },

  switchActive: {
    backgroundColor: '#0A84FF',
  },

  switchCircle: {
    width: 20,
    height: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },

  switchCircleActive: {
    alignSelf: 'flex-end',
  },

  infoCard: {
    marginTop: 6,
    backgroundColor: '#EAF4FF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D7EAFE',
  },

  infoText: {
    flex: 1,
    marginLeft: 10,
    color: '#24527A',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});