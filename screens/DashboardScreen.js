import {useAccessibility} from '../components/AccessibilityContext';
import {Text, TouchableOpacity} from '../components/AccessiblePrimitives';
import HomeShortcuts from '../components/HomeShortcuts';
import HomeAdviceCard from '../components/HomeAdviceCard';
import NotificationBell from '../components/NotificationBell';
import { isCustomizedExperience } from '../utils/experience';
import { useThemeStyles, themeStyle, themeColor } from "../theme/ThemeProvider";
import { useExperience } from '../components/ExperienceProvider';
import { budgetProgress, financialAlerts } from '../utils/alerts';
import { localDate } from '../utils/movementForm';
import ScreenHeader from '../components/ScreenHeader';
import { layout } from '../theme/layout';
import { cashBalance, isSpending, cardDebt, financialTotals } from '../utils/finance';
import { transactionRows, accountRows } from '../services/finance';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import React, {
  useCallback,
  useMemo,
  useState } from
'react';

import {View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { supabase } from '../services/supabase';

export default function DashboardScreen({ navigation }) {
  const { colors, styles } = useThemeStyles(makeStyles);const accessibility=useAccessibility();
  const { preferences, simple, openSettings } = useExperience();
  const [moreOpen, setMoreOpen] = useState(false);
  const [rules, setRules] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [optionalErrors, setOptionalErrors] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [cards, setCards] = useState([]);
  const [cardError, setCardError] = useState(false);
  const [mainGoal, setMainGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // =====================================================
  // CARGAR DASHBOARD
  // =====================================================

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

  async function loadDashboard() {
    try {
      setLoading(true);
      setLoadError(false);

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setLoadError(true);

        return;
      }

      // Cargamos movimientos y meta al mismo tiempo
      const [transactionsResult, goalResult, cardResult, rulesResult, budgetsResult] =
      await Promise.all([
      transactionRows(user.id),

      supabase.
      from('goals').
      select(
        'id, name, target_amount, current_amount, target_date, status, created_at'
      ).
      eq('user_id', user.id).
      eq('status', 'active').
      order('created_at', {
        ascending: true
      }).
      limit(1).
      maybeSingle(),
      accountRows('card_payments', '*', user.id),
      accountRows('recurring_movements', '*', user.id),
      accountRows('budgets', 'id,category,monthly_limit,starts_on,ends_on', user.id)]
      );

      setRules(rulesResult.data || []);setBudgets(budgetsResult.data || []);
      setOptionalErrors([rulesResult.error && 'No pudimos actualizar tus programaciones.', budgetsResult.error && 'Los presupuestos no están disponibles. Revisa Alertas para configurarlos.'].filter(Boolean));
      setLoadError(!!transactionsResult.error || !!goalResult.error);
      setCards(cardResult.data || []);
      setCardError(!!cardResult.error && !['PGRST205', '42P01'].includes(cardResult.error.code));
      // MOVIMIENTOS
      if (transactionsResult.error) {

      } else {
        setTransactions(
          transactionsResult.data || []
        );
      }

      // META PRINCIPAL
      if (goalResult.error) {


        setMainGoal(null);
      } else {
        setMainGoal(goalResult.data || null);
      }
    } catch (error) {
      setLoadError(true);

    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // FORMATO DE DINERO
  // =====================================================

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // =====================================================
  // TOTALES GENERALES
  // =====================================================

  const today = localDate();
  const validTransactions = transactions.filter((item) => item.transaction_date <= today);
  const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const monthTransactions = useMemo(() => transactions.filter((item) => item.transaction_date?.startsWith(monthKey) && item.transaction_date <= today), [transactions, monthKey, today]);
  const monthLabel = new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  const recentTransactions = [...validTransactions].sort((a, b) => (b.transaction_date || '').localeCompare(a.transaction_date || '') || (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 3);

  const {income: totalIncome, expenses: totalExpenses} = financialTotals(monthTransactions);

  const balance = cashBalance(validTransactions);

  // =====================================================
  // GASTOS POR CATEGORÍA
  // =====================================================

  const categoryData = useMemo(() => {
    const categories = {};

    monthTransactions.
    filter(
      (transaction) =>
      isSpending(transaction)
    ).
    forEach((transaction) => {
      const category =
      transaction.category || 'Otros';

      if (!categories[category]) {
        categories[category] = 0;
      }

      categories[category] += Number(
        transaction.amount
      );
    });

    return Object.entries(categories).
    sort((a, b) => b[1] - a[1]).
    slice(0, 3);
  }, [monthTransactions]);

  // =====================================================
  // DATOS ÚLTIMOS 6 MESES
  // =====================================================

  const monthlyData = useMemo(() => {
    const result = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );

      const year = date.getFullYear();
      const month = date.getMonth();

      let income = 0;
      let expenses = 0;

      transactions.forEach((transaction) => {
        if (!transaction.transaction_date) {
          return;
        }

        const [
        transactionYear,
        transactionMonth] =
        transaction.transaction_date.
        split('-').
        map(Number);

        if (
        transactionYear === year &&
        transactionMonth - 1 === month && transaction.transaction_date <= localDate())
        {
          if (transaction.type === 'income') {
            income += Number(transaction.amount);
          }

          if (isSpending(transaction)) {
            expenses += Number(transaction.amount);
          }
        }
      });

      result.push({
        label: date.
        toLocaleDateString('es-MX', {
          month: 'short'
        }).
        replace('.', '').
        substring(0, 3),

        income,
        expenses
      });
    }

    return result;
  }, [transactions]);

  // =====================================================
  // ALTURA DE GRÁFICA
  // =====================================================

  const maxMonthlyAmount = Math.max(
    ...monthlyData.map((month) =>
    Math.max(month.income, month.expenses)
    ),
    1
  );

  // =====================================================
  // PORCENTAJE DE META
  // =====================================================

  const goalPercentage = useMemo(() => {
    if (!mainGoal) {
      return 0;
    }

    const target = Number(
      mainGoal.target_amount || 0
    );

    const current = Number(
      mainGoal.current_amount || 0
    );

    if (target <= 0) {
      return 0;
    }

    return Math.min(
      current / target * 100,
      100
    );
  }, [mainGoal]);

  // =====================================================
  // RESUMEN AUTOMÁTICO
  // =====================================================

  function getFinancialSummary() {
    if (monthTransactions.length === 0) {
      return 'Todavía no tienes movimientos este mes. Registra un ingreso o gasto para empezar.';
    }

    if (
    totalIncome > 0 &&
    totalExpenses === 0)
    {
      return `Has registrado $${formatCurrency(
        totalIncome
      )} en ingresos y todavía no tienes gastos registrados.`;
    }

    if (
    totalExpenses > totalIncome &&
    totalIncome > 0)
    {
      return 'Tus gastos registrados actualmente son mayores que tus ingresos. Revisa tus categorías de gasto para identificar oportunidades de ahorro.';
    }

    if (categoryData.length > 0) {
      const [
      biggestCategory,
      biggestAmount] =
      categoryData[0];

      const percentage =
      totalExpenses > 0 ?
      biggestAmount / totalExpenses * 100 :
      0;

      return `Tu mayor categoría de gasto es ${biggestCategory}, con aproximadamente ${percentage.toFixed(
        0
      )}% de tus gastos de este mes.`;
    }

    return 'Continúa registrando movimientos para obtener un análisis financiero más completo.';
  }

  // =====================================================
  // ICONOS DE CATEGORÍAS
  // =====================================================

  function getCategoryIcon(category) {
    const icons = {
      Comida: 'fast-food-outline',
      Compras: 'bag-outline',
      Transporte: 'car-outline',
      Hogar: 'home-outline',
      Ocio: 'game-controller-outline',
      Entretenimiento:
      'game-controller-outline'
    };

    return icons[category] || 'wallet-outline';
  }

  // =====================================================
  // INTERFAZ
  // =====================================================

  const pending = [
  ...rules.filter((rule) => rule.active).map((rule) => ({ id: `r:${rule.id}`, name: rule.name, date: rule.next_date, amount: Number(rule.amount), income: rule.type === 'income' })),
  ...cards.filter((card) => card.reminder && (card.ledger_enabled || !card.paid) && cardDebt(card, validTransactions) > 0).map((card) => ({ id: `c:${card.id}`, name: card.name, date: card.due_date, amount: cardDebt(card, validTransactions), income: false }))].
  filter((item) => item.date).sort((a, b) => a.date.localeCompare(b.date));
  const next = pending[0];
  const progressBudgets = budgetProgress(budgets, validTransactions).filter(b=>b.status!=='inactive');
  const goRegister = (type) => navigation.navigate('Movimientos', { openSection: 'Nuevo', movementType: type });
  const widgets = preferences.widgets;
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDashboard} tintColor={themeColor(colors.primary, colors)} />}>
      <ScreenHeader title="Inicio" subtitle={simple ? 'Lo importante, sin complicaciones' : 'Tu dinero, de un vistazo'} actionContent={<NotificationBell alerts={financialAlerts({rows:loadError?null:transactions,budgets,rules,cards:cardError?null:cards,goals:mainGoal?[mainGoal]:[]})} onPress={() => navigation.navigate('Alertas')}/> } />
      {loadError ? <View style={styles.errorCard}><Text style={styles.cardText}>No pudimos actualizar toda tu información. Los datos pueden estar desactualizados; desliza hacia abajo para reintentar.</Text></View> : null}
      <View style={styles.balanceCard}><Text style={styles.balanceLabel}>Saldo disponible</Text>{loading ? <ActivityIndicator color={themeColor("#FFFFFF", colors)} style={themeStyle({ padding: 18 }, colors)} /> : <Text style={styles.balanceAmount} numberOfLines={1} adjustsFontSizeToFit>${formatCurrency(balance)}</Text>}<Text style={styles.balanceHint}>MXN · Según tus movimientos registrados hasta hoy</Text></View>
      <View style={[styles.mainActions,accessibility.textScale>=1.4&&{flexDirection:'column'}]}>{[['Gasto', 'Registrar gasto', 'arrow-up-circle-outline', '#B42332', '#FFF0F1'], ['Ingreso', 'Registrar ingreso', 'arrow-down-circle-outline', '#157347', '#EAF7EF']].map(([type, label, icon, color, background]) => <TouchableOpacity key={type} accessibilityRole="button" style={themeStyle([styles.mainAction, { borderColor: color, backgroundColor: background }], colors)} onPress={() => goRegister(type)}><Ionicons accessible={false} name={icon} size={26} color={themeColor(color, colors)} /><Text style={themeStyle({ color, fontWeight: '700', fontSize: 15, textAlign: 'center' }, colors)}>{label}</Text></TouchableOpacity>)}</View>
      <HomeShortcuts navigation={navigation}/>
      {!loading && !loadError && <HomeAdviceCard observation={getFinancialSummary()} navigation={navigation}/>}
      {widgets.payments && !loading && (!simple || next || preferences.priority === 'payments' || optionalErrors.includes('No pudimos actualizar tus programaciones.') || cardError) ? <HomeCard title={next ? next.date < today ? 'Un compromiso pendiente' : 'Tu próximo compromiso' : 'Tus próximos pagos'} icon="calendar-outline" onPress={() => navigation.navigate('Movimientos', { openSection: 'Recurrentes' })} action="Ver pagos y programaciones"><Text style={styles.recentTitle}>{next ? next.name : 'Sin compromisos registrados'}</Text><Text style={styles.cardText}>{next ? `${next.income ? 'Ingreso previsto' : 'Pago registrado'}: $${formatCurrency(next.amount)} · ${new Date(`${next.date}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}` : 'Puedes programar un pago o ingreso cuando lo necesites.'}</Text>{next ? <Text style={styles.homeNote}>Revisa el detalle y confirma solo si ya ocurrió.</Text> : null}{optionalErrors.includes('No pudimos actualizar tus programaciones.') || cardError ? <Text style={styles.homeNote}>No se pudieron actualizar todos tus compromisos. Revisa Programados.</Text> : null}</HomeCard> : null}
      {widgets.goals ? <HomeCard title="Mi meta" icon="flag-outline" action={mainGoal ? 'Ver avance y aportar' : 'Crear mi primera meta'} onPress={() => navigation.navigate('Reportes')}><Text style={styles.recentTitle}>{mainGoal?.name || 'Algo por lo que quieres ahorrar'}</Text>{mainGoal ? <><Text style={styles.cardText}>${formatCurrency(mainGoal.current_amount)} de ${formatCurrency(mainGoal.target_amount)}</Text><View style={styles.progressBackground}><View style={themeStyle([styles.progressFill, { width: `${goalPercentage}%` }], colors)} /></View></> : <Text style={styles.cardText}>Elige un objetivo y avanza a tu ritmo.</Text>}</HomeCard> : null}
      {widgets.cards && !loading ? <HomeCard title="Mis tarjetas" icon="card-outline" action="Administrar tarjetas" onPress={() => navigation.navigate('Movimientos', { openSection: 'Recurrentes' })}>{cardError ? <Text style={styles.cardText}>No pudimos actualizar las tarjetas.</Text> : cards.length ? cards.slice(0, simple ? 2 : cards.length).map((card) => <View key={card.id} style={styles.homeListRow}><Text style={styles.recentTitle}>{card.name}</Text><Text style={styles.cardText}>{cardDebt(card, validTransactions) < 0 ? 'A favor' : 'Deuda registrada'}: ${formatCurrency(Math.abs(cardDebt(card, validTransactions)))}</Text></View>) : <Text style={styles.cardText}>Todavía no has agregado tarjetas.</Text>}</HomeCard> : null}
      {widgets.budgets ? <HomeCard title="Mis presupuestos" icon="pie-chart-outline" action="Ver límites y alertas" onPress={() => navigation.navigate('Alertas', { openTab: 'Presupuestos' })}>{optionalErrors.length && !budgets.length ? <Text style={styles.cardText}>Abre Alertas para revisar o activar tus presupuestos.</Text> : progressBudgets.length ? progressBudgets.slice(0, simple ? 2 : progressBudgets.length).map((budget) => <View key={budget.id} style={styles.homeListRow}><Text style={styles.recentTitle}>{budget.category}</Text><Text style={styles.cardText}>${formatCurrency(budget.spent)} de ${formatCurrency(budget.limit)} · {budget.percent}%</Text></View>) : <Text style={styles.cardText}>Define un límite mensual cuando quieras planear tus gastos.</Text>}</HomeCard> : null}
      {widgets.metrics ? <><HomeCard title="Este mes" icon="analytics-outline" action="Ver reportes" onPress={() => navigation.navigate('Reportes')}><View style={styles.mainActions}><View style={themeStyle({ flex: 1 }, colors)}><Text style={styles.cardText}>Ingresos</Text><Text style={themeStyle({ color: '#157347', fontSize: 19, fontWeight: '700' }, colors)}>${formatCurrency(totalIncome)}</Text></View><View style={themeStyle({ flex: 1 }, colors)}><Text style={styles.cardText}>Gastos</Text><Text style={themeStyle({ color: '#B42332', fontSize: 19, fontWeight: '700' }, colors)}>${formatCurrency(totalExpenses)}</Text></View></View><Text style={styles.homeNote}>{getFinancialSummary()}</Text></HomeCard><View style={styles.chartCard}><Text style={styles.cardTitle}>Últimos seis meses</Text><Text style={styles.homeNote}>Ingresos en verde · Gastos en rojo</Text><View accessible accessibilityRole="image" accessibilityLabel={monthlyData.map(m=>`${m.label}: ingresos ${formatCurrency(m.income)} pesos, gastos ${formatCurrency(m.expenses)} pesos`).join('; ')} style={styles.chart}>{monthlyData.map((month, index) => <DoubleBar key={index} label={month.label} incomeHeight={month.income ? Math.max(6, month.income / maxMonthlyAmount * 105) : 0} expenseHeight={month.expenses ? Math.max(6, month.expenses / maxMonthlyAmount * 105) : 0} />)}</View></View></> : null}
      <HomeCard title="Últimos movimientos" icon="receipt-outline" action="Ver historial" onPress={() => navigation.navigate('Movimientos', { openSection: 'Historial' })}>{!recentTransactions.length ? <Text style={styles.cardText}>Tu historial empieza con tu primer registro.</Text> : recentTransactions.map((item) => <View key={item.id} style={styles.recentRow}><View style={themeStyle({ flex: 1 }, colors)}><Text style={styles.recentTitle}>{item.is_card_payment ? 'Pago de tarjeta' : item.category}</Text><Text style={styles.recentDate}>{new Date(`${item.transaction_date}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}{item.card_id && !item.is_card_payment ? ' · A crédito' : ''}</Text></View><Text style={themeStyle({ color: item.type === 'income' ? '#157347' : '#B42332', fontWeight: '700' }, colors)}>{item.type === 'income' ? '+' : '−'}${formatCurrency(item.amount)}</Text></View>)}</HomeCard>

      <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: moreOpen }} style={styles.homeMenu} onPress={() => setMoreOpen(!moreOpen)}><Ionicons accessible={false} name="grid-outline" size={21} color={themeColor(colors.primary, colors)} /><Text style={themeStyle({ color: colors.primary, flex: 1, fontWeight: '700' }, colors)}>Más herramientas</Text><Ionicons accessible={false} name={moreOpen ? 'chevron-up' : 'chevron-down'} size={18} color={themeColor(colors.primary, colors)} /></TouchableOpacity>
      {moreOpen ? <View style={styles.homeCard}>{[['Reportes', 'Reportes y metas', 'bar-chart-outline'], ['Alertas', 'Alertas y presupuestos', 'notifications-outline'], ['IA', 'Asistente y educación', 'sparkles-outline'], ['Ethereum', 'Ethereum · Módulo educativo', 'information-circle-outline']].map(([route, label, icon]) => <TouchableOpacity key={route} accessibilityRole="button" style={styles.homeMenu} onPress={() => navigation.navigate(route)}><Ionicons accessible={false} name={icon} size={21} color={themeColor(colors.primary, colors)} /><Text style={styles.recentTitle}>{label}</Text></TouchableOpacity>)}</View> : null}
      <TouchableOpacity accessibilityRole="button" style={styles.homeMenu} onPress={openSettings}><Ionicons accessible={false} name="options-outline" size={20} color={themeColor(colors.muted, colors)} /><Text style={styles.cardText}>Personalizar Inicio · Vista {isCustomizedExperience(preferences) ? 'personalizada' : simple ? 'simple' : 'completa'}</Text></TouchableOpacity>
    </ScrollView>
  </SafeAreaView>;
}

function HomeCard({ title, icon, children, action, onPress }) {
  const { colors, styles } = useThemeStyles(makeStyles);
  return <View style={styles.homeCard}><View style={themeStyle({ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 }, colors)}><Ionicons accessible={false} name={icon} size={21} color={themeColor(colors.primary, colors)} /><Text style={styles.cardTitle}>{title}</Text></View>{children}<TouchableOpacity accessibilityRole="button" style={styles.homeMenu} onPress={onPress}><Text style={themeStyle({ color: colors.primary, fontWeight: '600', flex: 1 }, colors)}>{action}</Text><Ionicons accessible={false} name="chevron-forward" size={18} color={themeColor(colors.primary, colors)} /></TouchableOpacity></View>;
}

function DoubleBar({
  incomeHeight,
  expenseHeight,
  label
}) {
  const { colors, styles } = useThemeStyles(makeStyles);
  return (
    <View style={styles.barContainer}>
      <View style={styles.doubleBar}>
        <View
          style={themeStyle([
          styles.bar,
          styles.incomeBar,
          {
            height: incomeHeight
          }], colors)
          } />


        <View
          style={themeStyle([
          styles.bar,
          styles.expenseBar,
          {
            height: expenseHeight
          }], colors)
          } />

      </View>

      <Text style={styles.barLabel}>
        {label}
      </Text>
    </View>);

}


const makeStyles = (colors) => StyleSheet.create({
  homeCard: { padding: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 19, marginBottom: 16 },
  homeMenu: { flexDirection: 'row', gap: 10, minHeight: 46, alignItems: 'center', paddingVertical: 12 },
  homeNote: { fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: 9 },
  homeListRow: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  mainActions: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  mainAction: { flex: 1, borderWidth: 1, borderRadius: 17, minHeight: 88, padding: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  balanceHint: { color: '#E0ECFF', fontSize: 12, marginBottom: 16 },
  errorCard: { padding: 14, borderRadius: 14, backgroundColor: '#FFF4E5', marginBottom: 14 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  recentTitle: { color: colors.ink, fontWeight: '600', fontSize: 14 },
  recentDate: { color: colors.muted, marginTop: 4, fontSize: 12 },
  safe: {
    flex: 1,
    backgroundColor: colors.background
  },

  content: {
    padding: layout.screenPadding,
    paddingBottom: 28
  },





  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18
  },

  balanceLabel: {
    fontSize: 15,
    color: '#DCEEFF',
    marginBottom: 8
  },

  balanceAmount: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 18
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 6
  },

  cardText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20
  },

  progressBackground: {
    height: 7,
    backgroundColor: '#DDEBFA',
    borderRadius: 18,
    marginTop: 14,
    overflow: 'hidden'
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.dark ? colors.primary : colors.ink,
    borderRadius: 18
  },

  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    elevation: 2
  },

  chart: {
    height: 170,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 15
  },

  barContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end'
  },

  doubleBar: {
    height: 115,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3
  },

  bar: {
    width: 13,
    borderRadius: 6
  },

  incomeBar: {
    backgroundColor: '#157347'
  },

  expenseBar: {
    backgroundColor: '#D86666'
  },

  barLabel: {
    marginTop: 8,
    fontSize: 11,
    color: colors.muted,
    fontWeight: '700',
    textTransform: 'capitalize'
  }

});
