import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HabitsScreen({ navigation }) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
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
            <Ionicons name="arrow-back" size={22} color={colors.ink} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.logo}>Hábitos</Text>
            <Text style={styles.subtitle}>Demostración · Datos de ejemplo</Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons name="analytics-outline" size={22} color={colors.ink} />
          </View>
        </View>

        {/* HERO */}
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="analytics-outline" size={28} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>Análisis de hábitos financieros</Text>
          <Text style={styles.heroText}>
            Explora ejemplos de patrones de gasto. Este análisis todavía no utiliza tus movimientos.
          </Text>
        </View>

        {/* RESUMEN */}
        <View style={styles.summaryRow}>
          <SummaryCard
            icon="trending-up-outline"
            title="Gasto mayor"
            value="Comida"
          />

          <SummaryCard
            icon="repeat-outline"
            title="Recurrente"
            value="Streaming"
          />

          <SummaryCard
            icon="warning-outline"
            title="Riesgo"
            value="Medio"
          />
        </View>

        {/* SCORE */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <View>
              <Text style={styles.cardTitle}>Salud financiera estimada</Text>
              <Text style={styles.cardText}>
                Tu comportamiento financiero muestra estabilidad, pero existen gastos que pueden optimizarse.
              </Text>
            </View>

            <Text style={styles.scoreValue}>74%</Text>
          </View>

          <View style={styles.progressBackground}>
            <View style={styles.progressFill} />
          </View>
        </View>

        {/* PATRONES DETECTADOS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Patrones detectados</Text>
          <Text style={styles.sectionLink}>Este mes</Text>
        </View>

        <HabitCard
          icon="fast-food-outline"
          title="Gasto elevado en comida"
          description="El 34% de tus egresos se concentra en comida y restaurantes."
          level="Moderado"
          colorType="warning"
        />

        <HabitCard
          icon="game-controller-outline"
          title="Incremento en entretenimiento"
          description="Tus gastos de ocio aumentaron 18% respecto al mes anterior."
          level="Alerta"
          colorType="danger"
        />

        <HabitCard
          icon="wallet-outline"
          title="Buen control de ingresos"
          description="Tus ingresos se han mantenido estables durante las últimas semanas."
          level="Positivo"
          colorType="success"
        />

        {/* GRÁFICA SIMPLE */}
        <View style={styles.chartCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tendencia de gasto</Text>
            <Text style={styles.sectionLink}>6 semanas</Text>
          </View>

          <View style={styles.chart}>
            <Bar height={70} label="S1" />
            <Bar height={95} label="S2" />
            <Bar height={65} label="S3" />
            <Bar height={120} label="S4" active />
            <Bar height={90} label="S5" />
            <Bar height={105} label="S6" />
          </View>
        </View>

        {/* RECOMENDACIONES */}
        <Text style={styles.sectionTitle}>Recomendaciones de HEDA</Text>

        <RecommendationCard
          icon="restaurant-outline"
          title="Controla gastos variables"
          text="Podrías establecer un presupuesto semanal para comida fuera de casa."
        />

        <RecommendationCard
          icon="flag-outline"
          title="Refuerza tu meta de ahorro"
          text="Si reduces 10% tus gastos de ocio, podrías acercarte más rápido a tu meta principal."
        />

        <RecommendationCard
          icon="notifications-outline"
          title="Activa alertas preventivas"
          text="HEDA puede avisarte cuando una categoría esté cerca de superar su límite."
        />

        {/* EXPLICACIÓN */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
          <Text style={styles.infoText}>
            Este análisis se basa en movimientos simulados del prototipo. En la versión final, los hábitos se calcularán a partir de los ingresos, gastos, presupuestos y metas registrados por el usuario.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({ icon, title, value }) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryIcon}>
        <Ionicons name={icon} size={21} color={colors.primary} />
      </View>

      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryTitle}>{title}</Text>
    </View>
  );
}

function HabitCard({ icon, title, description, level, colorType }) {
  const isDanger = colorType === 'danger';
  const isSuccess = colorType === 'success';

  return (
    <View style={styles.habitCard}>
      <View
        style={[
          styles.habitIcon,
          isDanger && styles.dangerBg,
          isSuccess && styles.successBg,
        ]}
      >
        <Ionicons
          name={icon}
          size={23}
          color={isDanger ? '#D71920' : isSuccess ? '#008A2E' : '#B7791F'}
        />
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.habitHeader}>
          <Text style={styles.habitTitle}>{title}</Text>

          <Text
            style={[
              styles.level,
              isDanger && styles.levelDanger,
              isSuccess && styles.levelSuccess,
            ]}
          >
            {level}
          </Text>
        </View>

        <Text style={styles.habitDescription}>{description}</Text>
      </View>
    </View>
  );
}

function RecommendationCard({ icon, title, text }) {
  return (
    <View style={styles.recommendationCard}>
      <View style={styles.recommendationIcon}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.recommendationTitle}>{title}</Text>
        <Text style={styles.recommendationText}>{text}</Text>
      </View>
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
            backgroundColor: active ? colors.ink : '#DDEBFA',
          },
        ]}
      />
      <Text style={styles.barLabel}>{label}</Text>
    </View>
  );
}

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
    fontWeight: '700',
    color: colors.ink,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.muted,
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
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },

  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '700',
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
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    elevation: 2,
  },

  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },

  summaryTitle: {
    marginTop: 3,
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
    textAlign: 'center',
  },

  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    elevation: 2,
  },

  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 5,
  },

  cardText: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    maxWidth: 230,
  },

  scoreValue: {
    fontSize: 25,
    fontWeight: '700',
    color: colors.primary,
  },

  progressBackground: {
    height: 9,
    backgroundColor: '#DDEBFA',
    borderRadius: 18,
    overflow: 'hidden',
  },

  progressFill: {
    width: '74%',
    height: '100%',
    backgroundColor: colors.ink,
    borderRadius: 18,
  },

  sectionHeader: {
    marginTop: 4,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 14,
  },

  sectionLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },

  habitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
    flexDirection: 'row',
  },

  habitIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFF8E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  dangerBg: {
    backgroundColor: '#FFEAEA',
  },

  successBg: {
    backgroundColor: '#EAF8EF',
  },

  habitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  habitTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    flex: 1,
    marginRight: 8,
  },

  habitDescription: {
    marginTop: 6,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },

  level: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B7791F',
    backgroundColor: '#FFF8E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },

  levelDanger: {
    color: '#D71920',
    backgroundColor: '#FFEAEA',
  },

  levelSuccess: {
    color: '#008A2E',
    backgroundColor: '#EAF8EF',
  },

  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    elevation: 2,
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
    color: colors.muted,
    fontWeight: '700',
  },

  recommendationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
    flexDirection: 'row',
  },

  recommendationIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  recommendationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 5,
  },

  recommendationText: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },

  infoCard: {
    marginTop: 6,
    backgroundColor: colors.softBlue,
    borderRadius: 18,
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