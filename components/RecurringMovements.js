import PaymentSource from './PaymentSource';
import { accountRows } from '../services/finance';
import CardPayments from './CardPayments';
import BalanceForecast from './BalanceForecast';
import { useCallback, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Modal, ScrollView, KeyboardAvoidingView, Platform, Alert, StyleSheet, Keyboard } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { colors } from '../theme/colors';
import { localDate, validateMovement } from '../utils/movementForm';
import { frequencies, recurringPayload, intervalUnits, frequencyLabel, validateIntervalCount, nextOccurrence } from '../utils/recurringMovements';
import { MovementType, CategoryPicker, MovementDate, movementColors } from './MovementFields';

const blankForm = () => ({ name: '', type: 'Gasto', amount: '', category: 'Hogar', description: '', frequency: 'monthly', intervalCount: '1', custom: false, cardId: null, date: localDate() });
const displayDate = (value) => new Date(`${value}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

export default function RecurringMovements({ onConfirmed, mode = 'simple', cards = [] }) {
  const loadedOnce = useRef(false);
  const [rules, setRules] = useState([]);
  const [forecastTransactions, setForecastTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [visible, setVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState('');
  const [userId, setUserId] = useState(null);

  async function loadRules() {
    if (!loadedOnce.current) setLoading(true);
    setLoadError('');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Vuelve a iniciar sesión para ver tus recurrentes.');
      setUserId(user.id);
      const [scheduledResult, transactionResult] = await Promise.all([
        accountRows('recurring_movements', '*', user.id),
        accountRows('transactions', '*', user.id),
      ]);
      const { data, error } = scheduledResult;
      if (error) {
        if (['PGRST205', '42P01'].includes(error.code)) throw new Error('Los recurrentes aún no están habilitados.');
        throw new Error('No pudimos cargar tus recurrentes. Intenta de nuevo.');
      }
      if (transactionResult.error) throw new Error('No pudimos cargar tu saldo para calcular la estimación. Intenta de nuevo.');
      setRules((data || []).sort((a, b) => a.next_date.localeCompare(b.next_date)));
      setForecastTransactions(transactionResult.data || []);
      loadedOnce.current = true;
    } catch (error) { setLoadError(error.message); }
    finally { setLoading(false); }
  }
  useFocusEffect(useCallback(() => { loadRules(); }, []));

  function openForm(rule) {
    setErrors({});
    setEditingId(rule?.id || null);
    setForm(rule ? { name: rule.name, type: rule.type === 'income' ? 'Ingreso' : 'Gasto', amount: String(rule.amount), category: rule.category, description: rule.description || '', frequency: rule.frequency, intervalCount: String(rule.interval_count || 1), custom: rule.frequency === 'daily' || (rule.interval_count || 1) !== 1, date: rule.next_date, cardId: rule.card_id || null } : blankForm());
    Keyboard.dismiss();
    setVisible(true);
  }
  function change(key, value) {
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  }
  async function saveRule() {
    if (busy) return;
    const validation = validateMovement(form.amount, form.category);
    const fieldErrors = { ...validation.errors };
    if (!form.name.trim()) fieldErrors.name = 'Escribe un nombre, como Renta o Salario.';
    if (!validateIntervalCount(form.intervalCount)) fieldErrors.intervalCount = 'Elige un número entero entre 1 y 365.';
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) return;
    setBusy('form');
    try {
      if (!userId) throw new Error('Vuelve a iniciar sesión.');
      const payload = recurringPayload({ ...form, cardId: form.type === 'Gasto' ? form.cardId : null, amount: validation.numericAmount, existing: rules.find((rule) => rule.id === editingId) });
      const query = editingId
        ? supabase.from('recurring_movements').update(payload).eq('id', editingId).eq('user_id', userId).select('id').single()
        : supabase.from('recurring_movements').insert({ ...payload, user_id: userId }).select('id').single();
      const { error } = await query;
      if (error) {
        if (['PGRST204', '42703', '23514'].includes(error.code)) throw new Error('No se pudo guardar esta repetición. Falta habilitar las frecuencias personalizadas.');
        throw new Error('No pudimos guardar la programación. Intenta de nuevo.');
      }
      setVisible(false);
      const following = nextOccurrence(payload.next_date, payload.frequency, payload.anchor_day, payload.anchor_month, payload.interval_count);
      const firstNotice = payload.next_date <= localDate()
        ? `Ya está pendiente para confirmar desde el ${displayDate(payload.next_date)}.`
        : `El ${displayDate(payload.next_date)} aparecerá un aviso aquí para confirmar ${form.type === 'Ingreso' ? 'el cobro' : 'el pago'}.`;
      setNotice(`${editingId ? 'Programación actualizada' : 'Programación guardada'}: ${payload.name}.\n${firstNotice}\nDespués de confirmarlo, la siguiente fecha será el ${displayDate(following)}.\n${frequencyLabel(payload.frequency, payload.interval_count)}. Los avisos aparecen dentro de HEDA.`);
      await loadRules();
    } catch (error) { setErrors((previous) => ({ ...previous, service: error.message })); }
    finally { setBusy(null); }
  }
  async function confirm(rule) {
    if (busy) return;
    setBusy(rule.id);
    setNotice('');
    try {
      const { error } = await supabase.rpc('heda_confirm_recurring', { p_id: rule.id, p_date: rule.next_date, cardId: rule.card_id || null });
      if (error) throw new Error('No pudimos confirmar el movimiento. Actualiza la lista e intenta de nuevo.');
      const following = nextOccurrence(rule.next_date, rule.frequency, rule.anchor_day, rule.anchor_month, rule.interval_count || 1);
      setNotice(`${rule.card_id ? 'Cargo registrado en la tarjeta' : rule.type === 'income' ? 'Ingreso registrado' : 'Gasto registrado'}. Próxima fecha: ${displayDate(following)}. El aviso aparecerá dentro de HEDA.`);
      await loadRules();
      await onConfirmed();
    } catch (error) { setNotice(error.message); await loadRules(); }
    finally { setBusy(null); }
  }
  async function pause(rule) {
    if (busy) return;
    setBusy(rule.id);
    const { error } = await supabase.from('recurring_movements').update({ active: !rule.active }).eq('id', rule.id).eq('user_id', userId).select('id').single();
    if (error) setNotice('No pudimos cambiar la programación.');
    else await loadRules();
    setBusy(null);
  }
  function deleteRule(rule) {
    Alert.alert('Eliminar programación', 'Se dejará de repetir. Los movimientos que ya confirmaste permanecerán en tu historial.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        setBusy(rule.id);
        const { error } = await supabase.from('recurring_movements').delete().eq('id', rule.id).eq('user_id', userId).select('id').single();
        if (error) setNotice('No pudimos eliminar la programación.');
        else await loadRules();
        setBusy(null);
      } },
    ]);
  }
  const today = localDate();
  const previewPayload = recurringPayload({ ...form, amount: 0, existing: rules.find((rule) => rule.id === editingId) });
  const followingDate = validateIntervalCount(form.intervalCount)
    ? nextOccurrence(previewPayload.next_date, previewPayload.frequency, previewPayload.anchor_day, previewPayload.anchor_month, previewPayload.interval_count)
    : null;
  return <View>
    <Text style={styles.title}>Pagos e ingresos programados</Text>
    <Text style={styles.description}>Programa renta, suscripciones o salario. Confirma cada pago o cobro para registrarlo; no se realizan cargos ni cobros.</Text>
    {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
    {loading ? <ActivityIndicator style={{ marginVertical: 20 }} color={colors.primary} /> : loadError ? <View style={styles.card}>
      <Text style={styles.description}>{loadError}</Text>
      <TouchableOpacity accessibilityRole="button" style={styles.smallAction} onPress={loadRules}><Text style={styles.link}>Intentar de nuevo</Text></TouchableOpacity>
    </View> : <>
      <TouchableOpacity accessibilityRole="button" disabled={!!busy} style={styles.createButton} onPress={() => openForm()}>
        <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" /><Text style={styles.buttonText}>Programar pago o ingreso</Text>
      </TouchableOpacity>
      <CardPayments mode={mode} transactions={forecastTransactions} onPaid={async () => { await loadRules(); await onConfirmed(); }} />
      <BalanceForecast rules={rules} transactions={forecastTransactions} cards={cards} today={today} />
      {!rules.length && <View style={styles.card}><Text style={styles.title}>Tu rutina, organizada</Text><Text style={styles.description}>Añade un pago o ingreso y elige cuándo se repite.</Text></View>}
      {rules.map((rule) => {
        const type = rule.type === 'income' ? 'Ingreso' : 'Gasto';
        const palette = movementColors[type];
        const due = rule.active && rule.next_date <= today;
        return <View key={rule.id} style={[styles.card, { borderColor: rule.type === 'income' ? '#9DD4B4' : '#EFAEB5', borderWidth: 1.5 }]}>
          <View style={styles.ruleHeader}><View style={{ flex: 1 }}><Text style={styles.ruleName}>{rule.name}</Text><Text style={styles.caption}>{type} · {rule.category}{rule.card_id ? ` · ${cards.find(card => card.id === rule.card_id)?.name || 'Tarjeta'}` : ''}</Text></View>
            <Text style={[styles.money, { color: palette.foreground }]}>{rule.type === 'income' ? '+' : '−'}${Number(rule.amount).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
          <Text style={styles.caption}>{frequencyLabel(rule.frequency, rule.interval_count || 1)} · {displayDate(rule.next_date)}</Text>
          <Text style={[styles.status, { color: due ? palette.foreground : colors.muted }]}>{!rule.active ? 'Pausado' : due ? 'Pendiente de confirmar' : 'Próximo movimiento'}</Text>
          {due && <TouchableOpacity accessibilityRole="button" disabled={!!busy} style={[styles.confirmButton, { backgroundColor: palette.foreground }]} onPress={() => confirm(rule)}>
            {busy === rule.id ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{rule.type === 'income' ? 'Confirmar cobro' : rule.card_id ? 'Confirmar cargo' : 'Confirmar pago'} · {displayDate(rule.next_date)}</Text>}
          </TouchableOpacity>}
          <View style={styles.actions}>
            <TouchableOpacity disabled={!!busy} accessibilityRole="button" style={[styles.actionButton, styles.editAction, !!busy && styles.actionDisabled]} onPress={() => openForm(rule)}><Ionicons name="create-outline" size={17} color={colors.primary} /><Text style={styles.link}>Editar</Text></TouchableOpacity>
            <TouchableOpacity disabled={!!busy} accessibilityRole="button" style={[styles.actionButton, styles.pauseAction, !!busy && styles.actionDisabled]} onPress={() => pause(rule)}><Ionicons name={rule.active ? 'pause-outline' : 'play-outline'} size={17} color={colors.ink} /><Text style={[styles.link, { color: colors.ink }]}>{rule.active ? 'Pausar' : 'Reanudar'}</Text></TouchableOpacity>
            <TouchableOpacity disabled={!!busy} accessibilityRole="button" style={[styles.actionButton, styles.deleteAction, !!busy && styles.actionDisabled]} onPress={() => deleteRule(rule)}><Ionicons name="trash-outline" size={17} color={movementColors.Gasto.foreground} /><Text style={[styles.link, { color: movementColors.Gasto.foreground }]}>Eliminar</Text></TouchableOpacity>
          </View>
        </View>;
      })}
    </>}
    <Modal visible={visible} presentationStyle="pageSheet" animationType="slide" onRequestClose={() => { if (!busy) setVisible(false); }}>
      <SafeAreaProvider>
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingId ? 'Editar programación' : 'Nueva programación'}</Text>
            <TouchableOpacity accessibilityLabel="Cerrar formulario" accessibilityRole="button" disabled={!!busy}
              style={styles.closeButton} hitSlop={8} onPress={() => { Keyboard.dismiss(); setVisible(false); }}>
              <Ionicons name="close" size={22} color={colors.ink} /><Text style={styles.closeText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 18 }} keyboardShouldPersistTaps="handled">
            <MovementType value={form.type} disabled={!!busy} onChange={(value) => { setForm((previous) => ({ ...previous, type: value, category: value === 'Ingreso' ? 'Salario' : 'Hogar', cardId: value === 'Ingreso' ? null : previous.cardId })); setErrors({}); }} />
            {(mode === 'cards' || form.cardId) && form.type === 'Gasto' && <PaymentSource cards={cards} value={form.cardId} onChange={value => change('cardId', value)} disabled={!!busy} />}
            <Text style={styles.label}>Nombre</Text>
            <TextInput style={styles.input} accessibilityLabel="Nombre del recurrente" placeholder="Ej. Renta, Netflix o salario" placeholderTextColor={colors.muted} maxLength={80} value={form.name} editable={!busy} onChangeText={(value) => change('name', value)} />
            {errors.name && <Text style={styles.error}>{errors.name}</Text>}
            <Text style={styles.label}>Monto en MXN</Text>
            <TextInput style={[styles.input, { color: movementColors[form.type].foreground }]} accessibilityLabel="Monto del recurrente" placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" value={form.amount} editable={!busy} onChangeText={(value) => change('amount', value)} />
            {errors.amount && <Text style={styles.error}>{errors.amount}</Text>}
            <Text style={styles.label}>Categoría</Text>
            <CategoryPicker type={form.type} value={form.category} disabled={!!busy} error={errors.category} onChange={(value) => change('category', value)} />
            <Text style={styles.label}>Se repite</Text>
            <View style={styles.frequencyRow}>
              {frequencies.map(([value, label]) => <TouchableOpacity key={value} disabled={!!busy} accessibilityRole="radio"
                accessibilityState={{ checked: !form.custom && form.frequency === value }}
                onPress={() => { setForm((previous) => ({ ...previous, frequency: value, intervalCount: '1', custom: false })); change('intervalCount', '1'); }}
                style={[styles.frequency, !form.custom && form.frequency === value && styles.frequencyActive]}>
                <Text style={{ color: !form.custom && form.frequency === value ? '#FFFFFF' : colors.ink }}>{label}</Text>
              </TouchableOpacity>)}
              <TouchableOpacity disabled={!!busy} accessibilityRole="radio" accessibilityState={{ checked: form.custom }}
                onPress={() => { setForm((previous) => ({ ...previous, custom: true, frequency: previous.frequency === 'biweekly' ? 'weekly' : previous.frequency, intervalCount: previous.frequency === 'biweekly' ? '2' : previous.intervalCount })); setErrors((previous) => ({ ...previous, intervalCount: undefined })); }}
                style={[styles.frequency, form.custom && styles.frequencyActive]}>
                <Text style={{ color: form.custom ? '#FFFFFF' : colors.ink }}>Elegir cada cuánto</Text>
              </TouchableOpacity>
            </View>
            {form.custom && <View style={styles.customSchedule}>
              <View style={styles.intervalRow}>
                <Text style={styles.label}>Cada</Text>
                <TextInput accessibilityLabel="Cantidad para repetir" style={styles.intervalInput} keyboardType="number-pad"
                  maxLength={3} editable={!busy} value={form.intervalCount} onChangeText={(value) => change('intervalCount', value)} />
              </View>
              <View style={styles.frequencyRow}>{intervalUnits.map(([value, label]) => <TouchableOpacity key={value} disabled={!!busy}
                accessibilityRole="radio" accessibilityState={{ checked: form.frequency === value }} onPress={() => change('frequency', value)}
                style={[styles.frequency, form.frequency === value && styles.frequencyActive]}>
                <Text style={{ color: form.frequency === value ? '#FFFFFF' : colors.ink }}>{label}</Text>
              </TouchableOpacity>)}</View>
              {errors.intervalCount && <Text accessibilityLiveRegion="polite" style={styles.error}>{errors.intervalCount}</Text>}
            </View>}
            <Text style={styles.label}>{editingId ? 'Próxima fecha' : 'Primera fecha'}</Text>
            <MovementDate value={form.date} disabled={!!busy} onChange={(value) => change('date', value)} />
            {validateIntervalCount(form.intervalCount) && <View style={styles.preview}>
              <Text style={styles.label}>{frequencyLabel(form.frequency, Number(form.intervalCount))}</Text>
              <Text style={styles.caption}>Primer aviso dentro de HEDA: {displayDate(form.date)}.</Text>
              <Text style={styles.caption}>Después de confirmar: {displayDate(followingDate)}.</Text>
            </View>}
            {['monthly', 'yearly'].includes(form.frequency) && <Text style={styles.caption}>Si eliges el día 29, 30 o 31, los meses más cortos usarán su último día. Después se retomará el día elegido.</Text>}
            <Text style={styles.label}>Nota (opcional)</Text>
            <TextInput style={styles.input} accessibilityLabel="Nota del recurrente" value={form.description} placeholder="Detalles del pago o cobro" placeholderTextColor={colors.muted} editable={!busy} onChangeText={(value) => change('description', value)} />
            {errors.service && <Text accessibilityLiveRegion="polite" style={styles.error}>{errors.service}</Text>}
          </ScrollView>
          <View style={styles.footer}>{Object.values(errors).some(Boolean) && <Text accessibilityLiveRegion="polite" style={styles.error}>Revisa los campos señalados antes de guardar.</Text>}<TouchableOpacity disabled={!!busy} accessibilityRole="button" style={[styles.createButton, { marginBottom: 0 }]} onPress={saveRule}>{busy === 'form' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Guardar programación</Text>}</TouchableOpacity></View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 16 },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  ruleHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  ruleName: { color: colors.ink, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  caption: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  money: { fontSize: 17, fontWeight: '700' },
  status: { fontSize: 13, fontWeight: '600', marginVertical: 10 },
  createButton: { backgroundColor: colors.primary, borderRadius: 14, minHeight: 50, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  confirmButton: { borderRadius: 12, padding: 12, minHeight: 48, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  link: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionButton: { flexGrow: 1, minHeight: 44, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  editAction: { backgroundColor: colors.softBlue, borderColor: '#C9DCF8' },
  pauseAction: { backgroundColor: '#F1F4F8', borderColor: colors.border },
  deleteAction: { backgroundColor: '#FFF0F1', borderColor: '#F4CCD1' },
  actionDisabled: { opacity: 0.5 },
  smallAction: { padding: 10, minHeight: 44, justifyContent: 'center' },
  notice: { backgroundColor: colors.softBlue, color: colors.ink, padding: 12, borderRadius: 12, marginBottom: 12, lineHeight: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 18, minHeight: 80, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { flex: 1, color: colors.ink, fontSize: 20, fontWeight: '700' },
  closeButton: { minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#E2EAF5' },
  closeText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  frequencyActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  customSchedule: { padding: 12, backgroundColor: colors.softBlue, borderRadius: 14, marginBottom: 12 },
  intervalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  intervalInput: { width: 80, minHeight: 48, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: '#FFFFFF', color: colors.ink, fontSize: 18, textAlign: 'center' },
  preview: { padding: 12, backgroundColor: colors.softBlue, borderRadius: 14, marginBottom: 12 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, minHeight: 50, fontSize: 16, color: colors.ink, marginBottom: 8 },
  error: { color: movementColors.Gasto.foreground, fontSize: 13, marginBottom: 8 },
  frequencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  frequency: { padding: 12, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF' },
  footer: { backgroundColor: '#FFFFFF', padding: 14, borderTopWidth: 1, borderTopColor: colors.border },
});
