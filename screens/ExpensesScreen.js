import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ExpensesScreen({ navigation }) {
  const [type, setType] = useState('Gasto');
  const [selectedCategory, setSelectedCategory] = useState('Comida');

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
            <Text style={styles.subtitle}>Registro de movimientos</Text>
          </View>

          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={22} color="#062B5F" />
          </TouchableOpacity>
        </View>

        {/* BALANCE */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Balance mensual</Text>
          <Text style={styles.balanceAmount}>$12,450 MXN</Text>

          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.smallLabel}>Ingresos</Text>
              <Text style={styles.income}>+$5,000</Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.balanceItem}>
              <Text style={styles.smallLabel}>Gastos</Text>
              <Text style={styles.expense}>-$1,239</Text>
            </View>
          </View>
        </View>

        {/* SWITCH GASTO / INGRESO */}
        <View style={styles.switchContainer}>
          <TouchableOpacity
            style={[
              styles.switchButton,
              type === 'Gasto' && styles.switchButtonActive,
            ]}
            onPress={() => setType('Gasto')}
          >
            <Text
              style={[
                styles.switchText,
                type === 'Gasto' && styles.switchTextActive,
              ]}
            >
              Gasto
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.switchButton,
              type === 'Ingreso' && styles.switchButtonActive,
            ]}
            onPress={() => setType('Ingreso')}
          >
            <Text
              style={[
                styles.switchText,
                type === 'Ingreso' && styles.switchTextActive,
              ]}
            >
              Ingreso
            </Text>
          </TouchableOpacity>
        </View>

        {/* MONTO */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Monto</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              placeholder="0.00"
              placeholderTextColor="#C7CDD6"
              keyboardType="numeric"
              style={styles.amountInput}
            />
          </View>
        </View>

        {/* CATEGORÍAS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categoría</Text>
          <TouchableOpacity>
            <Text style={styles.sectionLink}>Ver todas</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.categoryRow}>
          <Category
            icon="fast-food-outline"
            label="Comida"
            active={selectedCategory === 'Comida'}
            onPress={() => setSelectedCategory('Comida')}
          />
          <Category
            icon="bag-outline"
            label="Compras"
            active={selectedCategory === 'Compras'}
            onPress={() => setSelectedCategory('Compras')}
          />
          <Category
            icon="car-outline"
            label="Transporte"
            active={selectedCategory === 'Transporte'}
            onPress={() => setSelectedCategory('Transporte')}
          />
          <Category
            icon="home-outline"
            label="Hogar"
            active={selectedCategory === 'Hogar'}
            onPress={() => setSelectedCategory('Hogar')}
          />
        </View>

        {/* FECHA */}
        <TouchableOpacity style={styles.optionCard}>
          <View style={styles.optionLeft}>
            <Ionicons name="calendar-outline" size={22} color="#062B5F" />
            <View>
              <Text style={styles.optionLabel}>Fecha</Text>
              <Text style={styles.optionValue}>18 de Mayo, 2026</Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

    

        {/* NOTAS */}
        <View style={styles.notesCard}>
          <View style={styles.optionLeft}>
            <Ionicons name="menu-outline" size={22} color="#062B5F" />
            <Text style={styles.optionLabel}>Notas</Text>
          </View>

          <TextInput
            placeholder="¿Para qué fue este movimiento?"
            placeholderTextColor="#C7CDD6"
            multiline
            style={styles.notesInput}
          />
        </View>

        {/* RECOMENDACIÓN IA */}
        <View style={styles.aiCard}>
          <View style={styles.aiIcon}>
            <Ionicons name="sparkles" size={20} color="#0A84FF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>HEDA Predictivo</Text>
            <Text style={styles.cardText}>
              Este gasto parece recurrente. ¿Deseas programarlo mensualmente para
              mejorar tus reportes?
            </Text>
          </View>
        </View>

        {/* MOVIMIENTOS RECIENTES */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Movimientos recientes</Text>
          <TouchableOpacity>
            <Text style={styles.sectionLink}>Ver todo</Text>
          </TouchableOpacity>
        </View>

        <Movement title="Starbucks" date="18 Mayo 2026" amount="- $120" type="expense" />
        <Movement title="Depósito nómina" date="17 Mayo 2026" amount="+ $5,000" type="income" />
        <Movement title="Netflix" date="16 Mayo 2026" amount="- $219" type="expense" />

        {/* BOTONES */}
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Registrar movimiento</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Cancelar</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function Category({ icon, label, active, onPress }) {
  return (
    <TouchableOpacity style={styles.categoryItem} onPress={onPress}>
      <View style={[styles.categoryIcon, active && styles.categoryIconActive]}>
        <Ionicons
          name={icon}
          size={22}
          color={active ? '#0A84FF' : '#6B7280'}
        />
      </View>
      <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Movement({ title, date, amount, type }) {
  const isIncome = type === 'income';

  return (
    <View style={styles.movementCard}>
      <View>
        <Text style={styles.movementTitle}>{title}</Text>
        <Text style={styles.movementDate}>{date}</Text>
      </View>

      <Text style={[styles.movementAmount, isIncome ? styles.green : styles.red]}>
        {amount}
      </Text>
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
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 20,
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

  switchContainer: {
    backgroundColor: '#EAF1F8',
    flexDirection: 'row',
    borderRadius: 18,
    padding: 5,
    marginBottom: 18,
  },

  switchButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
  },

  switchButtonActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },

  switchText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '800',
  },

  switchTextActive: {
    color: '#062B5F',
  },

  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 22,
    elevation: 2,
  },

  inputLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#9CA3AF',
    fontWeight: '900',
    marginBottom: 8,
  },

  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  currencySymbol: {
    fontSize: 32,
    fontWeight: '900',
    color: '#6B7280',
    marginRight: 8,
  },

  amountInput: {
    flex: 1,
    fontSize: 34,
    fontWeight: '900',
    color: '#062B5F',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#062B5F',
  },

  sectionLink: {
    color: '#0A84FF',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  categoryItem: {
    alignItems: 'center',
    width: '23%',
  },

  categoryIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    elevation: 2,
  },

  categoryIconActive: {
    backgroundColor: '#EAF4FF',
    borderWidth: 1,
    borderColor: '#0A84FF',
  },

  categoryLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '700',
  },

  categoryLabelActive: {
    color: '#062B5F',
  },

  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  optionLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#9CA3AF',
    fontWeight: '900',
  },

  optionValue: {
    marginTop: 4,
    fontSize: 15,
    color: '#062B5F',
    fontWeight: '700',
  },

  notesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    minHeight: 120,
    marginBottom: 18,
    elevation: 2,
  },

  notesInput: {
    marginTop: 12,
    fontSize: 15,
    color: '#062B5F',
    minHeight: 60,
    textAlignVertical: 'top',
  },

  aiCard: {
    flexDirection: 'row',
    backgroundColor: '#EAF4FF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 22,
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

  cardTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#062B5F',
    marginBottom: 6,
  },

  cardText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },

  movementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  movementTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#062B5F',
  },

  movementDate: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
  },

  movementAmount: {
    fontSize: 18,
    fontWeight: '900',
  },

  green: {
    color: '#008A2E',
  },

  red: {
    color: '#D71920',
  },

  primaryButton: {
    backgroundColor: '#062B5F',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },

  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#062B5F',
  },

  secondaryButtonText: {
    color: '#062B5F',
    fontSize: 16,
    fontWeight: '900',
  },

});