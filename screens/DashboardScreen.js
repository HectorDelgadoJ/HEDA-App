import { cashBalance, isSpending, cardDebt } from '../utils/finance';
import { transactionRows, accountRows } from '../services/finance';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { supabase } from '../services/supabase';

export default function DashboardScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [cards, setCards] = useState([]);
  const [cardError, setCardError] = useState(false);
  const [mainGoal, setMainGoal] = useState(null);
  const [loading, setLoading] = useState(true);

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

      // Cargamos movimientos y meta al mismo tiempo
      const [transactionsResult, goalResult, cardResult] =
        await Promise.all([
          transactionRows(user.id),

          supabase
            .from('goals')
            .select(
              'id, name, target_amount, current_amount, target_date, status, created_at'
            )
            .eq('user_id', user.id)
            .eq('status', 'active')
            .order('created_at', {
              ascending: true,
            })
            .limit(1)
            .maybeSingle(),
          accountRows('card_payments', '*', user.id),
        ]);

      setCards(cardResult.data || []);
      setCardError(!!cardResult.error && !['PGRST205', '42P01'].includes(cardResult.error.code));
      // MOVIMIENTOS
      if (transactionsResult.error) {
        console.log(
          'Error cargando movimientos:',
          transactionsResult.error.message
        );
      } else {
        setTransactions(
          transactionsResult.data || []
        );
      }

      // META PRINCIPAL
      if (goalResult.error) {
        console.log(
          'Error cargando meta:',
          goalResult.error.message
        );

        setMainGoal(null);
      } else {
        setMainGoal(goalResult.data || null);
      }
    } catch (error) {
      console.log(
        'Error inesperado cargando Dashboard:',
        error
      );
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
      maximumFractionDigits: 2,
    });
  }

  // =====================================================
  // TOTALES GENERALES
  // =====================================================

  const totalIncome = useMemo(() => {
    return transactions
      .filter(
        (transaction) =>
          transaction.type === 'income'
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0
      );
  }, [transactions]);

  const totalExpenses = useMemo(() => {
    return transactions
      .filter(
        (transaction) =>
          isSpending(transaction)
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0
      );
  }, [transactions]);

  const balance = cashBalance(transactions);

  // =====================================================
  // GASTOS POR CATEGORÍA
  // =====================================================

  const categoryData = useMemo(() => {
    const categories = {};

    transactions
      .filter(
        (transaction) =>
          isSpending(transaction)
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

    return Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [transactions]);

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
          transactionMonth,
        ] = transaction.transaction_date
          .split('-')
          .map(Number);

        if (
          transactionYear === year &&
          transactionMonth - 1 === month
        ) {
          if (transaction.type === 'income') {
            income += Number(transaction.amount);
          }

          if (isSpending(transaction)) {
            expenses += Number(transaction.amount);
          }
        }
      });

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
      (current / target) * 100,
      100
    );
  }, [mainGoal]);

  // =====================================================
  // RESUMEN AUTOMÁTICO
  // =====================================================

  function getFinancialSummary() {
    if (transactions.length === 0) {
      return 'Registra tus primeros movimientos para comenzar a generar tu resumen financiero.';
    }

    if (
      totalIncome > 0 &&
      totalExpenses === 0
    ) {
      return `Has registrado $${formatCurrency(
        totalIncome
      )} en ingresos y todavía no tienes gastos registrados.`;
    }

    if (
      totalExpenses > totalIncome &&
      totalIncome > 0
    ) {
      return 'Tus gastos registrados actualmente son mayores que tus ingresos. Revisa tus categorías de gasto para identificar oportunidades de ahorro.';
    }

    if (categoryData.length > 0) {
      const [
        biggestCategory,
        biggestAmount,
      ] = categoryData[0];

      const percentage =
        totalExpenses > 0
          ? (biggestAmount / totalExpenses) * 100
          : 0;

      return `Tu mayor categoría de gasto es ${biggestCategory}, con aproximadamente ${percentage.toFixed(
        0
      )}% de tus egresos registrados.`;
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
        'game-controller-outline',
    };

    return icons[category] || 'wallet-outline';
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
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>
              HEDA
            </Text>

            <Text style={styles.subtitle}>
              Gestión financiera inteligente
            </Text>
          </View>

          <TouchableOpacity
            style={styles.notificationButton}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={colors.ink}
            />
          </TouchableOpacity>
        </View>

        {/* BALANCE */}

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>
            Saldo disponible
          </Text>

          {loading ? (
            <ActivityIndicator
              color="#FFFFFF"
              size="large"
              style={styles.loadingBalance}
            />
          ) : (
            <Text style={styles.balanceAmount}>
              ${formatCurrency(balance)}
            </Text>
          )}

          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.smallLabel}>
                Ingresos
              </Text>

              <Text style={styles.income}>
                +${formatCurrency(totalIncome)}
              </Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.balanceItem}>
              <Text style={styles.smallLabel}>
                Gastos
              </Text>

              <Text style={styles.expense}>
                -${formatCurrency(totalExpenses)}
              </Text>
            </View>
          </View>
        </View>

        {!loading && (cards.some(card => card.ledger_enabled) || cardError) && <View style={{ padding: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF', marginBottom: 18 }}>
          <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '600', marginBottom: 10 }}>Mis tarjetas</Text>
          {cardError ? <Text style={{ color: colors.muted }}>No pudimos cargar tus tarjetas. Abre Movimientos para actualizar.</Text> : cards.filter(card => card.ledger_enabled).sort((a, b) => a.due_date.localeCompare(b.due_date)).map(card => <View key={card.id} style={{ marginBottom: 10, padding: 12, borderWidth: 1, borderColor: '#EFAEB5', borderRadius: 12 }}>
            <Text style={{ color: colors.ink, fontWeight: '600' }}>{card.name} · {cardDebt(card, transactions) < 0 ? 'A favor' : 'Debes'} ${formatCurrency(Math.abs(cardDebt(card, transactions)))}</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 5 }}>Fecha límite: {new Date(`${card.due_date}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}</Text>
          </View>)}
          <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('Movimientos', { openSection: 'Recurrentes' })} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.primary, fontWeight: '600' }}>Ver tarjetas y pagos</Text></TouchableOpacity>
        </View>}
        {/* ACCESOS RÁPIDOS */}

        <View style={styles.quickRow}>
          <QuickAction
            icon="add-circle-outline"
            label="Agregar"
            onPress={() =>
              navigation.navigate('Movimientos')
            }
          />

          <QuickAction
            icon="wallet-outline"
            label="Gastos"
            onPress={() =>
              navigation.navigate('Movimientos')
            }
          />

          <QuickAction
            icon="qr-code-outline"
            label="QR"
            onPress={() =>
              navigation.navigate('QR')
            }
          />

          <QuickAction
            icon="sparkles-outline"
            label="IA"
            onPress={() =>
              navigation.navigate('IA')
            }
          />
        </View>

        {/* RESUMEN */}

        <View style={styles.aiCard}>
          <View style={styles.aiIcon}>
            <Ionicons
              name="sparkles"
              size={20}
              color={colors.primary}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>
              Resumen inteligente
            </Text>

            <Text style={styles.cardText}>
              {getFinancialSummary()}
            </Text>
          </View>
        </View>

        {/* TARJETAS */}

        <View style={styles.twoCards}>
          {/* ETHEREUM */}

          <TouchableOpacity
            style={styles.smallCard}
            onPress={() =>
              navigation.navigate('Ethereum')
            }
          >
            <Ionicons
              name="logo-bitcoin"
              size={22}
              color={colors.primary}
            />

            <Text style={styles.smallCardTitle}>
              Ethereum
            </Text>

            <Text style={styles.smallCardAmount}>
              Información
            </Text>

            <Text style={styles.cryptoText}>
              Consultar módulo
            </Text>
          </TouchableOpacity>

          {/* META PRINCIPAL */}

          <TouchableOpacity
            style={styles.smallCard}
            onPress={() =>
              navigation.navigate('Reportes')
            }
          >
            <Ionicons
              name="flag-outline"
              size={22}
              color={colors.primary}
            />

            <Text style={styles.smallCardTitle}>
              Meta principal
            </Text>

            {mainGoal ? (
              <>
                <Text
                  style={styles.smallCardAmount}
                  numberOfLines={1}
                >
                  {mainGoal.name}
                </Text>

                <Text
                  style={
                    styles.goalDashboardAmount
                  }
                  numberOfLines={1}
                >
                  $
                  {formatCurrency(
                    mainGoal.current_amount
                  )}
                  {' / '}$
                  {formatCurrency(
                    mainGoal.target_amount
                  )}
                </Text>

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

                <Text
                  style={
                    styles.goalDashboardPercent
                  }
                >
                  {goalPercentage.toFixed(0)}%
                  completado
                </Text>
              </>
            ) : (
              <>
                <Text
                  style={styles.smallCardAmount}
                >
                  Sin meta activa
                </Text>

                <Text
                  style={
                    styles.goalDashboardAmount
                  }
                >
                  Crea una desde Reportes
                </Text>

                <View
                  style={
                    styles.progressBackground
                  }
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: '0%',
                      },
                    ]}
                  />
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* FLUJO MENSUAL */}

        <View style={styles.chartCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Flujo mensual
            </Text>

            <Text style={styles.sectionLink}>
              Últimos 6 meses
            </Text>
          </View>

          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  styles.incomeLegend,
                ]}
              />

              <Text style={styles.legendText}>
                Ingresos
              </Text>
            </View>

            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  styles.expenseLegend,
                ]}
              />

              <Text style={styles.legendText}>
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
                          6,
                          (month.income /
                            maxMonthlyAmount) *
                            105
                        )
                      : 3
                  }
                  expenseHeight={
                    month.expenses > 0
                      ? Math.max(
                          6,
                          (month.expenses /
                            maxMonthlyAmount) *
                            105
                        )
                      : 3
                  }
                />
              )
            )}
          </View>
        </View>

        {/* CATEGORÍAS */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Categorías de gasto
          </Text>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate('Reportes')
            }
          >
            <Text style={styles.sectionLink}>
              Ver todo
            </Text>
          </TouchableOpacity>
        </View>

        {categoryData.length === 0 ? (
          <View style={styles.emptyCategoryCard}>
            <Ionicons
              name="pie-chart-outline"
              size={30}
              color="#9CA3AF"
            />

            <Text style={styles.emptyTitle}>
              Sin gastos registrados
            </Text>

            <Text style={styles.emptyText}>
              Tus principales categorías
              aparecerán aquí.
            </Text>
          </View>
        ) : (
          <View style={styles.categoryRow}>
            {categoryData.map(
              ([category, amount]) => (
                <Category
                  key={category}
                  icon={getCategoryIcon(
                    category
                  )}
                  title={category}
                  amount={`$${formatCurrency(
                    amount
                  )}`}
                />
              )
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}


// =====================================================
// ACCESO RÁPIDO
// =====================================================

function QuickAction({
  icon,
  label,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={styles.quickAction}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={24}
        color={colors.primary}
      />

      <Text style={styles.quickLabel}>
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

function Category({
  icon,
  title,
  amount,
}) {
  return (
    <View style={styles.categoryCard}>
      <View style={styles.categoryIcon}>
        <Ionicons
          name={icon}
          size={22}
          color={colors.primary}
        />
      </View>

      <Text
        style={styles.categoryTitle}
        numberOfLines={1}
      >
        {title}
      </Text>

      <Text
        style={styles.categoryAmount}
        numberOfLines={1}
      >
        {amount}
      </Text>
    </View>
  );
}


// =====================================================
// ESTILOS
// =====================================================

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
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  logo: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.ink,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.muted,
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
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },

  balanceLabel: {
    fontSize: 15,
    color: '#DCEEFF',
    marginBottom: 8,
  },

  balanceAmount: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 18,
  },

  loadingBalance: {
    alignSelf: 'flex-start',
    marginVertical: 12,
    marginBottom: 18,
  },

  balanceRow: {
    flexDirection: 'row',
    backgroundColor:
      'rgba(255,255,255,0.14)',
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
    fontWeight: '600',
  },

  expense: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },

  separator: {
    width: 1,
    backgroundColor:
      'rgba(255,255,255,0.25)',
    marginHorizontal: 12,
  },

  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
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
    color: colors.ink,
  },

  aiCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    elevation: 2,
  },

  aiIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
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
    marginBottom: 18,
  },

  smallCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    elevation: 2,
    minHeight: 175,
  },

  smallCardTitle: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 13,
  },

  smallCardAmount: {
    marginTop: 4,
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
  },

  cryptoText: {
    marginTop: 6,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },

  goalDashboardAmount: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },

  goalDashboardPercent: {
    marginTop: 6,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },

  progressBackground: {
    height: 7,
    backgroundColor: '#DDEBFA',
    borderRadius: 18,
    marginTop: 14,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.ink,
    borderRadius: 18,
  },

  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    elevation: 2,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },

  sectionLink: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },

  chartLegend: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 5,
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

  incomeLegend: {
    backgroundColor: colors.ink,
  },

  expenseLegend: {
    backgroundColor: '#AFCDEC',
  },

  legendText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '700',
  },

  chart: {
    height: 170,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 15,
  },

  barContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  doubleBar: {
    height: 115,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },

  bar: {
    width: 13,
    borderRadius: 6,
  },

  incomeBar: {
    backgroundColor: colors.ink,
  },

  expenseBar: {
    backgroundColor: '#AFCDEC',
  },

  barLabel: {
    marginTop: 8,
    fontSize: 11,
    color: colors.muted,
    fontWeight: '700',
    textTransform: 'capitalize',
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
    minWidth: 0,
  },

  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  categoryTitle: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 4,
  },

  categoryAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },

  emptyCategoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    elevation: 2,
  },

  emptyTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },

  emptyText: {
    marginTop: 5,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
  },
});