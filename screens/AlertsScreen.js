import {Alert} from '../services/alerts';
import ReminderSettings from '../components/ReminderSettings';
import { notifyFinanceChange } from '../services/financeEvents';
import { useThemeStyles, themeStyle, themeColor } from "../theme/ThemeProvider";
import InfoButton from '../components/InfoButton';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import SwipeBackToIA from '../components/SwipeBackToIA';
import { CategoryPicker } from '../components/MovementFields';
import { categoryOptions, validateMovement, localDate } from '../utils/movementForm';
import { financialAlerts, budgetProgress } from '../utils/alerts';
import { accountRows } from '../services/finance';
import { supabase } from '../services/supabase';
import { colors } from '../theme/colors';

const money = (value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
const emptyData = () => ({ rows: null, budgets: null, rules: null, cards: null, goals: null });
const palettes = { danger: ['#B91C1C', '#FEF2F2'], warning: ['#92400E', '#FFFBEB'], success: ['#15803D', '#F0FDF4'], info: [colors.primary, colors.softBlue] };

export default function AlertsScreen({ navigation, route }) {
  const { colors, styles } = useThemeStyles(makeStyles);
  const [tab, setTab] = useState('Alertas');
  useEffect(() => {if (route?.params?.openTab === 'Presupuestos') {setTab('Presupuestos');navigation.setParams({ openTab: undefined });}}, [route?.params?.openTab, navigation]);
  const [filter, setFilter] = useState('Todas');
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState([]);
  const [budgetMissing, setBudgetMissing] = useState(false);
  const [readIds, setReadIds] = useState([]);
  const [readReady, setReadReady] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [category, setCategory] = useState('Comida');
  const [limit, setLimit] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState(false);
  const owner = useRef(null),sequence = useRef(0),focused = useRef(false),mutating = useRef(false),readingBusy = useRef(false);

  const load = useCallback(async (refresh = false) => {
    const request = ++sequence.current;
    if (refresh) setRefreshing(true);else setLoading(true);
    setErrors([]);setBudgetMissing(false);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (request !== sequence.current || !focused.current) return;
      if (error || !user) throw new Error('Vuelve a iniciar sesión para consultar tus alertas.');
      if (owner.current !== user.id) {setData(emptyData());setReadIds([]);setReadReady(false);setModal(false);owner.current = user.id;}
      const tables = [
      ['rows', 'transactions', 'id,type,amount,category,transaction_date,is_card_payment,card_id'],
      ['budgets', 'budgets', 'id,category,monthly_limit'],
      ['rules', 'recurring_movements', 'id,name,type,amount,next_date,active'],
      ['cards', 'card_payments', 'id,name,amount,due_date,reminder,paid,ledger_enabled,opening_balance'],
      ['goals', 'goals', 'id,name,target_amount,current_amount,target_date,status']];

      const results = await Promise.allSettled(tables.map(([, table, columns]) => accountRows(table, columns, user.id)));
      const read = await AsyncStorage.getItem(`heda:alerts:read:v1:${user.id}`).then((raw) => {
        const parsed = raw ? JSON.parse(raw) : [];if (!Array.isArray(parsed)) throw new Error('Invalid read state');
        return parsed.filter((id) => typeof id === 'string').slice(-1000);
      }).catch(() => null);
      const { data: session } = await supabase.auth.getSession();
      if (request !== sequence.current || !focused.current) return;
      if (session.session?.user?.id !== user.id) throw new Error('Tu sesión cambió. Vuelve a abrir Alertas.');
      const next = emptyData(),problems = [];
      results.forEach((result, index) => {
        const [key] = tables[index];
        const resultError = result.status === 'rejected' ? result.reason : result.value.error;
        if (resultError) {
          if (key === 'budgets' && ['42P01', 'PGRST205'].includes(resultError.code)) setBudgetMissing(true);
          problems.push({ rows: 'No pudimos cargar movimientos: el avance de presupuestos y los avisos de tarjetas no están disponibles.', budgets: 'No pudimos cargar presupuestos. Si es la primera vez, ejecuta el SQL de presupuestos y actualiza.', rules: 'No pudimos cargar tus programaciones.', cards: 'No pudimos cargar tus tarjetas.', goals: 'No pudimos cargar tus metas.' }[key]);
        } else next[key] = result.value.data || [];
      });
      if (read === null) problems.push('No pudimos recuperar las alertas leídas en este dispositivo. Actualiza para reintentar.');
      setReadReady(read !== null);setReadIds(read || []);setData(next);setErrors(problems);
    } catch (error) {
      if (request === sequence.current && focused.current) {setData(emptyData());setErrors([error.message || 'No pudimos cargar las alertas.']);}
    } finally {
      if (request === sequence.current && focused.current) {setLoading(false);setRefreshing(false);}
    }
  }, []);

  useFocusEffect(useCallback(() => {
    focused.current = true;void load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (owner.current && owner.current !== (session?.user?.id || null)) {
        sequence.current++;owner.current = null;setData(emptyData());setReadIds([]);setReadReady(false);setModal(false);setLoading(false);setRefreshing(false);setErrors(['Tu sesión cambió. Vuelve a abrir Alertas.']);
      }
    });
    return () => {focused.current = false;sequence.current++;subscription.unsubscribe();};
  }, [load]));

  const alerts = financialAlerts(data);
  const budgets = data.rows && data.budgets ? budgetProgress(data.budgets, data.rows) : [];
  const unread = alerts.filter((item) => !readIds.includes(item.id)).length;
  const visible = alerts.filter((item) => filter === 'Todas' || (filter === 'Sin leer' ? !readIds.includes(item.id) : item.type === filter));
  const options = categoryOptions('Gasto');
  const names = [...new Set([...(data.rows || []).filter((row) => row.type === 'expense' && !row.is_card_payment).map((row) => row.category), ...(data.budgets || []).map((row) => row.category)])];
  names.forEach((name) => {if (name && !options.some(([label]) => label === name)) options.push([name, 'pricetag-outline']);});

  function openBudget(budget = null) {
    if (!data.budgets || loading || mutating.current) return;
    setEditing(budget);setCategory(budget?.category || 'Comida');setLimit(budget ? String(budget.monthly_limit) : '');setFormError('');setModal(true);
  }
  async function mutateBudget(budget, remove = false) {
    if (mutating.current) return;
    const parsed = validateMovement(limit, category);
    if (!remove && (Object.keys(parsed.errors).length || parsed.numericAmount >= 10000000000 || category.trim().length > 60)) {
      setFormError(parsed.errors.amount || parsed.errors.category || 'Usa una categoría de hasta 60 caracteres y un monto menor a 10 mil millones.');return;
    }
    if (!remove && (data.budgets || []).some((item) => item.id !== editing?.id && item.category.trim().toLocaleLowerCase('es-MX') === category.trim().toLocaleLowerCase('es-MX'))) {setFormError('Ya tienes un presupuesto para esta categoría. Edítalo desde la lista.');return;}
    mutating.current = true;setSaving(true);
    const request = sequence.current,expectedOwner = owner.current;
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user || user.id !== expectedOwner || sequence.current !== request) throw new Error('Tu sesión cambió. Actualiza antes de guardar.');
      let query;
      if (remove) query = supabase.from('budgets').delete().eq('id', budget.id).eq('user_id', user.id);else
      if (editing) query = supabase.from('budgets').update({ category: category.trim(), monthly_limit: parsed.numericAmount }).eq('id', editing.id).eq('user_id', user.id);else
      query = supabase.from('budgets').insert({ user_id: user.id, category: category.trim(), monthly_limit: parsed.numericAmount });
      const result = await query.select('id');
      if (result.error) throw new Error(result.error.code === '23505' ? 'Ya existe un presupuesto para esa categoría.' : 'No se guardó el cambio. Revisa la conexión y la configuración de presupuestos.');
      if (!result.data?.length) throw new Error('El presupuesto ya no está disponible. Actualiza la lista.');
      if (focused.current && owner.current === expectedOwner && sequence.current === request) {notifyFinanceChange();setModal(false);void load(true);}
    } catch (error) {
      if (focused.current && owner.current === expectedOwner) {
        if (remove) Alert.alert('No se eliminó el presupuesto', error.message);else setFormError(error.message);
      }
    } finally {mutating.current = false;setSaving(false);}
  }
  function deleteBudget(budget) {
    Alert.alert('Eliminar presupuesto', `Se quitará el límite mensual de ${budget.category}. Tus movimientos se conservan.`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => mutateBudget(budget, true) }]);
  }
  async function markRead(ids) {
    if (!readReady || readingBusy.current || !owner.current) return;
    readingBusy.current = true;setReading(true);
    const userId = owner.current,request = sequence.current,next = [...new Set([...readIds, ...ids])].slice(-1000);
    try {
      await AsyncStorage.setItem(`heda:alerts:read:v1:${userId}`, JSON.stringify(next));
      if (owner.current === userId && sequence.current === request) setReadIds(next);
    } catch {if (owner.current === userId) Alert.alert('No se guardó', 'No pudimos marcar la alerta como leída. Reintenta.');} finally
    {readingBusy.current = false;setReading(false);}
  }
  function openAlert(item) {
    if (item.route === 'budgets') setTab('Presupuestos');else
    if (item.route === 'goals') navigation.navigate('Reportes');else
    navigation.navigate('Movimientos', { openSection: 'Recurrentes' });
  }

  return <SwipeBackToIA navigation={navigation}><SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {if (!saving && !reading) void load(true);}} tintColor={themeColor(colors.primary, colors)} />}>
      <ScreenHeader title="Alertas y límites" subtitle="Ten presentes tus pagos y tu plan del mes." actionIcon="arrow-back" actionLabel="Volver a IA" onAction={() => navigation.navigate('IA')} />
      <View style={styles.tabs}>{['Alertas', 'Presupuestos'].map((name) => <TouchableOpacity key={name} accessibilityRole="tab" accessibilityState={{ selected: tab === name }} style={themeStyle([styles.tab, tab === name && styles.tabActive], colors)} onPress={() => setTab(name)}><Text style={themeStyle([styles.tabText, tab === name && styles.white], colors)}>{name}{name === 'Alertas' && unread ? ` (${unread})` : ''}</Text></TouchableOpacity>)}</View>
      <ReminderSettings />
      {errors.length ? <View style={styles.warning}>{errors.map((message) => <Text key={message} style={styles.body}>{message}</Text>)}<Action label="Actualizar" icon="refresh-outline" secondary onPress={() => load(true)} disabled={refreshing || saving || reading} /></View> : null}
      {loading ? <View style={styles.loading}><ActivityIndicator color={themeColor(colors.primary, colors)} /><Text style={styles.body}>Revisando tus registros…</Text></View> : tab === 'Presupuestos' ? <>
        <View style={styles.card}><Text style={styles.title}>Tu plan de gasto mensual</Text><InfoButton title={"Cómo se renueva el presupuesto"} text={"Define cuánto quieres gastar por categoría. El mismo límite se renueva cada mes; editarlo cambia el límite actual y de los meses siguientes."} /><Action label="Nuevo presupuesto" icon="add-circle-outline" onPress={() => openBudget()} disabled={!data.budgets || saving} /></View>
        {budgetMissing ? <View style={styles.warning}><Text style={styles.title}>Falta activar Presupuestos</Text><Text style={styles.body}>Ejecuta el archivo 202610150006_budgets.sql en SQL Editor de Supabase y toca Actualizar. No borra tus movimientos.</Text></View> : null}
        {data.budgets && !data.budgets.length ? <View style={styles.card}><Ionicons name="pie-chart-outline" size={34} color={themeColor(colors.primary, colors)} /><Text style={styles.title}>Empieza con una categoría</Text><Text style={styles.body}>Por ejemplo, elige Comida y define tu límite mensual. El gasto se calcula a partir de tus movimientos ya registrados.</Text></View> : null}
        {!data.rows && data.budgets?.length ? <View style={styles.card}><Text style={styles.body}>Tus límites están guardados. Actualiza para recuperar los movimientos y calcular el avance.</Text></View> : null}
        {(data.rows ? budgets : data.budgets || []).map((budget) => {
            const tone = budget.status === 'exceeded' ? 'danger' : budget.status === 'near' ? 'warning' : 'info';
            const [color, background] = palettes[tone];
            return <View key={budget.id} style={themeStyle([styles.card, { borderColor: color }], colors)}><View style={styles.row}><Text style={themeStyle([styles.title, styles.flex], colors)}>{budget.category}</Text><Text style={themeStyle([styles.tag, { color, backgroundColor: background }], colors)}>{budget.status ? budget.status === 'exceeded' ? 'Límite alcanzado' : budget.status === 'near' ? 'Cerca del límite' : 'Dentro del límite' : 'Sin calcular'}</Text></View><Text style={styles.body}>Límite mensual: {money(budget.monthly_limit)}</Text>{budget.status ? <><Text style={styles.big}>{money(budget.spent)} <Text style={styles.small}>gastados · {budget.percent}%</Text></Text><View style={styles.track}><View style={themeStyle({ height: '100%', width: `${Math.min(budget.percent, 100)}%`, backgroundColor: color, borderRadius: 8 }, colors)} /></View><Text style={themeStyle([styles.small, { color }], colors)}>{budget.remaining >= 0 ? `Disponible en esta categoría: ${money(budget.remaining)}` : `Exceso sobre el límite: ${money(-budget.remaining)}`}</Text></> : null}<View style={styles.buttons}><Action secondary label="Editar" icon="create-outline" disabled={saving} onPress={() => openBudget(budget)} /><Action secondary label="Eliminar" icon="trash-outline" disabled={saving} onPress={() => deleteBudget(budget)} /></View></View>;
          })}
        <InfoButton title={"Qué consume tu presupuesto"} text={"Se consideran gastos del mes hasta hoy, incluidas compras con tarjeta. Pagar la tarjeta no vuelve a sumar el gasto. Programaciones sin confirmar no consumen presupuesto. Los límites no separan dinero ni bloquean compras."} />
      </> : <>
        <View style={styles.hero}><Text style={styles.white}>PENDIENTES DE REVISAR</Text><Text style={styles.heroNumber}>{unread}</Text><Text style={styles.heroText}>{unread ? 'Revisa lo importante y abre el detalle para tomar una decisión.' : errors.length ? 'Algunas fuentes no están disponibles. Actualiza para completar la revisión.' : 'No tienes avisos nuevos con tus registros actuales.'}</Text><Text style={styles.heroFoot}>Marcar como leído no registra movimientos ni confirma pagos.</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{['Todas', 'Sin leer', 'Presupuestos', 'Pagos', 'Metas'].map((name) => <TouchableOpacity key={name} accessibilityRole="button" accessibilityState={{ selected: filter === name }} style={themeStyle([styles.chip, filter === name && styles.tabActive], colors)} onPress={() => setFilter(name)}><Text style={themeStyle([styles.tabText, filter === name && styles.white], colors)}>{name}</Text></TouchableOpacity>)}</ScrollView>
        {unread ? <Action label="Marcar todas como leídas" icon="checkmark-done-outline" secondary disabled={!readReady || reading} onPress={() => markRead(alerts.map((item) => item.id))} /> : null}
        {!visible.length ? <View style={styles.card}><Ionicons name="checkmark-circle-outline" size={34} color={themeColor(colors.primary, colors)} /><Text style={styles.title}>Sin avisos en esta vista</Text><Text style={styles.body}>Los avisos aparecen al acercarte al límite, alcanzar el presupuesto, tener un pago dentro de siete días o una meta próxima. También se muestran fechas pendientes.</Text><Action label="Configurar un presupuesto" icon="add-outline" secondary onPress={() => setTab('Presupuestos')} /></View> : null}
        {visible.map((item) => {
            const [color, background] = palettes[item.severity],read = readIds.includes(item.id);
            return <View key={item.id} style={themeStyle([styles.card, { borderLeftWidth: 4, borderLeftColor: color }], colors)}><View style={styles.row}><Ionicons name={item.icon} size={23} color={themeColor(color, colors)} /><Text style={themeStyle([styles.small, styles.flex], colors)}>{item.type}</Text><Text style={themeStyle([styles.tag, { color, backgroundColor: background }], colors)}>{read ? 'Leída' : 'Sin leer'}</Text></View><Text style={themeStyle([styles.title, { marginTop: 12 }], colors)}>{item.title}</Text><Text style={styles.body}>{item.message}</Text><Action label={item.route === 'budgets' ? 'Ver presupuestos' : item.route === 'goals' ? 'Ver metas' : item.route === 'cards' ? 'Revisar tarjeta en Programados' : 'Revisar en Programados'} icon="arrow-forward-outline" secondary onPress={() => openAlert(item)} />{!read ? <Action label="Marcar como leída" icon="checkmark-outline" secondary disabled={!readReady || reading} onPress={() => markRead([item.id])} /> : null}</View>;
          })}
        <InfoButton title={"Datos y lectura de alertas"} text={"Los avisos se calculan con tus registros; no verifican tu banco. Las alertas leídas se guardan por cuenta en este dispositivo y pueden reaparecer si cambia el vencimiento o la situación."} />
      </>}
    </ScrollView>
    <Modal visible={modal} presentationStyle="pageSheet" animationType="slide" onRequestClose={() => {if (!saving) setModal(false);}}>
      <SafeAreaProvider><SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={styles.modalHeader}><Text style={themeStyle([styles.title, styles.flex], colors)}>{editing ? 'Editar presupuesto' : 'Nuevo presupuesto'}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar presupuesto" disabled={saving} onPress={() => setModal(false)} style={styles.close}><Ionicons name="close" size={26} color={themeColor(colors.ink, colors)} /></TouchableOpacity></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}><InfoButton title={"Avisos del presupuesto"} text={"Un límite mensual por categoría. Recibirás un aviso dentro de HEDA al usar el 80% y al llegar al límite."} /><Text style={styles.label}>Categoría de gasto</Text><CategoryPicker type="Gasto" value={category} options={options} onChange={setCategory} disabled={saving} /><Text style={styles.label}>Límite mensual en MXN</Text><TextInput selectionColor={colors.link} cursorColor={colors.link} accessibilityLabel="Límite mensual en pesos" value={limit} onChangeText={setLimit} editable={!saving} placeholder="Ej. 2500.00" placeholderTextColor={colors.placeholder} keyboardType="decimal-pad" maxLength={14} style={styles.input} keyboardAppearance={colors.dark ? "dark" : "light"} /><InfoButton title={"Desde cuándo aplica el límite"} text={"Aplica desde ahora y se renueva cada mes. Los gastos que ya registraste este mes también cuentan."} />{formError ? <Text accessibilityLiveRegion="polite" style={styles.formError}>{formError}</Text> : null}<Action label={saving ? 'Guardando…' : 'Guardar presupuesto'} icon="checkmark-outline" disabled={saving} onPress={() => mutateBudget()} /></ScrollView></KeyboardAvoidingView></SafeAreaView></SafeAreaProvider>
    </Modal>
  </SafeAreaView></SwipeBackToIA>;
}

function Action({ label, icon, onPress, secondary, disabled }) {
  const { colors, styles } = useThemeStyles(makeStyles);
  return <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} style={themeStyle([styles.action, secondary && styles.secondary, disabled && { opacity: 0.45 }], colors)} onPress={onPress}><Ionicons name={icon} size={19} color={themeColor(secondary ? colors.primary : '#FFFFFF', colors)} /><Text style={themeStyle([styles.actionText, secondary && { color: colors.primary }], colors)}>{label}</Text></TouchableOpacity>;
}
const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1, minWidth: 0 },
  content: { padding: 18, paddingBottom: 30 }, tabs: { flexDirection: 'row', padding: 4, borderRadius: 16, backgroundColor: '#DCE7F7', marginBottom: 14 },
  tab: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 10 },
  tabActive: { backgroundColor: colors.primary }, tabText: { color: colors.ink, fontSize: 14, fontWeight: '700' }, white: { color: '#FFFFFF' },
  info: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.softBlue, marginBottom: 16 },
  warning: { padding: 16, borderRadius: 16, backgroundColor: '#FFFBEB', gap: 8, marginBottom: 16 },
  loading: { alignItems: 'center', padding: 50, gap: 12 }, card: { borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF', padding: 18, marginBottom: 16, marginTop: 8 },
  title: { fontSize: 18, color: colors.ink, fontWeight: '700', marginBottom: 7 }, body: { fontSize: 14, color: colors.muted, lineHeight: 21 }, small: { fontSize: 12, color: colors.muted, lineHeight: 18 },
  hero: { backgroundColor: colors.primary, borderRadius: 22, padding: 20, marginBottom: 16 }, heroNumber: { color: '#FFFFFF', fontSize: 40, fontWeight: '700', marginVertical: 8 },
  heroText: { color: '#FFFFFF', fontSize: 15, lineHeight: 22 }, heroFoot: { color: '#FFFFFF', fontSize: 11, lineHeight: 17, marginTop: 12 },
  filters: { gap: 8, paddingBottom: 10 }, chip: { backgroundColor: '#FFFFFF', borderRadius: 14, minHeight: 44, padding: 12, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 }, tag: { fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, flexShrink: 1 },
  big: { fontSize: 23, fontWeight: '700', color: colors.ink, marginTop: 14 }, track: { height: 8, backgroundColor: colors.background, borderRadius: 8, overflow: 'hidden', marginVertical: 12 },
  buttons: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' }, action: { minHeight: 46, padding: 12, backgroundColor: colors.primary, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  secondary: { backgroundColor: colors.softBlue, borderWidth: 1, borderColor: colors.headerBorder }, actionText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', flexShrink: 1 },
  modalHeader: { padding: 18, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border }, close: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.ink, fontSize: 15, fontWeight: '700', marginTop: 22, marginBottom: 12 }, input: { backgroundColor: colors.input, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 14, padding: 16, fontSize: 22, color: colors.ink, marginBottom: 12 },
  formError: { color: '#B91C1C', fontSize: 13, lineHeight: 19, marginTop: 14 }
});
