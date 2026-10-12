import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { balanceForecast } from '../utils/recurringMovements';
import { movementColors } from './MovementFields';

const money = (amount) => `${amount < 0 ? '−' : ''}$${Math.abs(amount).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fullDate = (value) => new Date(`${value}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
const shortDate = (value) => new Date(`${value}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

export default function BalanceForecast({ rules, transactions, today, cards = [] }) {
  const [expanded, setExpanded] = useState(false);
  const [includeOverdue, setIncludeOverdue] = useState(false);
  const forecast = useMemo(() => balanceForecast(rules, transactions, today, includeOverdue, cards), [rules, transactions, today, includeOverdue, cards]);
  return <View style={styles.card}>
    <View style={styles.heading}><View style={styles.icon}><Ionicons name="calendar-outline" size={22} color={colors.primary} /></View>
      <Text style={styles.title}>Saldo estimado al cierre del próximo mes</Text>
    </View>
    <Text style={styles.period}>Al {fullDate(forecast.end)}</Text>
    <Text style={[styles.estimate, forecast.estimatedBalance < 0 && { color: movementColors.Gasto.foreground }]}>{money(forecast.estimatedBalance)} <Text style={styles.currency}>MXN</Text></Text>
    <View style={styles.breakdown}>
      <View style={styles.row}><Text style={styles.rowLabel}>Saldo actual</Text><Text style={styles.value}>{money(forecast.currentBalance)}</Text></View>
      <View style={styles.row}><Text style={styles.rowLabel}>Ingresos programados</Text><Text style={[styles.value, { color: movementColors.Ingreso.foreground }]}>+{money(forecast.income)}</Text></View>
      <View style={styles.row}><Text style={styles.rowLabel}>Pagos desde mi saldo y tarjetas</Text><Text style={[styles.value, { color: movementColors.Gasto.foreground }]}>−{money(forecast.expenses)}</Text></View>
    </View>
    <Text style={styles.caption}>Desde {fullDate(forecast.start)} hasta {fullDate(forecast.end)}. Incluye los pagos desde tu saldo y la deuda registrada de tarjetas con fecha límite en este periodo.</Text>
    {forecast.overdueCount > 0 && <View style={styles.overdue}>
      <Text style={styles.caption}>Hay {forecast.overdueCount} movimiento{forecast.overdueCount === 1 ? '' : 's'} anterior{forecast.overdueCount === 1 ? '' : 'es'} sin confirmar: ingresos +{money(forecast.overdueIncome)} y pagos −{money(forecast.overdueExpenses)}.</Text>
      <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: includeOverdue }} onPress={() => setIncludeOverdue(!includeOverdue)} style={styles.toggle}>
        <Ionicons name={includeOverdue ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} />
        <Text style={styles.link}>Incluir pendientes anteriores</Text>
      </TouchableOpacity>
      <Text style={styles.caption}>{includeOverdue ? 'Los pendientes anteriores también forman parte de esta estimación.' : 'No están incluidos en la estimación.'}</Text>
    </View>}
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded }} style={styles.toggle} onPress={() => setExpanded(!expanded)}>
      <Text style={[styles.link, { flex: 1 }]}>{expanded ? 'Ocultar desglose' : `Ver pagos y cobros incluidos (${forecast.occurrences.length})`}</Text>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
    </TouchableOpacity>
    {expanded && <View style={styles.details}>
      {!forecast.occurrences.length && <Text style={styles.caption}>No tienes pagos o ingresos activos programados para este periodo.</Text>}
      {forecast.occurrences.slice(0, 40).map((entry) => <View key={`${entry.ruleId}:${entry.date}`} style={styles.detailRow}>
        <View style={{ flex: 1 }}><Text style={styles.entryName}>{entry.name}</Text><Text style={styles.caption}>{shortDate(entry.date)}{entry.overdue ? ' · Pendiente anterior' : ''}</Text></View>
        <Text style={[styles.value, { color: entry.type === 'income' ? movementColors.Ingreso.foreground : movementColors.Gasto.foreground }]}>{entry.type === 'income' ? '+' : '−'}{money(entry.amount)}</Text>
      </View>)}
      {forecast.occurrences.length > 40 && <Text style={styles.caption}>Se muestran las primeras 40 fechas. El total incluye las {forecast.occurrences.length} repeticiones.</Text>}
    </View>}
    {forecast.cardCharges > 0 && <Text style={[styles.caption, { marginBottom: 10 }]}>Cargos futuros a tarjetas: {money(forecast.cardCharges)}. No se descuentan de tu saldo todavía; actualiza la próxima fecha de pago según tu estado de cuenta.</Text>}
    <Text style={styles.disclaimer}>Estimación basada en tus movimientos programados y deudas registradas. No incluye otros gastos o ingresos. Tu saldo real cambia al confirmar cada movimiento.</Text>
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderColor: '#C9DCF8', borderWidth: 1, padding: 18, borderRadius: 20, marginBottom: 18 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  icon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.softBlue, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: colors.ink, fontSize: 17, fontWeight: '600', lineHeight: 23 },
  period: { color: colors.muted, fontSize: 13, marginBottom: 8 },
  estimate: { color: colors.ink, fontSize: 30, fontWeight: '700', marginBottom: 16 },
  currency: { fontSize: 13, fontWeight: '500', color: colors.muted },
  breakdown: { backgroundColor: colors.background, padding: 12, borderRadius: 14, marginBottom: 12, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  rowLabel: { flex: 1, fontSize: 13, color: colors.muted },
  value: { fontSize: 14, color: colors.ink, fontWeight: '600' },
  caption: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  overdue: { backgroundColor: '#FFF7E6', borderRadius: 12, padding: 12, marginTop: 12 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingVertical: 10 },
  link: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  details: { marginBottom: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 10 },
  entryName: { color: colors.ink, fontSize: 13, fontWeight: '500' },
  disclaimer: { color: colors.muted, fontSize: 12, lineHeight: 18, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
});
