import React, { useCallback, useMemo, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Platform,
  InputAccessoryView,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { supabase } from '../services/supabase';

const AMOUNT_ACCESSORY_ID = 'amountKeyboardAccessory';

export default function GoalsScreen() {
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);

  const [loading, setLoading] = useState(true);
  const [savingGoal, setSavingGoal] = useState(false);
  const [savingContribution, setSavingContribution] = useState(false);

  const [filter, setFilter] = useState('monthly');

  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [contributionModalVisible, setContributionModalVisible] =
    useState(false);

  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDate, setGoalDate] = useState('');

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

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.log(
          'Error obteniendo usuario:',
          userError?.message
        );
        return;
      }

      const [transactionsResult, goalsResult] = await Promise.all([
        supabase
          .from('transactions')
          .select(
            'id, type, amount, category, description, transaction_date, created_at'
          )
          .eq('user_id', user.id)
          .order('transaction_date', {
            ascending: false,
          }),

        supabase
          .from('goals')
          .select(
            'id, name, target_amount, current_amount, target_date, status, created_at'
          )
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', {
            ascending: true,
          }),
      ]);

      if (transactionsResult.error) {
        console.log(
          'Error cargando movimientos:',
          transactionsResult.error.message
        );
      } else {
        setTransactions(transactionsResult.data || []);
      }

      if (goalsResult.error) {
        console.log(
          'Error cargando metas:',
          goalsResult.error.message
        );
      } else {
        setGoals(goalsResult.data || []);
      }
    } catch (error) {
      console.log(
        'Error cargando reportes:',
        error
      );
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
      Number.isNaN(numericTarget) ||
      numericTarget <= 0
    ) {
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

      const [year, month, day] = goalDate
        .trim()
        .split('-')
        .map(Number);

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
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert(
          'Sesión no disponible',
          'No fue posible identificar tu cuenta.'
        );
        return;
      }

      const { error } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          name: cleanName,
          target_amount: numericTarget,
          current_amount: 0,
          target_date: targetDate,
          status: 'active',
        });

      if (error) {
        console.log(
          'Error creando meta:',
          error.message
        );

        Alert.alert(
          'Error',
          'No se pudo crear la meta.'
        );

        return;
      }

      setGoalName('');
      setGoalTarget('');
      setGoalDate('');

      Keyboard.dismiss();
      setGoalModalVisible(false);

      await loadData();

      Alert.alert(
        'Meta creada',
        'Tu nueva meta de ahorro fue registrada correctamente.'
      );
    } catch (error) {
      console.log(
        'Error inesperado creando meta:',
        error
      );

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

    const mainGoal = goals[0];

    if (!mainGoal) {
      Alert.alert(
        'Sin meta',
        'No existe una meta activa.'
      );
      return;
    }

    const numericAmount = Number(
      contributionAmount
        .trim()
        .replace(',', '.')
    );

    if (
      Number.isNaN(numericAmount) ||
      numericAmount <= 0
    ) {
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

      const { error } = await supabase
        .from('goals')
        .update({
          current_amount: newAmount,
          status: completed
            ? 'completed'
            : 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', mainGoal.id);

      if (error) {
        console.log(
          'Error actualizando meta:',
          error.message
        );

        Alert.alert(
          'Error',
          'No se pudo registrar el ahorro.'
        );

        return;
      }

      setContributionAmount('');

      Keyboard.dismiss();
      setContributionModalVisible(false);

      await loadData();

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
      console.log(
        'Error aportando a meta:',
        error
      );

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

  const filteredTransactions = useMemo(() => {
    const now = new Date();

    return transactions.filter((transaction) => {
      if (!transaction.transaction_date) {
        return false;
      }

      const [year, month, day] =
        transaction.transaction_date
          .split('-')
          .map(Number);

      const transactionDate = new Date(
        year,
        month - 1,
        day
      );

      if (filter === 'monthly') {
        return (
          transactionDate.getFullYear() ===
            now.getFullYear() &&
          transactionDate.getMonth() ===
            now.getMonth()
        );
      }

      if (filter === 'yearly') {
        return (
          transactionDate.getFullYear() ===
          now.getFullYear()
        );
      }

      if (filter === 'weekly') {
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );

        const selectedDate = new Date(
          transactionDate.getFullYear(),
          transactionDate.getMonth(),
          transactionDate.getDate()
        );

        const difference =
          today.getTime() -
          selectedDate.getTime();

        const days =
          difference /
          (1000 * 60 * 60 * 24);

        return days >= 0 && days < 7;
      }

      return true;
    });
  }, [transactions, filter]);

  // =====================================================
  // TOTALES
  // =====================================================

  const totalIncome = filteredTransactions
    .filter(
      (transaction) =>
        transaction.type === 'income'
    )
    .reduce(
      (total, transaction) =>
        total + Number(transaction.amount),
      0
    );

  const totalExpenses = filteredTransactions
    .filter(
      (transaction) =>
        transaction.type === 'expense'
    )
    .reduce(
      (total, transaction) =>
        total + Number(transaction.amount),
      0
    );

  const balance =
    totalIncome - totalExpenses;

  // =====================================================
  // CATEGORÍAS
  // =====================================================

  const categoryData = useMemo(() => {
    const categories = {};

    filteredTransactions
      .filter(
        (transaction) =>
          transaction.type === 'expense'
      )
      .forEach((transaction) => {
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

      transactions.forEach(
        (transaction) => {
          if (
            !transaction.transaction_date
          ) {
            return;
          }

          const [
            transactionYear,
            transactionMonth,
          ] = transaction.transaction_date
            .split('-')
            .map(Number);

          if (
            transactionYear === year &&
            transactionMonth - 1 === month
          ) {
            if (
              transaction.type ===
              'income'
            ) {
              income += Number(
                transaction.amount
              );
            }

            if (
              transaction.type ===
              'expense'
            ) {
              expenses += Number(
                transaction.amount
              );
            }
          }
        }
      );

      result.push({
        label: date
          .toLocaleDateString('es-MX', {
            month: 'short',
          })
          .replace('.', '')
          .substring(0, 3),

        income,
        expenses,
      });
    }

    return result;
  }, [transactions]);

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

  const mainGoal = goals[0];

  const goalPercentage = mainGoal
    ? Math.min(
        (Number(mainGoal.current_amount) /
          Number(mainGoal.target_amount)) *
          100,
        100
      )
    : 0;

  // =====================================================
  // ANÁLISIS FINANCIERO
  // =====================================================

  function getAnalysis() {
    if (
      filteredTransactions.length === 0
    ) {
      return 'Aún no hay suficientes movimientos en este periodo para generar un análisis financiero.';
    }

    if (
      totalExpenses === 0 &&
      totalIncome > 0
    ) {
      return 'Has registrado ingresos pero ningún gasto durante este periodo.';
    }

    if (categoryData.length > 0) {
      const [largestCategory, amount] =
        categoryData[0];

      const percentage =
        totalExpenses > 0
          ? (amount / totalExpenses) * 100
          : 0;

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
        maximumFractionDigits: 2,
      }
    );
  }

  function getCategoryIcon(category) {
    const icons = {
      Comida: 'fast-food-outline',
      Compras: 'bag-outline',
      Transporte: 'car-outline',
      Hogar: 'home-outline',
      Ocio: 'game-controller-outline',
    };

    return (
      icons[category] ||
      'wallet-outline'
    );
  }

  function getPeriodName() {
    if (filter === 'weekly') {
      return 'Balance semanal';
    }

    if (filter === 'yearly') {
      return 'Balance anual';
    }

    return 'Balance del mes';
  }

  // =====================================================
  // INTERFAZ
  // =====================================================

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>
              Reportes
            </Text>

            <Text style={styles.subtitle}>
              Resumen financiero
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.notificationButton
            }
          >
            <Ionicons
              name="bar-chart-outline"
              size={22}
              color="#062B5F"
            />
          </TouchableOpacity>
        </View>

        {/* RESUMEN */}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>
            {getPeriodName()}
          </Text>

          {loading ? (
            <ActivityIndicator
              color="#FFFFFF"
              size="large"
              style={{
                alignSelf: 'flex-start',
                marginVertical: 15,
              }}
            />
          ) : (
            <Text
              style={styles.summaryAmount}
            >
              ${formatCurrency(balance)} MXN
            </Text>
          )}

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text
                style={styles.smallLabel}
              >
                Ingresos
              </Text>

              <Text style={styles.income}>
                +$
                {formatCurrency(
                  totalIncome
                )}
              </Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.summaryItem}>
              <Text
                style={styles.smallLabel}
              >
                Egresos
              </Text>

              <Text style={styles.expense}>
                -$
                {formatCurrency(
                  totalExpenses
                )}
              </Text>
            </View>
          </View>
        </View>

        {/* FILTROS */}

        <View style={styles.filterRow}>
          <FilterButton
            label="Mensual"
            active={
              filter === 'monthly'
            }
            onPress={() =>
              setFilter('monthly')
            }
          />

          <FilterButton
            label="Semanal"
            active={
              filter === 'weekly'
            }
            onPress={() =>
              setFilter('weekly')
            }
          />

          <FilterButton
            label="Anual"
            active={
              filter === 'yearly'
            }
            onPress={() =>
              setFilter('yearly')
            }
          />
        </View>

        {/* GRÁFICA */}

        <View style={styles.chartCard}>
          <View style={styles.sectionHeader}>
            <Text
              style={styles.sectionTitle}
            >
              Actividad financiera
            </Text>

            <Text
              style={styles.sectionLink}
            >
              6 meses
            </Text>
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  styles.incomeDot,
                ]}
              />

              <Text
                style={styles.legendText}
              >
                Ingresos
              </Text>
            </View>

            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  styles.expenseDot,
                ]}
              />

              <Text
                style={styles.legendText}
              >
                Gastos
              </Text>
            </View>
          </View>

          <View style={styles.chart}>
            {monthlyData.map(
              (month, index) => (
                <DoubleBar
                  key={`${month.label}-${index}`}
                  label={month.label}
                  incomeHeight={
                    month.income > 0
                      ? Math.max(
                          8,
                          (month.income /
                            maxChartAmount) *
                            110
                        )
                      : 4
                  }
                  expenseHeight={
                    month.expenses > 0
                      ? Math.max(
                          8,
                          (month.expenses /
                            maxChartAmount) *
                            110
                        )
                      : 4
                  }
                />
              )
            )}
          </View>
        </View>

        {/* CATEGORÍAS */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Gastos por categoría
          </Text>
        </View>

        {categoryData.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="pie-chart-outline"
              size={30}
              color="#9CA3AF"
            />

            <Text style={styles.emptyTitle}>
              Sin gastos
            </Text>

            <Text style={styles.emptyText}>
              No hay gastos registrados
              durante este periodo.
            </Text>
          </View>
        ) : (
          categoryData.map(
            ([category, amount]) => {
              const percent =
                totalExpenses > 0
                  ? (amount /
                      totalExpenses) *
                    100
                  : 0;

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
                  )}%`}
                />
              );
            }
          )
        )}

        {/* META */}

        <View
          style={styles.goalSectionHeader}
        >
          <Text style={styles.sectionTitle}>
            Meta de ahorro
          </Text>

          <TouchableOpacity
            onPress={() =>
              setGoalModalVisible(true)
            }
          >
            <Text style={styles.sectionLink}>
              Nueva meta
            </Text>
          </TouchableOpacity>
        </View>

        {mainGoal ? (
          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <View style={styles.goalIcon}>
                <Ionicons
                  name="flag-outline"
                  size={24}
                  color="#0A84FF"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={styles.cardTitle}
                >
                  Meta principal
                </Text>

                <Text
                  style={styles.cardText}
                >
                  {mainGoal.name}
                </Text>
              </View>

              <Text
                style={styles.goalPercent}
              >
                {goalPercentage.toFixed(0)}%
              </Text>
            </View>

            <View
              style={
                styles.progressBackground
              }
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${goalPercentage}%`,
                  },
                ]}
              />
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

            {mainGoal.target_date && (
              <Text style={styles.goalDate}>
                Fecha objetivo:{' '}
                {mainGoal.target_date}
              </Text>
            )}

            <TouchableOpacity
              style={
                styles.contributionButton
              }
              onPress={() =>
                setContributionModalVisible(
                  true
                )
              }
            >
              <Ionicons
                name="add-circle-outline"
                size={20}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.contributionButtonText
                }
              >
                Agregar ahorro
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.emptyGoalCard}
            onPress={() =>
              setGoalModalVisible(true)
            }
          >
            <Ionicons
              name="flag-outline"
              size={34}
              color="#0A84FF"
            />

            <Text style={styles.emptyGoalTitle}>
              Crea tu primera meta
            </Text>

            <Text style={styles.emptyGoalText}>
              Define cuánto quieres ahorrar y
              registra tu progreso.
            </Text>
          </TouchableOpacity>
        )}

        {/* ANÁLISIS */}

        <View style={styles.aiCard}>
          <View style={styles.aiIcon}>
            <Ionicons
              name="sparkles"
              size={21}
              color="#0A84FF"
            />
          </View>

          <View style={{ flex: 1 }}>
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
        onRequestClose={closeGoalModal}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardContainer}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : 'height'
          }
        >
          <TouchableWithoutFeedback
            onPress={Keyboard.dismiss}
            accessible={false}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <View
                  style={styles.modalHeader}
                >
                  <Text
                    style={styles.modalTitle}
                  >
                    Nueva meta
                  </Text>

                  <TouchableOpacity
                    onPress={closeGoalModal}
                  >
                    <Ionicons
                      name="close"
                      size={25}
                      color="#062B5F"
                    />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={
                    false
                  }
                  keyboardShouldPersistTaps="handled"
                >
                  <Text
                    style={styles.inputLabel}
                  >
                    Nombre
                  </Text>

                  <TextInput
                    value={goalName}
                    onChangeText={setGoalName}
                    placeholder="Ej. Laptop nueva"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                    returnKeyType="next"
                  />

                  <Text
                    style={styles.inputLabel}
                  >
                    Cantidad objetivo
                  </Text>

                  <TextInput
                    value={goalTarget}
                    onChangeText={setGoalTarget}
                    placeholder="10000"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    inputAccessoryViewID={
                      Platform.OS === 'ios'
                        ? AMOUNT_ACCESSORY_ID
                        : undefined
                    }
                    style={styles.input}
                  />

                  <Text
                    style={styles.inputLabel}
                  >
                    Fecha objetivo (opcional)
                  </Text>

                  <TextInput
                    value={goalDate}
                    onChangeText={setGoalDate}
                    placeholder="2026-12-20"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                    returnKeyType="done"
                    onSubmitEditing={
                      Keyboard.dismiss
                    }
                  />

                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      savingGoal &&
                        styles.disabledButton,
                    ]}
                    onPress={createGoal}
                    disabled={savingGoal}
                  >
                    {savingGoal ? (
                      <ActivityIndicator
                        color="#FFFFFF"
                      />
                    ) : (
                      <Text
                        style={
                          styles.saveButtonText
                        }
                      >
                        Crear meta
                      </Text>
                    )}
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
        }
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardContainer}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : 'height'
          }
        >
          <TouchableWithoutFeedback
            onPress={Keyboard.dismiss}
            accessible={false}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <View
                  style={styles.modalHeader}
                >
                  <Text
                    style={styles.modalTitle}
                  >
                    Agregar ahorro
                  </Text>

                  <TouchableOpacity
                    onPress={
                      closeContributionModal
                    }
                  >
                    <Ionicons
                      name="close"
                      size={25}
                      color="#062B5F"
                    />
                  </TouchableOpacity>
                </View>

                {mainGoal && (
                  <Text
                    style={
                      styles.modalDescription
                    }
                  >
                    Meta: {mainGoal.name}
                  </Text>
                )}

                <Text
                  style={styles.inputLabel}
                >
                  Cantidad
                </Text>

                <TextInput
                  value={contributionAmount}
                  onChangeText={
                    setContributionAmount
                  }
                  placeholder="500"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  inputAccessoryViewID={
                    Platform.OS === 'ios'
                      ? AMOUNT_ACCESSORY_ID
                      : undefined
                  }
                  style={styles.input}
                />

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    savingContribution &&
                      styles.disabledButton,
                  ]}
                  onPress={addContribution}
                  disabled={
                    savingContribution
                  }
                >
                  {savingContribution ? (
                    <ActivityIndicator
                      color="#FFFFFF"
                    />
                  ) : (
                    <Text
                      style={
                        styles.saveButtonText
                      }
                    >
                      Registrar ahorro
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================================================= */}
      {/* BOTÓN LISTO SOBRE TECLADO iOS */}
      {/* ================================================= */}

      {Platform.OS === 'ios' && (
        <InputAccessoryView
          nativeID={
            AMOUNT_ACCESSORY_ID
          }
        >
          <View
            style={
              styles.keyboardAccessory
            }
          >
            <TouchableOpacity
              onPress={Keyboard.dismiss}
              style={
                styles.keyboardDoneButton
              }
            >
              <Text
                style={
                  styles.keyboardDoneText
                }
              >
                Listo
              </Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
    </SafeAreaView>
  );
}


// =====================================================
// FILTRO
// =====================================================

function FilterButton({
  label,
  active,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={
        active
          ? styles.filterActive
          : styles.filterButton
      }
      onPress={onPress}
    >
      <Text
        style={
          active
            ? styles.filterActiveText
            : styles.filterText
        }
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}


// =====================================================
// GRÁFICA
// =====================================================

function DoubleBar({
  incomeHeight,
  expenseHeight,
  label,
}) {
  return (
    <View style={styles.barContainer}>
      <View style={styles.doubleBar}>
        <View
          style={[
            styles.bar,
            styles.incomeBar,
            {
              height: incomeHeight,
            },
          ]}
        />

        <View
          style={[
            styles.bar,
            styles.expenseBar,
            {
              height: expenseHeight,
            },
          ]}
        />
      </View>

      <Text style={styles.barLabel}>
        {label}
      </Text>
    </View>
  );
}


// =====================================================
// CATEGORÍA
// =====================================================

function CategoryBar({
  icon,
  title,
  amount,
  percent,
  width,
}) {
  return (
    <View style={styles.categoryCard}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryLeft}>
          <View style={styles.categoryIcon}>
            <Ionicons
              name={icon}
              size={21}
              color="#0A84FF"
            />
          </View>

          <View>
            <Text
              style={styles.categoryTitle}
            >
              {title}
            </Text>

            <Text
              style={styles.categoryAmount}
            >
              {amount}
            </Text>
          </View>
        </View>

        <Text
          style={styles.categoryPercent}
        >
          {percent}
        </Text>
      </View>

      <View
        style={styles.categoryProgress}
      >
        <View
          style={[
            styles.categoryProgressFill,
            { width },
          ]}
        />
      </View>
    </View>
  );
}


// =====================================================
// ESTILOS
// =====================================================

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
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 22,
  },

  summaryRow: {
    flexDirection: 'row',
    backgroundColor:
      'rgba(255,255,255,0.14)',
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
    backgroundColor:
      'rgba(255,255,255,0.25)',
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

  goalSectionHeader: {
    marginTop: 10,
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

  legendRow: {
    flexDirection: 'row',
    gap: 18,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 10,
    marginRight: 6,
  },

  incomeDot: {
    backgroundColor: '#062B5F',
  },

  expenseDot: {
    backgroundColor: '#AFCDEC',
  },

  legendText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '700',
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

  doubleBar: {
    height: 120,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },

  bar: {
    width: 13,
    borderRadius: 6,
  },

  incomeBar: {
    backgroundColor: '#062B5F',
  },

  expenseBar: {
    backgroundColor: '#AFCDEC',
  },

  barLabel: {
    marginTop: 8,
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '700',
    textTransform: 'capitalize',
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

  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
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
    height: '100%',
    backgroundColor: '#062B5F',
    borderRadius: 20,
  },

  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  goalText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
  },

  goalDate: {
    marginTop: 10,
    fontSize: 12,
    color: '#6B7280',
  },

  contributionButton: {
    marginTop: 18,
    backgroundColor: '#062B5F',
    borderRadius: 15,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },

  contributionButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },

  emptyGoalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    marginBottom: 18,
    alignItems: 'center',
    elevation: 2,
  },

  emptyGoalTitle: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: '900',
    color: '#062B5F',
  },

  emptyGoalText: {
    marginTop: 5,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    marginBottom: 18,
    elevation: 2,
  },

  emptyTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '900',
    color: '#062B5F',
  },

  emptyText: {
    marginTop: 5,
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
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

  // =====================================================
  // MODALES
  // =====================================================

  modalKeyboardContainer: {
    flex: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor:
      'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },

  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#062B5F',
  },

  modalDescription: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 18,
  },

  inputLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#6B7280',
    fontWeight: '900',
    marginBottom: 7,
  },

  input: {
    backgroundColor: '#F4F7FB',
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#062B5F',
    fontSize: 16,
    marginBottom: 18,
  },

  saveButton: {
    backgroundColor: '#062B5F',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },

  disabledButton: {
    opacity: 0.65,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  // =====================================================
  // BARRA SOBRE TECLADO iOS
  // =====================================================

  keyboardAccessory: {
    backgroundColor: '#F4F7FB',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D1D5DB',
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignItems: 'flex-end',
  },

  keyboardDoneButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  keyboardDoneText: {
    color: '#0A84FF',
    fontSize: 16,
    fontWeight: '900',
  },
});