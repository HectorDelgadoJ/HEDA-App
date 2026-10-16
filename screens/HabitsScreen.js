import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import SwipeBackToIA from '../components/SwipeBackToIA';
import { supabase } from '../services/supabase';
import { accountRows } from '../services/finance';
import { habitsData } from '../utils/habits';
import { colors } from '../theme/colors';

const money = value => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
const shortDate = key => new Date(`${key}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
const range = (start, end) => `${shortDate(start)} – ${shortDate(end)}`;
const accents = ['#2474EA', '#8B5CF6', '#F59E0B', '#14B8A6', '#EC4899'];

export default function HabitsScreen({ navigation }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(5);
  const sequence = useRef(0);
  const owner = useRef(null);
  const focused = useRef(false);

  const load = useCallback(async (refresh = false) => {
    const request = ++sequence.current;
    if (refresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (request !== sequence.current || !focused.current) return;
      if (authError || !user) throw new Error('Vuelve a iniciar sesión para consultar tus hábitos.');
      if (owner.current !== user.id) { owner.current = user.id; setRows([]); }
      const result = await accountRows('transactions', 'id,type,amount,category,transaction_date,is_card_payment,card_id', user.id);
      if (result.error) throw new Error('No pudimos cargar tus movimientos. Reintenta con conexión a internet.');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (request !== sequence.current || !focused.current) return;
      if (sessionError || sessionData.session?.user?.id !== user.id) throw new Error('Tu sesión cambió. Vuelve a abrir Hábitos.');
      setRows(result.data || []);
    } catch (failure) {
      if (request === sequence.current && focused.current) { setRows([]); setError(failure.message || 'No pudimos cargar tus hábitos.'); }
    } finally {
      if (request === sequence.current && focused.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useFocusEffect(useCallback(() => {
    focused.current = true; void load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextOwner = session?.user?.id || null;
      if (owner.current && owner.current !== nextOwner) {
        sequence.current++; owner.current = null; setRows([]); setLoading(false); setRefreshing(false);
        setError('Tu sesión cambió. Vuelve a abrir Hábitos.');
      }
    });
    return () => { focused.current = false; sequence.current++; subscription.unsubscribe(); };
  }, [load]));

  const data = habitsData(rows);
  const top = data.categories[0];
  const comparison = data.comparison;
  const week = data.weeks[selectedWeek];
  const maxWeek = Math.max(...data.weeks.map(item => item.amount), 1);
  const monthLabel = new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  const go = route => navigation.navigate(route);
  const showData = !loading && !error;

  return <SwipeBackToIA navigation={navigation}><SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}>
      <ScreenHeader title="Hábitos" subtitle="Descubre patrones en lo que registras." actionIcon="arrow-back" actionLabel="Volver a IA" onAction={() => go('IA')} />
      <Text style={styles.gestureHint}>← Desliza hacia la izquierda para volver a IA</Text>
      {loading ? <View style={styles.state}><ActivityIndicator color={colors.primary} /><Text style={styles.body}>Revisando tus movimientos…</Text></View> : error ? <View style={styles.card}><Ionicons name="cloud-offline-outline" size={30} color={colors.primary} /><Text style={styles.title}>No pudimos preparar el análisis</Text><Text style={styles.body}>{error}</Text><Action label="Reintentar" icon="refresh-outline" onPress={() => load()} /></View> : null}
      {showData ? <>
        <View style={styles.hero}>
          <View style={styles.row}><Text style={styles.heroEyebrow}>TUS REGISTROS · {monthLabel.toUpperCase()}</Text><Ionicons name="analytics-outline" size={24} color="#FFFFFF" /></View>
          <Text style={styles.heroTitle}>{data.transactionCount ? 'Cada registro cuenta' : 'Tu primer paso empieza aquí'}</Text>
          <Text style={styles.heroText}>{data.transactionCount ? `Registraste movimientos en ${data.activeDays} de los ${data.elapsedDays} días transcurridos del mes.` : 'Agrega tus ingresos y gastos para descubrir cómo se mueve tu dinero. No hace falta registrar algo todos los días.'}</Text>
          <View style={styles.track}><View style={[styles.fill, { width: `${data.recordingPercent}%` }]} /></View>
          <Text style={styles.heroFoot}>Constancia de registro · No es una calificación financiera</Text>
          {!data.transactionCount ? <Action light label="Registrar un movimiento" icon="add-circle-outline" onPress={() => go('Movimientos')} /> : null}
        </View>
        <View style={styles.tiles}>
          <Metric label="Días con registros este mes" value={String(data.activeDays)} icon="calendar-outline" />
          <Metric label="Días seguidos con movimientos" value={String(data.streak)} icon="flame-outline" />
        </View>
        <Text style={styles.small}>La racha cuenta fechas de movimientos consecutivas hasta hoy o ayer; puedes registrar operaciones de otros días.</Text>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>Tu mes hasta hoy</Text><Text style={styles.body}>{range(data.monthStart, data.today)}</Text>
          <View style={styles.totals}><View style={styles.flex}><Text style={styles.small}>Ingresos registrados</Text><Text style={[styles.amount, styles.green]}>{money(data.income)}</Text></View><View style={styles.flex}><Text style={styles.small}>Gastos registrados</Text><Text style={[styles.amount, styles.red]}>{money(data.expenses)}</Text></View></View>
          <View style={styles.result}><Text style={styles.body}>Diferencia del mes</Text><Text style={[styles.amount, data.result < 0 ? styles.red : styles.green]}>{money(data.result)}</Text></View>
          <Text style={styles.small}>Es la diferencia entre ingresos y gastos registrados; no es tu saldo disponible ni ahorro confirmado.</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.heading}><Ionicons name="pie-chart-outline" size={24} color={colors.primary} /><Text accessibilityRole="header" style={[styles.title, styles.flex]}>¿Dónde se concentra tu gasto?</Text></View>
          {top ? <><Text style={styles.highlight}>{top.name}</Text><Text style={styles.body}>{top.percent}% de tus gastos del mes · {money(top.amount)}</Text><Text style={styles.small}>Es tu categoría de mayor gasto registrado. Eso no significa que sea un gasto excesivo.</Text>
            {data.categories.slice(0, 5).map((category, index) => <View key={category.name} style={styles.category}><View style={styles.row}><Text style={[styles.categoryName, styles.flex]}>{category.name}</Text><Text style={styles.categoryValue}>{money(category.amount)}</Text></View><View style={styles.categoryTrack}><View style={{ height: '100%', borderRadius: 5, width: `${category.percent}%`, backgroundColor: accents[index] }} /></View></View>)}
            {data.categories.length > 5 ? <Text style={styles.small}>Aquí ves las cinco categorías principales. Consulta el detalle completo en Reportes.</Text> : null}
            <Action secondary label="Ver gastos en Reportes" icon="bar-chart-outline" onPress={() => go('Reportes')} />
          </> : <><Text style={styles.body}>Aún no hay gastos registrados este mes para identificar una categoría principal.</Text><Action secondary label="Registrar un gasto" icon="add-outline" onPress={() => go('Movimientos')} /></>}
        </View>
        <View style={styles.card}>
          <View style={styles.heading}><Ionicons name="swap-vertical-outline" size={24} color={colors.primary} /><Text accessibilityRole="header" style={[styles.title, styles.flex]}>Comparación con el mes anterior</Text></View>
          <Text style={styles.body}>Comparamos del día 1 al {comparison.days} de ambos meses.</Text>
          <View style={styles.compare}><Text style={styles.small}>{range(comparison.previousStart, comparison.previousEnd)}</Text><Text style={styles.amount}>{money(comparison.previousExpenses)}</Text></View>
          <View style={styles.compare}><Text style={styles.small}>{range(comparison.currentStart, comparison.currentEnd)}</Text><Text style={styles.amount}>{money(comparison.currentExpenses)}</Text></View>
          <View style={styles.insight}><Text style={styles.insightTitle}>{comparison.changePercent === null ? 'Todavía falta una base de comparación' : comparison.difference === 0 ? 'El mismo gasto registrado' : `${Math.abs(comparison.changePercent) === 0 ? 'Menos de 1%' : `${Math.abs(comparison.changePercent)}%`} ${comparison.difference > 0 ? 'más' : 'menos'} gasto registrado`}</Text><Text style={styles.body}>{comparison.changePercent === null ? 'No hay gastos registrados en el periodo comparable del mes anterior. No podemos calcular un cambio porcentual.' : `Diferencia: ${money(Math.abs(comparison.difference))}. Si faltan registros en alguno de los periodos, la comparación puede estar incompleta.`}</Text></View>
        </View>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>Tu gasto, semana a semana</Text><Text style={styles.body}>Últimas seis semanas · Toca una barra</Text>
          <View style={styles.chart}>{data.weeks.map((item, index) => <TouchableOpacity key={item.start} accessibilityRole="button" accessibilityLabel={`${range(item.start, item.end)}: ${money(item.amount)}${item.partial ? ', semana en curso' : ''}`} accessibilityState={{ selected: selectedWeek === index }} onPress={() => setSelectedWeek(index)} style={styles.barSlot}><View style={[styles.bar, { height: item.amount ? Math.max(6, item.amount / maxWeek * 110) : 3, backgroundColor: selectedWeek === index ? colors.primary : '#C9DAF7' }]} /><Text style={styles.barLabel}>{shortDate(item.start)}</Text></TouchableOpacity>)}</View>
          <View accessibilityLiveRegion="polite" style={styles.insight}><Text style={styles.insightTitle}>{money(week.amount)}</Text><Text style={styles.body}>{range(week.start, week.end)}{week.partial ? ' · Semana en curso' : ''}</Text></View>
          <Text style={styles.small}>Incluye compras con tarjeta y excluye pagos de tarjetas. La semana actual solo considera los días transcurridos.</Text>
        </View>
        <View style={styles.card}><Text accessibilityRole="header" style={styles.title}>Un siguiente paso sencillo</Text><Text style={styles.body}>{top ? `Revisa los movimientos de ${top.name} y decide si reflejan lo que tenías planeado.` : 'Empieza registrando un ingreso o gasto real. Con más registros tendrás una imagen más completa.'}</Text><Action label="Revisar mis movimientos" icon="wallet-outline" onPress={() => go('Movimientos')} /><Action secondary label="Aprender a hacer un presupuesto" icon="school-outline" onPress={() => go('EducacionFinanciera')} /></View>
        <View style={styles.info}><Ionicons name="information-circle-outline" size={22} color={colors.primary} /><Text style={[styles.small, styles.flex]}>Análisis calculado con tus registros hasta hoy, sin enviar datos a la IA. Los días sin movimientos no significan que no hayas gastado. Desliza hacia abajo para actualizar.</Text></View>
      </> : null}
    </ScrollView>
  </SafeAreaView></SwipeBackToIA>;
}

function Metric({ label, value, icon }) {
  return <View style={[styles.card, styles.metric]}><Ionicons name={icon} size={23} color={colors.primary} /><Text style={styles.metricValue}>{value}</Text><Text style={styles.small}>{label}</Text></View>;
}
function Action({ label, icon, onPress, secondary, light }) {
  return <TouchableOpacity accessibilityRole="button" style={[styles.action, secondary && styles.secondary, light && styles.light]} onPress={onPress}><Ionicons name={icon} size={20} color={secondary || light ? colors.primary : '#FFFFFF'} /><Text style={[styles.actionText, (secondary || light) && styles.link]}>{label}</Text></TouchableOpacity>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18, paddingBottom: 30 },
  gestureHint: { color: colors.muted, fontSize: 11, marginBottom: 16, marginTop: -6 },
  state: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  small: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
  flex: { flex: 1, minWidth: 0 },
  hero: { backgroundColor: colors.primary, borderRadius: 22, padding: 20, marginBottom: 16 },
  heroEyebrow: { flex: 1, color: '#FFFFFF', fontSize: 10, fontWeight: '700', letterSpacing: 0.7 },
  heroTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  heroText: { color: '#FFFFFF', fontSize: 14, lineHeight: 21 },
  heroFoot: { color: '#FFFFFF', fontSize: 11, lineHeight: 17, marginTop: 8 },
  track: { height: 8, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, overflow: 'hidden', marginTop: 18 },
  fill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: 8 },
  tiles: { flexDirection: 'row', gap: 12 },
  metric: { flex: 1, marginBottom: 8 },
  metricValue: { color: colors.ink, fontSize: 28, fontWeight: '700', marginVertical: 8 },
  totals: { flexDirection: 'row', gap: 12, marginTop: 18, marginBottom: 14 },
  amount: { color: colors.ink, fontSize: 18, fontWeight: '700', marginTop: 4 },
  green: { color: '#15803D' }, red: { color: '#B91C1C' },
  result: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginBottom: 10, gap: 2 },
  heading: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  highlight: { color: colors.ink, fontSize: 22, fontWeight: '700', marginTop: 6, marginBottom: 4 },
  category: { marginTop: 16 }, categoryName: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  categoryValue: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  categoryTrack: { height: 6, borderRadius: 5, backgroundColor: colors.background, marginTop: 8, overflow: 'hidden' },
  compare: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  insight: { borderRadius: 14, padding: 14, backgroundColor: colors.softBlue, marginTop: 14 },
  insightTitle: { color: colors.ink, fontSize: 15, fontWeight: '700', marginBottom: 5 },
  chart: { height: 165, flexDirection: 'row', alignItems: 'flex-end', gap: 5, marginTop: 12 },
  barSlot: { flex: 1, minHeight: 145, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 4 },
  bar: { width: '65%', borderRadius: 7 }, barLabel: { fontSize: 9, color: colors.muted, marginTop: 10, textAlign: 'center' },
  action: { minHeight: 48, padding: 13, borderRadius: 14, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary, marginTop: 14 },
  actionText: { flexShrink: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  secondary: { backgroundColor: colors.softBlue, borderWidth: 1, borderColor: colors.headerBorder },
  light: { backgroundColor: '#FFFFFF' }, link: { color: colors.primary },
  info: { flexDirection: 'row', gap: 10, backgroundColor: colors.softBlue, padding: 16, borderRadius: 16, marginTop: 4 },
});
