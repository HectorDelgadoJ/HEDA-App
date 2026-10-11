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

export default function DashboardScreen({ navigation }) {
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
            <Text style={styles.logo}>HEDA</Text>
            <Text style={styles.subtitle}>Gestión financiera inteligente</Text>
          </View>

          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={22} color="#062B5F" />
          </TouchableOpacity>
        </View>

        {/* BALANCE */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo total</Text>
          <Text style={styles.balanceAmount}>$128,450.00</Text>

          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.smallLabel}>Ingresos</Text>
              <Text style={styles.income}>+$12,400</Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.balanceItem}>
              <Text style={styles.smallLabel}>Gastos</Text>
              <Text style={styles.expense}>-$4,210</Text>
            </View>
          </View>
        </View>

        {/* ACCESOS RÁPIDOS */}
        <View style={styles.quickRow}>
          <QuickAction
            icon="add-circle-outline"
            label="Agregar"
            onPress={() => navigation.navigate('Movimientos')}
          />

          <QuickAction
            icon="wallet-outline"
            label="Gastos"
            onPress={() => navigation.navigate('Movimientos')}
          />

          <QuickAction
            icon="qr-code-outline"
            label="QR"
            onPress={() => navigation.navigate('QR')}
          />

          <QuickAction
            icon="sparkles-outline"
            label="IA"
            onPress={() => navigation.navigate('IA')}
          />
        </View>

        {/* RESUMEN IA */}
        <View style={styles.aiCard}>
          <View style={styles.aiIcon}>
            <Ionicons name="sparkles" size={20} color="#0A84FF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Resumen inteligente</Text>
            <Text style={styles.cardText}>
              Has ahorrado un 12% más que el mes pasado. Tu mayor gasto fue en
              entretenimiento.
            </Text>
          </View>
        </View>

        {/* TARJETAS PEQUEÑAS */}
        <View style={styles.twoCards}>
          <TouchableOpacity
            style={styles.smallCard}
            onPress={() => navigation.navigate('Ethereum')}
          >
            <Ionicons name="logo-bitcoin" size={22} color="#0A84FF" />
            <Text style={styles.smallCardTitle}>Ethereum</Text>
            <Text style={styles.smallCardAmount}>$3,250 USD</Text>
            <Text style={styles.positive}>+4.2%</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.smallCard}
            onPress={() => navigation.navigate('Reportes')}
          >
            <Ionicons name="flag-outline" size={22} color="#0A84FF" />
            <Text style={styles.smallCardTitle}>Meta principal</Text>
            <Text style={styles.smallCardAmount}>$8,500 / $10k</Text>

            <View style={styles.progressBackground}>
              <View style={styles.progressFill} />
            </View>
          </TouchableOpacity>
        </View>

        {/* FLUJO MENSUAL */}
        <View style={styles.chartCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Flujo mensual</Text>
            <Text style={styles.sectionLink}>Últimos 6 meses</Text>
          </View>

          <View style={styles.chart}>
            <Bar height={55} label="Ene" />
            <Bar height={80} label="Feb" />
            <Bar height={65} label="Mar" />
            <Bar height={120} label="Abr" active />
            <Bar height={75} label="May" />
            <Bar height={90} label="Jun" />
          </View>
        </View>

        {/* CATEGORÍAS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categorías de gasto</Text>
          <Text style={styles.sectionLink}>Ver todo</Text>
        </View>

        <View style={styles.categoryRow}>
          <Category icon="fast-food-outline" title="Comida" amount="$1,200" />
          <Category icon="game-controller-outline" title="Ocio" amount="$850" />
          <Category icon="cart-outline" title="Compras" amount="$2,400" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <Ionicons name={icon} size={24} color="#0A84FF" />
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
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
            backgroundColor: active ? '#062B5F' : '#EAF1F8',
          },
        ]}
      />
      <Text style={styles.barLabel}>{label}</Text>
    </View>
  );
}

function Category({ icon, title, amount }) {
  return (
    <View style={styles.categoryCard}>
      <View style={styles.categoryIcon}>
        <Ionicons name={icon} size={22} color="#0A84FF" />
      </View>
      <Text style={styles.categoryTitle}>{title}</Text>
      <Text style={styles.categoryAmount}>{amount}</Text>
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
    paddingBottom: 110,
  },

  header: {
    marginTop: 10,
    marginBottom: 24,
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

  balanceCard: {
    backgroundColor: '#0A84FF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 22,
  },

  balanceLabel: {
    fontSize: 15,
    color: '#DCEEFF',
    marginBottom: 8,
  },

  balanceAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 22,
  },

  balanceRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 16,
    padding: 14,
  },

  balanceItem: {
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
    fontWeight: '800',
  },

  expense: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
  },

  separator: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginHorizontal: 12,
  },

  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  quickAction: {
    width: '22%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 2,
  },

  quickLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#062B5F',
  },

  aiCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    elevation: 2,
  },

  aiIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#062B5F',
    marginBottom: 6,
  },

  cardText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },

  twoCards: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 22,
  },

  smallCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    elevation: 2,
  },

  smallCardTitle: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 13,
  },

  smallCardAmount: {
    marginTop: 4,
    color: '#062B5F',
    fontSize: 18,
    fontWeight: '900',
  },

  positive: {
    marginTop: 4,
    color: '#00A651',
    fontWeight: '800',
  },

  progressBackground: {
    height: 7,
    backgroundColor: '#DDEBFA',
    borderRadius: 20,
    marginTop: 14,
    overflow: 'hidden',
  },

  progressFill: {
    width: '85%',
    height: '100%',
    backgroundColor: '#062B5F',
    borderRadius: 20,
  },

  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 22,
    elevation: 2,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#062B5F',
  },

  sectionLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0A84FF',
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

  categoryRow: {
    flexDirection: 'row',
    gap: 12,
  },

  categoryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    elevation: 2,
  },

  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  categoryTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },

  categoryAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: '#062B5F',
  },
});