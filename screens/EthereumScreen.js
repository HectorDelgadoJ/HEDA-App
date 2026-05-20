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

export default function EthereumScreen({ navigation }) {
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
            <Text style={styles.logo}>Ethereum</Text>
            <Text style={styles.subtitle}>Análisis informativo con IA</Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons name="trending-up-outline" size={22} color="#062B5F" />
          </View>
        </View>

        {/* HERO PRECIO */}
        <View style={styles.priceCard}>
          <View style={styles.priceHeader}>
            <View>
              <Text style={styles.priceLabel}>Precio actual ETH</Text>
              <Text style={styles.price}>$3,250 USD</Text>
            </View>

            <View style={styles.ethIcon}>
              <Ionicons name="logo-bitcoin" size={30} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.priceFooter}>
            <View style={styles.changeBadge}>
              <Ionicons name="arrow-up-outline" size={15} color="#FFFFFF" />
              <Text style={styles.changeText}>+4.2% últimas 24h</Text>
            </View>

            <Text style={styles.updateText}>Actualizado hoy</Text>
          </View>
        </View>

        {/* PREDICCIÓN IA */}
        <View style={styles.predictionCard}>
          <View style={styles.predictionHeader}>
            <View style={styles.predictionIcon}>
              <Ionicons name="sparkles" size={22} color="#0A84FF" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Tendencia informativa</Text>
              <Text style={styles.cardText}>
                El modelo estima una tendencia alcista moderada para los próximos 7 días.
              </Text>
            </View>
          </View>

          <View style={styles.predictionResult}>
            <View>
              <Text style={styles.resultLabel}>Clasificación</Text>
              <Text style={styles.resultValue}>Alcista moderada</Text>
            </View>

            <View style={styles.probabilityBox}>
              <Text style={styles.probability}>68%</Text>
              <Text style={styles.probabilityLabel}>confianza</Text>
            </View>
          </View>
        </View>

        {/* HORIZONTES */}
        <Text style={styles.sectionTitle}>Horizontes de análisis</Text>

        <View style={styles.horizonRow}>
          <HorizonCard
            title="1 día"
            trend="Estable"
            percent="54%"
            icon="remove-outline"
          />

          <HorizonCard
            title="7 días"
            trend="Alcista"
            percent="68%"
            icon="arrow-up-outline"
            active
          />
        </View>

        {/* GRÁFICA SIMPLE */}
        <View style={styles.chartCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleNoMargin}>Tendencia histórica</Text>
            <Text style={styles.sectionLink}>ETH-USD</Text>
          </View>

          <View style={styles.chart}>
            <Bar height={70} label="Lun" />
            <Bar height={95} label="Mar" />
            <Bar height={78} label="Mié" />
            <Bar height={120} label="Jue" active />
            <Bar height={105} label="Vie" />
            <Bar height={130} label="Hoy" active />
          </View>
        </View>

        {/* FACTORES */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitleNoMargin}>Factores analizados</Text>
          <Text style={styles.sectionLink}>Modelo IA</Text>
        </View>

        <FactorCard
          icon="stats-chart-outline"
          title="Precio histórico"
          text="Se consideran valores de apertura, cierre, máximo y mínimo."
        />

        <FactorCard
          icon="bar-chart-outline"
          title="Volumen de mercado"
          text="Se analiza la actividad del mercado para interpretar posibles movimientos."
        />

        <FactorCard
          icon="time-outline"
          title="Ventanas temporales"
          text="El modelo utiliza datos anteriores para clasificar tendencias de corto plazo."
        />

        <FactorCard
          icon="warning-outline"
          title="Volatilidad"
          text="Ethereum puede presentar cambios fuertes en periodos cortos."
          warning
        />

        {/* MÉTRICAS */}
        <Text style={styles.sectionTitle}>Métricas del modelo</Text>

        <View style={styles.metricsRow}>
          <MetricCard label="Accuracy" value="72%" />
          <MetricCard label="Precision" value="70%" />
          <MetricCard label="F1-score" value="69%" />
        </View>

        {/* EXPLICACIÓN EDUCATIVA */}
        <View style={styles.educationCard}>
          <View style={styles.educationHeader}>
            <View style={styles.educationIcon}>
              <Ionicons name="school-outline" size={22} color="#0A84FF" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>¿Qué significa esto?</Text>
              <Text style={styles.cardText}>
                Una tendencia alcista no garantiza que el precio subirá. Solo indica que,
                según los datos analizados, el modelo detectó señales compatibles con un
                posible aumento.
              </Text>
            </View>
          </View>
        </View>

        {/* ADVERTENCIA */}
        <View style={styles.warningCard}>
          <Ionicons name="alert-circle-outline" size={24} color="#B7791F" />
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>Advertencia financiera</Text>
            <Text style={styles.warningText}>
              Esta información es educativa e informativa. HEDA no recomienda comprar,
              vender o invertir en Ethereum, ni garantiza resultados financieros.
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Ver análisis completo</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function HorizonCard({ title, trend, percent, icon, active }) {
  return (
    <View style={[styles.horizonCard, active && styles.horizonCardActive]}>
      <View style={[styles.horizonIcon, active && styles.horizonIconActive]}>
        <Ionicons
          name={icon}
          size={22}
          color={active ? '#FFFFFF' : '#0A84FF'}
        />
      </View>

      <Text style={[styles.horizonTitle, active && styles.horizonTitleActive]}>
        {title}
      </Text>

      <Text style={[styles.horizonTrend, active && styles.horizonTrendActive]}>
        {trend}
      </Text>

      <Text style={[styles.horizonPercent, active && styles.horizonPercentActive]}>
        {percent}
      </Text>
    </View>
  );
}

function Bar({ height, label, active }) {
  return (
    <View style={styles.barContainer}>
      <View
        style={[
          styles.bar,
          {
            height,
            backgroundColor: active ? '#062B5F' : '#DDEBFA',
          },
        ]}
      />
      <Text style={styles.barLabel}>{label}</Text>
    </View>
  );
}

function FactorCard({ icon, title, text, warning }) {
  return (
    <View style={styles.factorCard}>
      <View style={[styles.factorIcon, warning && styles.factorIconWarning]}>
        <Ionicons
          name={icon}
          size={22}
          color={warning ? '#B7791F' : '#0A84FF'}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.factorTitle}>{title}</Text>
        <Text style={styles.factorText}>{text}</Text>
      </View>
    </View>
  );
}

function MetricCard({ label, value }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
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

  priceCard: {
    backgroundColor: '#0A84FF',
    borderRadius: 28,
    padding: 24,
    marginBottom: 18,
  },

  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  priceLabel: {
    color: '#DCEEFF',
    fontSize: 15,
    marginBottom: 8,
  },

  price: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
  },

  ethIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  priceFooter: {
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },

  changeText: {
    marginLeft: 5,
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },

  updateText: {
    color: '#DCEEFF',
    fontSize: 12,
    fontWeight: '700',
  },

  predictionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 22,
    elevation: 2,
  },

  predictionHeader: {
    flexDirection: 'row',
    marginBottom: 18,
  },

  predictionIcon: {
    width: 46,
    height: 46,
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
    marginBottom: 5,
  },

  cardText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  predictionResult: {
    backgroundColor: '#F4F7FB',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  resultLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  resultValue: {
    marginTop: 4,
    color: '#062B5F',
    fontSize: 19,
    fontWeight: '900',
  },

  probabilityBox: {
    backgroundColor: '#EAF4FF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },

  probability: {
    color: '#0A84FF',
    fontSize: 20,
    fontWeight: '900',
  },

  probabilityLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#062B5F',
    marginBottom: 14,
  },

  sectionTitleNoMargin: {
    fontSize: 20,
    fontWeight: '900',
    color: '#062B5F',
  },

  horizonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  horizonCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    elevation: 2,
  },

  horizonCardActive: {
    backgroundColor: '#062B5F',
  },

  horizonIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  horizonIconActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  horizonTitle: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '800',
  },

  horizonTitleActive: {
    color: '#DCEEFF',
  },

  horizonTrend: {
    marginTop: 5,
    color: '#062B5F',
    fontSize: 18,
    fontWeight: '900',
  },

  horizonTrendActive: {
    color: '#FFFFFF',
  },

  horizonPercent: {
    marginTop: 6,
    color: '#0A84FF',
    fontWeight: '900',
  },

  horizonPercentActive: {
    color: '#FFFFFF',
  },

  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 22,
    elevation: 2,
  },

  sectionHeader: {
    marginTop: 4,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionLink: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0A84FF',
    textTransform: 'uppercase',
  },

  chart: {
    height: 170,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 20,
  },

  barContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  bar: {
    width: 32,
    borderRadius: 10,
  },

  barLabel: {
    marginTop: 8,
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '700',
  },

  factorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
    flexDirection: 'row',
  },

  factorIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  factorIconWarning: {
    backgroundColor: '#FFF8E6',
  },

  factorTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#062B5F',
    marginBottom: 5,
  },

  factorText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },

  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  metricCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
  },

  metricValue: {
    color: '#062B5F',
    fontSize: 22,
    fontWeight: '900',
  },

  metricLabel: {
    marginTop: 5,
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },

  educationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    elevation: 2,
  },

  educationHeader: {
    flexDirection: 'row',
  },

  educationIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  warningCard: {
    backgroundColor: '#FFF8E6',
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#F6D98B',
    flexDirection: 'row',
  },

  warningTitle: {
    color: '#7A4E00',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 5,
  },

  warningText: {
    color: '#7A4E00',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },

  primaryButton: {
    backgroundColor: '#062B5F',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 30,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});