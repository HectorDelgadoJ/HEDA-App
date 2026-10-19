import {Alert} from '../services/alerts';
import { notifyFinanceChange } from '../services/financeEvents';
import { useThemeStyles, themeStyle, themeColor } from "../theme/ThemeProvider";
import InfoButton from '../components/InfoButton';
import ScreenHeader from '../components/ScreenHeader';
import { layout } from '../theme/layout';
import { MovementDate } from '../components/MovementFields';
import { localDate } from '../utils/movementForm';
import { reportPeriod, reportData } from '../utils/reports';
import { isSpending } from '../utils/finance';
import { transactionRows } from '../services/finance';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import React, { useCallback, useMemo, useState } from 'react';

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, RefreshControl, Keyboard, KeyboardAvoidingView, TouchableWithoutFeedback, Platform, InputAccessoryView } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { supabase } from '../services/supabase';

const AMOUNT_ACCESSORY_ID = 'amountKeyboardAccessory';

export default function GoalsScreen() {
  const { colors, styles } = useThemeStyles(makeStyles);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);

  const [loading, setLoading] = useState(true);
  const [savingGoal, setSavingGoal] = useState(false);
  const [savingContribution, setSavingContribution] = useState(false);

  const [filter, setFilter] = useState('monthly');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [selectedBar, setSelectedBar] = useState(null);

  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [contributionModalVisible, setContributionModalVisible] =
  useState(false);

  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [chooseGoalDate, setChooseGoalDate] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [deletingGoalId, setDeletingGoalId] = useState(null);

  const [contributionAmount, setContributionAmount] = useState('');

  // =====================================================
  // CARGAR DATOS
  // =====================================================

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
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

      const [transactionsResult, goalsResult] = await Promise.all([
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
      })]
      );

      setLoadError(!!transactionsResult.error || !!goalsResult.error);
      if (transactionsResult.error) {

      } else {
        setTransactions(transactionsResult.data || []);
      }

      if (goalsResult.error) {

      } else {
        setGoals(goalsResult.data || []);
      }
    } catch (error) {
      setLoadError(true);

    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // CERRAR MODALES
  // =====================================================

  function closeGoalModal() {
    Keyboard.dismiss();
    setGoalModalVisible(false);
  }

  function closeContributionModal() {
    Keyboard.dismiss();
    setContributionModalVisible(false);
  }

  // =====================================================
  // CREAR META
  // =====================================================

  function confirmDeleteGoal(goal) {
    Alert.alert('Eliminar meta', `¿Quieres eliminar “${goal.name}”? Se borrará su progreso registrado. Esto no cambia tus movimientos ni tu saldo disponible.`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: () => deleteGoal(goal) }]
    );
  }

  async function deleteGoal(goal) {
    if (deletingGoalId) return;
    setDeletingGoalId(goal.id);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Sesión no disponible');
      const { data, error } = await supabase.from('goals').delete().eq('id', goal.id).eq('user_id', user.id).select('id');
      if (error || !data?.length) throw error || new Error('No se pudo eliminar la meta');
      notifyFinanceChange();setGoals((current) => current.filter((item) => item.id !== goal.id));
      if (selectedGoalId === goal.id) {setSelectedGoalId(null);setContributionModalVisible(false);}
    } catch (error) {
      Alert.alert('No se pudo eliminar', 'Tu meta sigue guardada. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setDeletingGoalId(null);
    }
  }

  async function createGoal() {
    Keyboard.dismiss();

    const cleanName = goalName.trim();

    const numericTarget = Number(
      goalTarget.trim().replace(',', '.')
    );

    if (!cleanName) {
      Alert.alert(
        'Nombre requerido',
        'Escribe el nombre de tu meta.'
      );
      return;
    }

    if (
    !Number.isFinite(numericTarget) ||
    numericTarget <= 0)
    {
      Alert.alert(
        'Monto inválido',
        'Ingresa un monto objetivo mayor a cero.'
      );
      return;
    }

    let targetDate = null;

    if (goalDate.trim()) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

      if (!dateRegex.test(goalDate.trim())) {
        Alert.alert(
          'Fecha inválida',
          'Usa el formato AAAA-MM-DD. Ejemplo: 2026-12-20.'
        );
        return;
      }

      const [year, month, day] = goalDate.
      trim().
      split('-').
      map(Number);

      const parsedDate = new Date(year, month - 1, day);

      const isValidDate =
      parsedDate.getFullYear() === year &&
      parsedDate.getMonth() === month - 1 &&
      parsedDate.getDate() === day;

      if (!isValidDate) {
        Alert.alert(
          'Fecha inválida',
          'Ingresa una fecha válida.'
        );
        return;
      }

      targetDate = goalDate.trim();
    }

    try {
      setSavingGoal(true);

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert(
          'Sesión no disponible',
          'No fue posible identificar tu cuenta.'
        );
        return;
      }

      const { error } = await supabase.
      from('goals').
      insert({
        user_id: user.id,
        name: cleanName,
        target_amount: numericTarget,
        current_amount: 0,
        target_date: targetDate,
        status: 'active'
      });

      if (error) {


        Alert.alert(
          'Error',
          'No se pudo crear la meta.'
        );

        return;
      }

      setGoalName('');
      setGoalTarget('');
      setGoalDate('');
      setChooseGoalDate(false);

      Keyboard.dismiss();
      setGoalModalVisible(false);

      notifyFinanceChange();await loadData();

      Alert.alert(
        'Meta creada',
        'Tu nueva meta de ahorro fue registrada correctamente.'
      );
    } catch (error) {


      Alert.alert(
        'Error',
        'Ocurrió un problema al crear la meta.'
      );
    } finally {
      setSavingGoal(false);
    }
  }

  // =====================================================
  // AGREGAR AHORRO
  // =====================================================

  async function addContribution() {
    Keyboard.dismiss();

    const mainGoal = goals.find((goal) => goal.id === selectedGoalId);

    if (!mainGoal) {
      Alert.alert(
        'Sin meta',
        'No existe una meta activa.'
      );
      return;
    }

    const numericAmount = Number(
      contributionAmount.
      trim().
      replace(',', '.')
    );

    if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0)
    {
      Alert.alert(
        'Monto inválido',
        'Ingresa una cantidad mayor a cero.'
      );
      return;
    }

    const newAmount =
    Number(mainGoal.current_amount) +
    numericAmount;

    const completed =
    newAmount >=
    Number(mainGoal.target_amount);

    try {
      setSavingContribution(true);

      const { error } = await supabase.
      from('goals').
      update({
        current_amount: newAmount,
        status: completed ?
        'completed' :
        'active',
        updated_at: new Date().toISOString()
      }).
      eq('id', mainGoal.id);

      if (error) {


        Alert.alert(
          'Error',
          'No se pudo registrar el ahorro.'
        );

        return;
      }

      setContributionAmount('');

      Keyboard.dismiss();
      setContributionModalVisible(false);

      notifyFinanceChange();await loadData();

      if (completed) {
        Alert.alert(
          '¡Meta alcanzada!',
          `Completaste tu meta "${mainGoal.name}".`
        );
      } else {
        Alert.alert(
          'Ahorro registrado',
          'Tu progreso fue actualizado correctamente.'
        );
      }
    } catch (error) {


      Alert.alert(
        'Error',
        'Ocurrió un problema al registrar el ahorro.'
      );
    } finally {
      setSavingContribution(false);
    }
  }

  // =====================================================
  // FILTRAR TRANSACCIONES
  // =====================================================

  const period = reportPeriod(filter, periodOffset);
  const report = reportData(transactions, period, localDate());
  const filteredTransactions = report.rows;
  const totalIncome = report.income;
  const totalExpenses = report.expenses;
  const balance = report.result;
  const periodText = `${new Date(`${period.start}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })} – ${new Date(`${period.end}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  // =====================================================
  // CATEGORÍAS
  // =====================================================

  const categoryData = useMemo(() => {
    const categories = {};

    filteredTransactions.
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

    return Object.entries(categories).sort(
      (a, b) => b[1] - a[1]
    );
  }, [filteredTransactions]);

  // =====================================================
  // GRÁFICA DE LOS ÚLTIMOS 6 MESES
  // =====================================================

  const monthlyData = report.buckets;

  const maxChartAmount = Math.max(
    ...monthlyData.map((month) =>
    Math.max(
      month.income,
      month.expenses
    )
    ),
    1
  );

  // =====================================================
  // META PRINCIPAL
  // =====================================================

  const mainGoal = goals.find((goal) => goal.id === selectedGoalId);

  // =====================================================
  // ANÁLISIS FINANCIERO
  // =====================================================

  function getAnalysis() {
    if (
    filteredTransactions.length === 0)
    {
      return 'Aún no hay suficientes movimientos en este periodo para generar un análisis financiero.';
    }

    if (
    totalExpenses === 0 &&
    totalIncome > 0)
    {
      return 'Has registrado ingresos pero ningún gasto durante este periodo.';
    }

    if (categoryData.length > 0) {
      const [largestCategory, amount] =
      categoryData[0];

      const percentage =
      totalExpenses > 0 ?
      amount / totalExpenses * 100 :
      0;

      return `${largestCategory} es actualmente tu categoría con mayor gasto y representa aproximadamente ${percentage.toFixed(
        0
      )}% de tus egresos del periodo.`;
    }

    return 'Continúa registrando tus movimientos para obtener un análisis más completo.';
  }

  // =====================================================
  // FORMATO
  // =====================================================

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString(
      'es-MX',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );
  }

  function getCategoryIcon(category) {
    const icons = {
      Comida: 'fast-food-outline',
      Compras: 'bag-outline',
      Transporte: 'car-outline',
      Hogar: 'home-outline',
      Ocio: 'game-controller-outline'
    };

    return (
      icons[category] ||
      'wallet-outline');

  }

  // =====================================================
  // INTERFAZ
  // =====================================================

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={themeColor(colors.primary, colors)} />}>

        {/* HEADER */}

        <ScreenHeader title="Reportes" subtitle="Entiende cómo se mueve tu dinero" icon="bar-chart-outline" />

        {loadError && <View style={styles.notice}><Text style={styles.cardText}>No pudimos actualizar todos los datos. Desliza hacia abajo para reintentar.</Text></View>}
        <View style={styles.periodNav}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Periodo anterior" style={styles.periodButton} onPress={() => {setPeriodOffset((value) => value - 1);setSelectedBar(null);}}><Ionicons name="chevron-back" size={22} color={themeColor(colors.ink, colors)} /></TouchableOpacity>
          <Text style={styles.periodText}>{periodText}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Periodo siguiente" disabled={periodOffset === 0} style={themeStyle([styles.periodButton, periodOffset === 0 && { opacity: 0.3 }], colors)} onPress={() => {setPeriodOffset((value) => Math.min(value + 1, 0));setSelectedBar(null);}}><Ionicons name="chevron-forward" size={22} color={themeColor(colors.ink, colors)} /></TouchableOpacity>
        </View>
        {/* RESUMEN */}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>
            Resultado del periodo
          </Text>

          {loading ?
          <ActivityIndicator
            color={themeColor("#FFFFFF", colors)}
            size="large"
            style={themeStyle({
              alignSelf: 'flex-start',
              marginVertical: 15
            }, colors)} /> :


          <Text
            style={styles.summaryAmount} numberOfLines={1} adjustsFontSizeToFit>

              ${formatCurrency(balance)} MXN
            </Text>
          }

          <Text style={styles.summaryHint}>Ingresos menos gastos · No es tu saldo disponible</Text>
          <View style={styles.summaryRow}>
            <View style={themeStyle([styles.summaryItem, styles.incomeTile], colors)}>
              <Text
                style={themeStyle([styles.smallLabel, { color: '#157347' }], colors)}>

                Ingresos
              </Text>

              <Text style={styles.income} numberOfLines={1} adjustsFontSizeToFit>
                +$
                {formatCurrency(
                  totalIncome
                )}
              </Text>
            </View>



            <View style={themeStyle([styles.summaryItem, styles.expenseTile], colors)}>
              <Text
                style={themeStyle([styles.smallLabel, { color: '#B42332' }], colors)}>

                Gastos
              </Text>

              <Text style={styles.expense} numberOfLines={1} adjustsFontSizeToFit>
                -$
                {formatCurrency(
                  totalExpenses
                )}
              </Text>
            </View>
          </View>
        </View>

        {transactions.some((row) => row.card_id) && <InfoButton title={"Cómo contamos tus gastos"} text={"Los gastos incluyen compras con tarjeta. Pagar la tarjeta no cuenta como un nuevo gasto."} />}
        {/* META */}

        <View
          style={styles.goalSectionHeader}>

          <Text style={styles.sectionTitle}>
            Mis metas
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Crear nueva meta de ahorro"
            style={styles.newGoalButton}
            onPress={() =>
            setGoalModalVisible(true)
            }>

            <Ionicons name="add" size={20} color={themeColor("#FFFFFF", colors)} />
            <Text style={styles.newGoalButtonText}>Nueva meta</Text>
          </TouchableOpacity>
        </View>

        {goals.length > 0 ? goals.map((mainGoal) => {
          const goalPercentage = Number(mainGoal.target_amount) > 0 ? Math.min(100, Number(mainGoal.current_amount) / Number(mainGoal.target_amount) * 100) : 0;
          return (
            <View key={mainGoal.id} style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <View style={styles.goalIcon}>
                <Ionicons
                    name="flag-outline"
                    size={24}
                    color={themeColor(colors.primary, colors)} />

              </View>

              <View style={themeStyle({ flex: 1 }, colors)}>
                <Text
                    style={styles.cardTitle}>

                  Meta de ahorro
                </Text>

                <Text
                    style={styles.cardText}>

                  {mainGoal.name}
                </Text>
              </View>

              <Text
                  style={styles.goalPercent}>

                {goalPercentage.toFixed(0)}%
              </Text>
            </View>

            <View
                style={
                styles.progressBackground
                }>

              <View
                  style={themeStyle([
                  styles.progressFill,
                  {
                    width: `${goalPercentage}%`
                  }], colors)
                  } />

            </View>

            <View style={styles.goalFooter}>
              <Text style={styles.goalText}>
                $
                {formatCurrency(
                    mainGoal.current_amount
                  )}{' '}
                acumulado
              </Text>

              <Text style={styles.goalText}>
                Meta: $
                {formatCurrency(
                    mainGoal.target_amount
                  )}
              </Text>
            </View>

            {mainGoal.target_date &&
              <Text style={styles.goalDate}>
                Fecha objetivo:{' '}
                {new Date(`${mainGoal.target_date}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              }

            <TouchableOpacity
                style={
                styles.contributionButton
                }
                onPress={() => {setSelectedGoalId(mainGoal.id);setContributionAmount('');setContributionModalVisible(true);}}>

              <Ionicons
                  name="add-circle-outline"
                  size={20}
                  color={themeColor("#FFFFFF", colors)} />


              <Text
                  style={
                  styles.contributionButtonText
                  }>

                Agregar ahorro
              </Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Eliminar meta ${mainGoal.name}`} disabled={!!deletingGoalId} onPress={() => confirmDeleteGoal(mainGoal)} style={themeStyle([styles.deleteGoalButton, deletingGoalId && { opacity: 0.5 }], colors)}>
              {deletingGoalId === mainGoal.id ? <ActivityIndicator color={themeColor("#B42332", colors)} /> : <><Ionicons name="trash-outline" size={17} color={themeColor("#B42332", colors)} /><Text style={styles.deleteGoalText}>Eliminar meta</Text></>}
            </TouchableOpacity>
          </View>);
        }) :
        <TouchableOpacity
          style={styles.emptyGoalCard}
          onPress={() =>
          setGoalModalVisible(true)
          }>

            <Ionicons
            name="flag-outline"
            size={34}
            color={themeColor(colors.primary, colors)} />


            <Text style={styles.emptyGoalTitle}>
              Crea tu primera meta
            </Text>

            <Text style={styles.emptyGoalText}>
              Define cuánto quieres ahorrar y
              registra tu progreso.
            </Text>
          </TouchableOpacity>
        }

        {/* FILTROS */}

        <View style={styles.filterRow}>
          <FilterButton
            label="Mensual"
            active={
            filter === 'monthly'
            }
            onPress={() =>
            {setFilter('monthly');setPeriodOffset(0);setSelectedBar(null);}
            } />


          <FilterButton
            label="Semanal"
            active={
            filter === 'weekly'
            }
            onPress={() =>
            {setFilter('weekly');setPeriodOffset(0);setSelectedBar(null);}
            } />


          <FilterButton
            label="Anual"
            active={
            filter === 'yearly'
            }
            onPress={() =>
            {setFilter('yearly');setPeriodOffset(0);setSelectedBar(null);}
            } />

        </View>

        {/* GRÁFICA */}

        <View style={styles.chartCard}>
          <View style={styles.sectionHeader}>
            <Text
              style={styles.sectionTitle}>

              Actividad financiera
            </Text>

            <Text
              style={styles.sectionLink}>

              {filter === 'weekly' ? 'Por día' : filter === 'yearly' ? 'Por mes' : 'Por semana'}
            </Text>
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View
                style={themeStyle([
                styles.legendDot,
                styles.incomeDot], colors)
                } />


              <Text
                style={styles.legendText}>

                Ingresos
              </Text>
            </View>

            <View style={styles.legendItem}>
              <View
                style={themeStyle([
                styles.legendDot,
                styles.expenseDot], colors)
                } />


              <Text
                style={styles.legendText}>

                Gastos
              </Text>
            </View>
          </View>

          <Text style={styles.chartHint}>Toca las barras para ver los importes · MXN</Text>
          {selectedBar && <View style={styles.notice}><Text style={styles.cardText}>{selectedBar.label}: ingresos ${formatCurrency(selectedBar.income)} · gastos ${formatCurrency(selectedBar.expenses)}</Text></View>}
          {totalIncome === 0 && totalExpenses === 0 && <Text style={styles.chartHint}>Sin ingresos ni gastos en este periodo.</Text>}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={themeStyle([styles.chart, { minWidth: filter === 'yearly' ? 560 : 280, flex: 1 }], colors)}>
            {monthlyData.map(
                (month, index) =>
                <DoubleBar
                  key={`${month.label}-${index}`}
                  label={month.label}
                  onPress={() => setSelectedBar(month)}
                  description={`${month.label}: ingresos ${formatCurrency(month.income)}, gastos ${formatCurrency(month.expenses)}`}
                  incomeHeight={
                  month.income > 0 ?
                  Math.max(
                    8,
                    month.income /
                    maxChartAmount *
                    110
                  ) :
                  0
                  }
                  expenseHeight={
                  month.expenses > 0 ?
                  Math.max(
                    8,
                    month.expenses /
                    maxChartAmount *
                    110
                  ) :
                  0
                  } />


              )}
          </View>
          </ScrollView>
          {report.cardPayments > 0 && <Text style={styles.chartHint}>Pagaste ${formatCurrency(report.cardPayments)} a tarjetas. Estos pagos reducen tu dinero disponible y no vuelven a contar como gastos.</Text>}
        </View>

        {/* CATEGORÍAS */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Gastos por categoría
          </Text>
        </View>

        {categoryData.length === 0 ?
        <View style={styles.emptyCard}>
            <Ionicons
            name="pie-chart-outline"
            size={30}
            color={themeColor("#9CA3AF", colors)} />


            <Text style={styles.emptyTitle}>
              Sin gastos
            </Text>

            <Text style={styles.emptyText}>
              No hay gastos registrados
              durante este periodo.
            </Text>
          </View> :

        categoryData.map(
          ([category, amount]) => {
            const percent =
            totalExpenses > 0 ?
            amount /
            totalExpenses *
            100 :
            0;

            return (
              <CategoryBar
                key={category}
                icon={getCategoryIcon(
                  category
                )}
                title={category}
                amount={`$${formatCurrency(
                  amount
                )}`}
                percent={`${percent.toFixed(
                  0
                )}%`}
                width={`${Math.min(
                  percent,
                  100
                )}%`} />);


          }
        )
        }

        {/* ANÁLISIS */}

        <View style={styles.aiCard}>
          <View style={styles.aiIcon}>
            <Ionicons
              name="sparkles"
              size={21}
              color={themeColor(colors.primary, colors)} />

          </View>

          <View style={themeStyle({ flex: 1 }, colors)}>
            <Text style={styles.cardTitle}>
              Análisis financiero
            </Text>

            <Text style={styles.cardText}>
              {getAnalysis()}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ================================================= */}
      {/* MODAL NUEVA META */}
      {/* ================================================= */}

      <Modal
        visible={goalModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeGoalModal}>

        <KeyboardAvoidingView
          style={styles.modalKeyboardContainer}
          behavior={
          Platform.OS === 'ios' ?
          'padding' :
          'height'
          }>

          <TouchableWithoutFeedback
            onPress={Keyboard.dismiss}
            accessible={false}>

            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <View
                  style={styles.modalHeader}>

                  <Text
                    style={styles.modalTitle}>

                    Nueva meta
                  </Text>

                  <TouchableOpacity
                    onPress={closeGoalModal}>

                    <Ionicons
                      name="close"
                      size={25}
                      color={themeColor(colors.ink, colors)} />

                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={
                  false
                  }
                  keyboardShouldPersistTaps="handled"
                  refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={themeColor(colors.primary, colors)} />}>

                  <Text
                    style={styles.inputLabel}>

                    Nombre
                  </Text>

                  <TextInput selectionColor={colors.link} cursorColor={colors.link}
                    value={goalName}
                    onChangeText={setGoalName}
                    placeholder="Ej. Laptop nueva"
                    placeholderTextColor={colors.placeholder}
                    style={styles.input}
                    returnKeyType="next" keyboardAppearance={colors.dark ? "dark" : "light"} />


                  <Text
                    style={styles.inputLabel}>

                    Cantidad objetivo
                  </Text>

                  <TextInput selectionColor={colors.link} cursorColor={colors.link}
                    value={goalTarget}
                    onChangeText={setGoalTarget}
                    placeholder="10000"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="decimal-pad"
                    inputAccessoryViewID={
                    Platform.OS === 'ios' ?
                    AMOUNT_ACCESSORY_ID :
                    undefined
                    }
                    style={styles.input} keyboardAppearance={colors.dark ? "dark" : "light"} />


                  <Text
                    style={styles.inputLabel}>

                    Fecha objetivo (opcional)
                  </Text>

                  {chooseGoalDate ? <>
                    <MovementDate title="Fecha meta" value={goalDate || localDate()} onChange={setGoalDate} initiallyOpen />
                    <TouchableOpacity accessibilityRole="button" style={styles.optionalDateButton} onPress={() => {setGoalDate('');setChooseGoalDate(false);}}><Text style={styles.sectionLink}>Quitar fecha · Sin fecha límite</Text></TouchableOpacity>
                  </> : <TouchableOpacity accessibilityRole="button" style={styles.optionalDateButton} onPress={() => {Keyboard.dismiss();setGoalDate(localDate());setChooseGoalDate(true);}}><Ionicons name="calendar-outline" size={20} color={themeColor(colors.primary, colors)} /><Text style={styles.sectionLink}>Elegir fecha</Text></TouchableOpacity>}
                  <Text style={styles.chartHint}>Puedes crear la meta sin fecha límite.</Text>

                  <TouchableOpacity
                    style={themeStyle([
                    styles.saveButton,
                    savingGoal &&
                    styles.disabledButton], colors)
                    }
                    onPress={createGoal}
                    disabled={savingGoal}>

                    {savingGoal ?
                    <ActivityIndicator
                      color={themeColor("#FFFFFF", colors)} /> :


                    <Text
                      style={
                      styles.saveButtonText
                      }>

                        Crear meta
                      </Text>
                    }
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================================================= */}
      {/* MODAL AGREGAR AHORRO */}
      {/* ================================================= */}

      <Modal
        visible={
        contributionModalVisible
        }
        transparent
        animationType="slide"
        onRequestClose={
        closeContributionModal
        }>

        <KeyboardAvoidingView
          style={styles.modalKeyboardContainer}
          behavior={
          Platform.OS === 'ios' ?
          'padding' :
          'height'
          }>

          <TouchableWithoutFeedback
            onPress={Keyboard.dismiss}
            accessible={false}>

            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <View
                  style={styles.modalHeader}>

                  <Text
                    style={styles.modalTitle}>

                    Agregar ahorro
                  </Text>

                  <TouchableOpacity
                    onPress={
                    closeContributionModal
                    }>

                    <Ionicons
                      name="close"
                      size={25}
                      color={themeColor(colors.ink, colors)} />

                  </TouchableOpacity>
                </View>

                {mainGoal &&
                <Text
                  style={
                  styles.modalDescription
                  }>

                    Meta: {mainGoal.name}
                  </Text>
                }

                <Text
                  style={styles.inputLabel}>

                  Cantidad
                </Text>

                <TextInput selectionColor={colors.link} cursorColor={colors.link}
                  value={contributionAmount}
                  onChangeText={
                  setContributionAmount
                  }
                  placeholder="500"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="decimal-pad"
                  inputAccessoryViewID={
                  Platform.OS === 'ios' ?
                  AMOUNT_ACCESSORY_ID :
                  undefined
                  }
                  style={styles.input} keyboardAppearance={colors.dark ? "dark" : "light"} />


                <TouchableOpacity
                  style={themeStyle([
                  styles.saveButton,
                  savingContribution &&
                  styles.disabledButton], colors)
                  }
                  onPress={addContribution}
                  disabled={
                  savingContribution
                  }>

                  {savingContribution ?
                  <ActivityIndicator
                    color={themeColor("#FFFFFF", colors)} /> :


                  <Text
                    style={
                    styles.saveButtonText
                    }>

                      Registrar ahorro
                    </Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================================================= */}
      {/* BOTÓN LISTO SOBRE TECLADO iOS */}
      {/* ================================================= */}

      {Platform.OS === 'ios' &&
      <InputAccessoryView
        nativeID={
        AMOUNT_ACCESSORY_ID
        }>

          <View
          style={
          styles.keyboardAccessory
          }>

            <TouchableOpacity
            onPress={Keyboard.dismiss}
            style={
            styles.keyboardDoneButton
            }>

              <Text
              style={
              styles.keyboardDoneText
              }>

                Listo
              </Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      }
    </SafeAreaView>);

}


// =====================================================
// FILTRO
// =====================================================

function FilterButton({
  label,
  active,
  onPress
}) {
  const { colors, styles } = useThemeStyles(makeStyles);
  return (
    <TouchableOpacity
      style={themeStyle(
        active ?
        styles.filterActive :
        styles.filterButton, colors)
      }
      onPress={onPress}>

      <Text
        style={themeStyle(
          active ?
          styles.filterActiveText :
          styles.filterText, colors)
        }>

        {label}
      </Text>
    </TouchableOpacity>);

}


// =====================================================
// GRÁFICA
// =====================================================

function DoubleBar({
  incomeHeight,
  expenseHeight,
  label,
  onPress,
  description
}) {
  const { colors, styles } = useThemeStyles(makeStyles);
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={description} onPress={onPress} style={styles.barContainer}>
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
    </TouchableOpacity>);

}


// =====================================================
// CATEGORÍA
// =====================================================

function categoryPalette(title) {
  const palettes = {
    Comida: ['#B65A11', '#FFF1E3'], Compras: ['#AD3E7B', '#FCECF5'],
    Transporte: ['#2463B5', '#EAF2FF'], Hogar: ['#7951B0', '#F2ECFC'],
    Servicios: ['#167B83', '#E5F5F5'], Salud: ['#B94454', '#FDECF0'],
    Educación: ['#397547', '#EAF5EB'], Entretenimiento: ['#88631E', '#FFF5D9'],
    Ocio: ['#88631E', '#FFF5D9']
  };
  return palettes[title] || ['#59677C', '#EDF1F6'];
}

function CategoryBar({
  icon,
  title,
  amount,
  percent,
  width
}) {
  const { colors, styles } = useThemeStyles(makeStyles);
  const [accent, background] = categoryPalette(title);
  return (
    <View style={themeStyle([styles.categoryCard, { borderLeftWidth: 4, borderLeftColor: accent }], colors)}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryLeft}>
          <View style={themeStyle([styles.categoryIcon, { backgroundColor: background }], colors)}>
            <Ionicons
              name={icon}
              size={21}
              color={themeColor(accent, colors)} />

          </View>

          <View>
            <Text
              style={styles.categoryTitle}>

              {title}
            </Text>

            <Text
              style={styles.categoryAmount}>

              {amount}
            </Text>
          </View>
        </View>

        <Text
          style={themeStyle([styles.categoryPercent, { color: accent }], colors)}>

          {percent}
        </Text>
      </View>

      <View
        style={themeStyle([styles.categoryProgress, { backgroundColor: background }], colors)}>

        <View
          style={themeStyle([
          styles.categoryProgressFill,
          { width, backgroundColor: accent }], colors)
          } />

      </View>
    </View>);

}


// =====================================================
// ESTILOS
// =====================================================

const makeStyles = (colors) => StyleSheet.create({
  newGoalButton: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 13, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  newGoalButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  deleteGoalButton: { marginTop: 10, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#F2C4C9', backgroundColor: '#FFF0F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  deleteGoalText: { color: '#B42332', fontSize: 13, fontWeight: '600' },

  optionalDateButton: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, borderRadius: 14, backgroundColor: colors.softBlue, minHeight: 48, marginBottom: 8 },

  notice: { padding: 12, borderRadius: 12, backgroundColor: '#EDF4FF', marginBottom: 12 },
  periodNav: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  periodButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  periodText: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  chartHint: { fontSize: 12, color: colors.muted, lineHeight: 18, marginTop: 10, marginBottom: 8 },
  summaryHint: { color: '#E0ECFF', fontSize: 12, lineHeight: 18, marginBottom: 14 },
  incomeTile: { backgroundColor: '#EAF7EF', borderWidth: 1, borderColor: '#B9E1C9' },
  expenseTile: { backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#F2C4C9' },

  safe: {
    flex: 1,
    backgroundColor: colors.background
  },

  container: {
    flex: 1,
    backgroundColor: colors.background
  },

  content: {
    padding: layout.screenPadding,
    paddingBottom: 28
  },





  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20
  },

  summaryLabel: {
    fontSize: 15,
    color: '#DCEEFF',
    marginBottom: 8
  },

  summaryAmount: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 18
  },

  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryItem: { flex: 1, minWidth: 0, padding: 12, borderRadius: 15 },
  smallLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  income: { color: '#157347', fontSize: 16, fontWeight: '700' },
  expense: { color: '#B42332', fontSize: 16, fontWeight: '700' },

  separator: {
    width: 1,
    backgroundColor:
    'rgba(255,255,255,0.25)',
    marginHorizontal: 12
  },

  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#EAF1F8',
    borderRadius: 18,
    padding: 5,
    marginBottom: 20
  },

  filterButton: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 14
  },

  filterActive: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    elevation: 2
  },

  filterText: {
    color: colors.muted,
    fontWeight: '600'
  },

  filterActiveText: {
    color: colors.ink,
    fontWeight: '700'
  },

  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    elevation: 2
  },

  sectionHeader: {
    marginTop: 4,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  goalSectionHeader: {
    marginTop: 10,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink
  },

  sectionLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase'
  },

  legendRow: {
    flexDirection: 'row',
    gap: 18
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },

  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 10,
    marginRight: 6
  },

  incomeDot: {
    backgroundColor: '#157347'
  },

  expenseDot: {
    backgroundColor: '#D86666'
  },

  legendText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '700'
  },

  chart: {
    height: 170,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 20
  },

  barContainer: {
    minWidth: 38,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'flex-end'
  },

  doubleBar: {
    height: 120,
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
  },

  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    elevation: 2
  },

  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14
  },

  categoryLeft: {
    flex: 1,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },

  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },

  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink
  },

  categoryAmount: {
    marginTop: 4,
    fontSize: 13,
    color: colors.muted,
    fontWeight: '700'
  },

  categoryPercent: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700'
  },

  categoryProgress: {
    height: 8,
    backgroundColor: '#EAF1F8',
    borderRadius: 18,
    overflow: 'hidden'
  },

  categoryProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 18
  },

  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    elevation: 2
  },

  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18
  },

  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4
  },

  cardText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20
  },

  goalPercent: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700'
  },

  progressBackground: {
    height: 9,
    backgroundColor: '#DDEBFA',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.ink,
    borderRadius: 18
  },

  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },

  goalText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '700'
  },

  goalDate: {
    marginTop: 10,
    fontSize: 12,
    color: colors.muted
  },

  contributionButton: {
    marginTop: 18,
    backgroundColor: colors.ink,
    borderRadius: 15,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7
  },

  contributionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14
  },

  emptyGoalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    alignItems: 'center',
    elevation: 2
  },

  emptyGoalTitle: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink
  },

  emptyGoalText: {
    marginTop: 5,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center'
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    marginBottom: 18,
    elevation: 2
  },

  emptyTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink
  },

  emptyText: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center'
  },

  aiCard: {
    flexDirection: 'row',
    backgroundColor: colors.softBlue,
    borderRadius: 18,
    padding: 18,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#D7EAFE'
  },

  aiIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },

  // =====================================================
  // MODALES
  // =====================================================

  modalKeyboardContainer: {
    flex: 1
  },

  modalOverlay: {
    flex: 1,
    backgroundColor:
    colors.overlay,
    justifyContent: 'flex-end'
  },

  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    paddingBottom: 40,
    maxHeight: '85%'
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18
  },

  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.ink
  },

  modalDescription: {
    fontSize: 15,
    color: colors.muted,
    marginBottom: 18
  },

  inputLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: colors.muted,
    fontWeight: '700',
    marginBottom: 7
  },

  input: {
    backgroundColor: colors.background,
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.ink,
    fontSize: 16,
    marginBottom: 18
  },

  saveButton: {
    backgroundColor: colors.ink,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4
  },

  disabledButton: {
    opacity: 0.65
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },

  // =====================================================
  // BARRA SOBRE TECLADO iOS
  // =====================================================

  keyboardAccessory: {
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D1D5DB',
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignItems: 'flex-end'
  },

  keyboardDoneButton: {
    paddingHorizontal: 10,
    paddingVertical: 5
  },

  keyboardDoneText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700'
  }
});
