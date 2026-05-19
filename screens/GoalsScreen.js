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

export default function GoalsScreen() {
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
            <Text style={styles.logo}>Reportes</Text>
            <Text style={styles.subtitle}>Resumen financiero mensual</Text>
          </View>

          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="bar-chart-outline" size={22} color="#062B5F" />
          </TouchableOpacity>
        </View>

        {/* RESUMEN PRINCIPAL */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Balance del mes</Text>
          <Text style={styles.summaryAmount}>$8,190 MXN</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.smallLabel}>Ingresos</Text>
              <Text style={styles.income}>+$12,400</Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.summaryItem}>
              <Text style={styles.smallLabel}>Egresos</Text>
              <Text style={styles.expense}>-$4,210</Text>
            </View>
          </View>
        </View>

        {/* FILTROS */}
        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.filterActive}>
            <Text style={styles.filterActiveText}>Mensual</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterText}>Semanal</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterText}>Anual</Text>
          </TouchableOpacity>
        </View>

        {/* GRÁFICA */}
        <View style={styles.chartCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Flujo de ingresos y gastos</Text>
            <Text style={styles.sectionLink}>Mayo</Text>
          </View>

          <View style={styles.chart}>
            <Bar height={80} label="Ene" />
            <Bar height={105} label="Feb" />
            <Bar height={70} label="Mar" />
            <Bar height={130} label="Abr" active />
            <Bar height={95} label="May" />
            <Bar height={115} label="Jun" />
          </View>
        </View>

        {/* CATEGORÍAS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Gastos por categoría</Text>
          <Text style={styles.sectionLink}>Ver detalle</Text>
        </View>

        <CategoryBar
          icon="fast-food-outline"
          title="Comida"
          amount="$1,450"
          percent="34%"
          width="74%"
        />

        <CategoryBar
          icon="cart-outline"
          title="Compras"
          amount="$1,120"
          percent="26%"
          width="58%"
        />

        <CategoryBar
          icon="car-outline"
          title="Transporte"
          amount="$740"
          percent="18%"
          width="42%"
        />

        <CategoryBar
          icon="game-controller-outline"
          title="Ocio"
          amount="$620"
          percent="14%"
          width="35%"
        />

        {/* PRESUPUESTOS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Presupuestos</Text>
          <Text style={styles.sectionLink}>Administrar</Text>
        </View>

        <BudgetCard
          title="Comida"
          used="$1,450"
          limit="$2,000"
          percent="72%"
          status="Dentro del límite"
          icon="fast-food-outline"
        />

        <BudgetCard
          title="Entretenimiento"
          used="$920"
          limit="$1,000"
          percent="92%"
          status="Cerca del límite"
          icon="film-outline"
          warning
        />

        {/* META PRINCIPAL */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <View style={styles.goalIcon}>
              <Ionicons name="flag-outline" size={24} color="#0A84FF" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Meta principal</Text>
              <Text style={styles.cardText}>Ahorro para laptop</Text>
            </View>

            <Text style={styles.goalPercent}>85%</Text>
          </View>

          <View style={styles.progressBackground}>
            <View style={styles.progressFill} />
          </View>

          <View style={styles.goalFooter}>
            <Text style={styles.goalText}>$8,500 acumulado</Text>
            <Text style={styles.goalText}>Meta: $10,000</Text>
          </View>
        </View>

        {/* IA */}
        <View style={styles.aiCard}>
          <View style={styles.aiIcon}>
            <Ionicons name="sparkles" size={21} color="#0A84FF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Análisis inteligente</Text>
            <Text style={styles.cardText}>
              Tus gastos están concentrados en comida y compras. Si reduces 10%
              esas categorías, podrías alcanzar tu meta antes de lo previsto.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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

function CategoryBar({ icon, title, amount, percent, width }) {
  return (
    <View style={styles.categoryCard}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryLeft}>
          <View style={styles.categoryIcon}>
            <Ionicons name={icon} size={21} color="#0A84FF" />
          </View>

          <View>
            <Text style={styles.categoryTitle}>{title}</Text>
            <Text style={styles.categoryAmount}>{amount}</Text>
          </View>
        </View>

        <Text style={styles.categoryPercent}>{percent}</Text>
      </View>

      <View style={styles.categoryProgress}>
        <View style={[styles.categoryProgressFill, { width }]} />
      </View>
    </View>
  );
}

function BudgetCard({ title, used, limit, percent, status, icon, warning }) {
  return (
    <View style={styles.budgetCard}>
      <View style={styles.budgetHeader}>
        <View style={styles.categoryLeft}>
          <View style={[styles.categoryIcon, warning && styles.warningIcon]}>
            <Ionicons
              name={icon}
              size={21}
              color={warning ? '#B7791F' : '#0A84FF'}
            />
          </View>

          <View>
            <Text style={styles.categoryTitle}>{title}</Text>
            <Text style={styles.categoryAmount}>
              {used} / {limit}
            </Text>
          </View>
        </View>

        <Text style={[styles.budgetStatus, warning && styles.warningText]}>
          {status}
        </Text>
      </View>

      <View style={styles.categoryProgress}>
        <View
          style={[
            styles.categoryProgressFill,
            warning && styles.warningFill,
            { width: percent },
          ]}
        />
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

  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },

  summaryCard: {
    backgroundColor: '#0A84FF',
    borderRadius: 26,
    padding: 24,
    marginBottom: 20,
  },

  summaryLabel: {
    fontSize: 15,
    color: '#DCEEFF',
    marginBottom: 8,
  },

  summaryAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 22,
  },

  summaryRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 16,
    padding: 14,
  },

  summaryItem: {
    flex: 1,
  },

  smallLabel: {
    color: '#DCEEFF',
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  income: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  expense: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'right',
  },

  separator: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginHorizontal: 12,
  },

  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#EAF1F8',
    borderRadius: 18,
    padding: 5,
    marginBottom: 20,
  },

  filterButton: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 14,
  },

  filterActive: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },

  filterText: {
    color: '#6B7280',
    fontWeight: '800',
  },

  filterActiveText: {
    color: '#062B5F',
    fontWeight: '900',
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

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#062B5F',
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

  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
  },

  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  warningIcon: {
    backgroundColor: '#FFF8E6',
  },

  categoryTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#062B5F',
  },

  categoryAmount: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700',
  },

  categoryPercent: {
    fontSize: 16,
    color: '#0A84FF',
    fontWeight: '900',
  },

  categoryProgress: {
    height: 8,
    backgroundColor: '#EAF1F8',
    borderRadius: 20,
    overflow: 'hidden',
  },

  categoryProgressFill: {
    height: '100%',
    backgroundColor: '#0A84FF',
    borderRadius: 20,
  },

  budgetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
  },

  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    alignItems: 'center',
  },

  budgetStatus: {
    fontSize: 12,
    color: '#0A84FF',
    fontWeight: '900',
  },

  warningText: {
    color: '#B7791F',
  },

  warningFill: {
    backgroundColor: '#F6B93B',
  },

  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginTop: 4,
    marginBottom: 18,
    elevation: 2,
  },

  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  goalIcon: {
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
    color: '#4B5563',
    lineHeight: 20,
  },

  goalPercent: {
    color: '#0A84FF',
    fontSize: 18,
    fontWeight: '900',
  },

  progressBackground: {
    height: 9,
    backgroundColor: '#DDEBFA',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
  },

  progressFill: {
    width: '85%',
    height: '100%',
    backgroundColor: '#062B5F',
    borderRadius: 20,
  },

  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  goalText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700',
  },

  aiCard: {
    flexDirection: 'row',
    backgroundColor: '#EAF4FF',
    borderRadius: 22,
    padding: 18,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#D7EAFE',
  },

  aiIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
});