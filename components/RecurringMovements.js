import {Switch} from './AccessiblePrimitives';
import {Text, TextInput, TouchableOpacity, Modal} from './AccessiblePrimitives';
import {Alert} from '../services/alerts';
import { notifyFinanceChange } from '../services/financeEvents';
import { useThemeStyles, themeStyle, themeColor } from "../theme/ThemeProvider";
import { useExperience } from './ExperienceProvider';
import InfoButton from './InfoButton';
import PaymentSource from './PaymentSource';
import { accountRows } from '../services/finance';
import CardPayments from './CardPayments';
import BalanceForecast from './BalanceForecast';
import { useCallback, useRef, useState } from 'react';
import {View, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, Keyboard} from 'react-native';
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
  const { colors, styles } = useThemeStyles(makeStyles);
  const { preferences, savePreferences } = useExperience();
  const [cardsSaving, setCardsSaving] = useState(false);
  const cardsToggleBusy = useRef(false);
  const [forecastOpen, setForecastOpen] = useState(false);
  async function toggleCards(value) {
    if (cardsToggleBusy.current) return;
    cardsToggleBusy.current = true;setCardsSaving(true);
    try {
      const saved = await savePreferences({ ...preferences, tools: { ...preferences.tools, cardPayments: value } });
      if (!saved) Alert.alert('No se guardó la preferencia', 'Revisa tu conexión e inténtalo de nuevo. Tus tarjetas se conservan.');
    } finally {cardsToggleBusy.current = false;setCardsSaving(false);}
  }

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
      accountRows('transactions', '*', user.id)]
      );
      const { data, error } = scheduledResult;
      if (error) {
        if (['PGRST205', '42P01'].includes(error.code)) throw new Error('Los recurrentes aún no están habilitados.');
        throw new Error('No pudimos cargar tus recurrentes. Intenta de nuevo.');
      }
      if (transactionResult.error) throw new Error('No pudimos cargar tu saldo para calcular la estimación. Intenta de nuevo.');
      setRules((data || []).sort((a, b) => a.next_date.localeCompare(b.next_date)));
      setForecastTransactions(transactionResult.data || []);
      loadedOnce.current = true;
    } catch (error) {setLoadError(error.message);} finally
    {setLoading(false);}
  }
  useFocusEffect(useCallback(() => {loadRules();}, []));

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
      const query = editingId ?
      supabase.from('recurring_movements').update(payload).eq('id', editingId).eq('user_id', userId).select('id').single() :
      supabase.from('recurring_movements').insert({ ...payload, user_id: userId }).select('id').single();
      const { error } = await query;
      if (error) {
        if (['PGRST204', '42703', '23514'].includes(error.code)) throw new Error('No se pudo guardar esta repetición. Falta habilitar las frecuencias personalizadas.');
        throw new Error('No pudimos guardar la programación. Intenta de nuevo.');
      }
      setVisible(false);
      const following = nextOccurrence(payload.next_date, payload.frequency, payload.anchor_day, payload.anchor_month, payload.interval_count);
      const firstNotice = payload.next_date <= localDate() ?
      `Ya está pendiente para confirmar desde el ${displayDate(payload.next_date)}.` :
      `El ${displayDate(payload.next_date)} aparecerá un aviso aquí para confirmar ${form.type === 'Ingreso' ? 'el cobro' : 'el pago'}.`;
      setNotice(`${editingId ? 'Programación actualizada' : 'Programación guardada'}: ${payload.name}.\n${firstNotice}\nDespués de confirmarlo, la siguiente fecha será el ${displayDate(following)}.\n${frequencyLabel(payload.frequency, payload.interval_count)}. Los avisos aparecen dentro de HEDA.`);
      notifyFinanceChange();await loadRules();
    } catch (error) {setErrors((previous) => ({ ...previous, service: error.message }));} finally
    {setBusy(null);}
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
      notifyFinanceChange();await loadRules();
      await onConfirmed();
    } catch (error) {setNotice(error.message);notifyFinanceChange();await loadRules();} finally
    {setBusy(null);}
  }
  async function pause(rule) {
    if (busy) return;
    setBusy(rule.id);
    const { error } = await supabase.from('recurring_movements').update({ active: !rule.active }).eq('id', rule.id).eq('user_id', userId).select('id').single();
    if (error) setNotice('No pudimos cambiar la programación.');else
    notifyFinanceChange();await loadRules();
    setBusy(null);
  }
  function deleteRule(rule) {
    Alert.alert('Eliminar programación', 'Se dejará de repetir. Los movimientos que ya confirmaste permanecerán en tu historial.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: async () => {
        setBusy(rule.id);
        const { error } = await supabase.from('recurring_movements').delete().eq('id', rule.id).eq('user_id', userId).select('id').single();
        if (error) setNotice('No pudimos eliminar la programación.');else
        notifyFinanceChange();await loadRules();
        setBusy(null);
      } }]
    );
  }
  const today = localDate();
  const previewPayload = recurringPayload({ ...form, amount: 0, existing: rules.find((rule) => rule.id === editingId) });
  const followingDate = validateIntervalCount(form.intervalCount) ?
  nextOccurrence(previewPayload.next_date, previewPayload.frequency, previewPayload.anchor_day, previewPayload.anchor_month, previewPayload.interval_count) :
  null;
  return <View>
    <View style={styles.menuHeading}><View style={themeStyle({ flex: 1 }, colors)}><Text style={styles.menuTitle}>Tus pagos e ingresos</Text><Text style={styles.menuSubtitle}>Organiza lo que se repite</Text></View><InfoButton title="Cómo funcionan los programados" text="Programa renta, suscripciones o salario. Confirma cada pago o cobro para registrarlo; no se realizan cargos ni cobros." /></View>
    {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
    {loading ? <ActivityIndicator style={themeStyle({ marginVertical: 20 }, colors)} color={themeColor(colors.primary, colors)} /> : loadError ? <View style={styles.card}>
      <Text style={styles.description}>{loadError}</Text>
      <TouchableOpacity accessibilityRole="button" style={styles.smallAction} onPress={loadRules}><Text style={styles.link}>Intentar de nuevo</Text></TouchableOpacity>
    </View> : <>
      <TouchableOpacity accessibilityRole="button" disabled={!!busy} style={styles.createButton} onPress={() => openForm()}>
        <Ionicons accessible={false} name="add-circle-outline" size={22} color={themeColor("#FFFFFF", colors)} /><Text style={styles.buttonText}>Programar pago o ingreso</Text>
      </TouchableOpacity>
      {rules.length ? <View style={styles.listHeading}><Text style={styles.listTitle}>Mis programaciones</Text><Text style={styles.countBadge}>{rules.length}</Text></View> : null}
      {!rules.length && <View style={styles.card}><Text style={styles.title}>Tu rutina, organizada</Text><Text style={styles.description}>Añade un pago o ingreso y elige cuándo se repite.</Text></View>}
      {rules.map((rule) => {
        const type = rule.type === 'income' ? 'Ingreso' : 'Gasto';
        const palette = movementColors[type];
        const due = rule.active && rule.next_date <= today;
        return <View key={rule.id} style={themeStyle([styles.card, { borderColor: rule.type === 'income' ? '#9DD4B4' : '#EFAEB5', borderWidth: 1.5 }], colors)}>
          <View style={styles.ruleHeader}><View style={themeStyle({ flex: 1 }, colors)}><Text style={styles.ruleName}>{rule.name}</Text><Text style={styles.caption}>{type} · {rule.category}{rule.card_id ? ` · ${cards.find((card) => card.id === rule.card_id)?.name || 'Tarjeta'}` : ''}</Text></View>
            <Text style={themeStyle([styles.money, { color: palette.foreground }], colors)}>{rule.type === 'income' ? '+' : '−'}${Number(rule.amount).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
          <Text style={styles.caption}>{frequencyLabel(rule.frequency, rule.interval_count || 1)} · {displayDate(rule.next_date)}</Text>
          <Text style={themeStyle([styles.status, { color: due ? palette.foreground : colors.muted }], colors)}>{!rule.active ? 'Pausado' : due ? 'Pendiente de confirmar' : 'Próximo movimiento'}</Text>
          {due && <TouchableOpacity accessibilityRole="button" disabled={!!busy} style={themeStyle([styles.confirmButton, { backgroundColor: palette.foreground }], colors)} onPress={() => confirm(rule)}>
            {busy === rule.id ? <ActivityIndicator color={themeColor("#FFFFFF", colors)} /> : <Text style={styles.buttonText}>{rule.type === 'income' ? 'Confirmar cobro' : rule.card_id ? 'Confirmar cargo' : 'Confirmar pago'} · {displayDate(rule.next_date)}</Text>}
          </TouchableOpacity>}
          <View style={styles.actions}>
            <TouchableOpacity disabled={!!busy} accessibilityRole="button" style={themeStyle([styles.actionButton, styles.editAction, !!busy && styles.actionDisabled], colors)} onPress={() => openForm(rule)}><Ionicons accessible={false} name="create-outline" size={17} color={themeColor(colors.primary, colors)} /><Text style={styles.link}>Editar</Text></TouchableOpacity>
            <TouchableOpacity disabled={!!busy} accessibilityRole="button" style={themeStyle([styles.actionButton, styles.pauseAction, !!busy && styles.actionDisabled], colors)} onPress={() => pause(rule)}><Ionicons accessible={false} name={rule.active ? 'pause-outline' : 'play-outline'} size={17} color={themeColor(colors.ink, colors)} /><Text style={themeStyle([styles.link, { color: colors.ink }], colors)}>{rule.active ? 'Pausar' : 'Reanudar'}</Text></TouchableOpacity>
            <TouchableOpacity disabled={!!busy} accessibilityRole="button" style={themeStyle([styles.actionButton, styles.deleteAction, !!busy && styles.actionDisabled], colors)} onPress={() => deleteRule(rule)}><Ionicons accessible={false} name="trash-outline" size={17} color={themeColor(movementColors.Gasto.foreground, colors)} /><Text style={themeStyle([styles.link, { color: movementColors.Gasto.foreground }], colors)}>Eliminar</Text></TouchableOpacity>
          </View>
        </View>;
      })}
      <View style={styles.optionalCard}>
        <View style={styles.optionalIcon}><Ionicons accessible={false} name="card-outline" size={23} color={themeColor(colors.primary, colors)} /></View>
        <View style={themeStyle({ flex: 1 }, colors)}><Text style={styles.listTitle}>Tarjetas por pagar</Text><Text style={styles.optionalLabel}>Opcional</Text></View>
        {cardsSaving ? <ActivityIndicator color={themeColor(colors.primary, colors)} /> : <Switch accessibilityLabel="Mostrar tarjetas por pagar" value={preferences.tools.cardPayments} onValueChange={toggleCards} disabled={!!busy || cardsSaving} trackColor={{true:colors.primary,false:colors.switchOff}} thumbColor={colors.onPrimary} ios_backgroundColor={colors.switchOff} />}
      </View>
      {preferences.tools.cardPayments ? <CardPayments mode={mode} transactions={forecastTransactions} onPaid={async () => {notifyFinanceChange();await loadRules();await onConfirmed();}} /> : null}
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: forecastOpen }} onPress={() => setForecastOpen(!forecastOpen)} style={styles.optionalCard}>
        <View style={styles.optionalIcon}><Ionicons accessible={false} name="calendar-outline" size={23} color={themeColor(colors.primary, colors)} /></View><View style={themeStyle({ flex: 1 }, colors)}><Text style={styles.listTitle}>Saldo estimado</Text><Text style={styles.optionalLabel}>Hasta el cierre del próximo mes</Text></View><Ionicons accessible={false} name={forecastOpen ? 'chevron-up' : 'chevron-down'} size={20} color={themeColor(colors.primary, colors)} />
      </TouchableOpacity>
      {forecastOpen ? <BalanceForecast rules={rules} transactions={forecastTransactions} cards={cards} today={today} /> : null}
    </>}
    <Modal visible={visible} presentationStyle="pageSheet" animationType="slide" onRequestClose={() => {if (!busy) setVisible(false);}}>
      <SafeAreaProvider>
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={themeStyle({ flex: 1, backgroundColor: colors.background }, colors)}>
        <KeyboardAvoidingView style={themeStyle({ flex: 1 }, colors)} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingId ? 'Editar programación' : 'Nueva programación'}</Text>
            <TouchableOpacity accessibilityLabel="Cerrar formulario" accessibilityRole="button" disabled={!!busy}
              style={styles.closeButton} hitSlop={8} onPress={() => {Keyboard.dismiss();setVisible(false);}}>
              <Ionicons accessible={false} name="close" size={22} color={themeColor(colors.ink, colors)} /><Text style={styles.closeText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 18 }} keyboardShouldPersistTaps="handled">
            <MovementType value={form.type} disabled={!!busy} onChange={(value) => {setForm((previous) => ({ ...previous, type: value, category: value === 'Ingreso' ? 'Salario' : 'Hogar', cardId: value === 'Ingreso' ? null : previous.cardId }));setErrors({});}} />
            {(mode === 'cards' || form.cardId) && form.type === 'Gasto' && <PaymentSource cards={cards} value={form.cardId} onChange={(value) => change('cardId', value)} disabled={!!busy} />}
            <Text style={styles.label}>Nombre</Text>
            <TextInput selectionColor={colors.link} cursorColor={colors.link} style={styles.input} accessibilityLabel="Nombre del recurrente" placeholder="Ej. Renta, Netflix o salario" placeholderTextColor={colors.placeholder} maxLength={80} value={form.name} editable={!busy} onChangeText={(value) => change('name', value)} keyboardAppearance={colors.dark ? "dark" : "light"} />
            {errors.name && <Text style={styles.error}>{errors.name}</Text>}
            <Text style={styles.label}>Monto en MXN</Text>
            <TextInput selectionColor={colors.link} cursorColor={colors.link} style={themeStyle([styles.input, { color: movementColors[form.type].foreground }], colors)} accessibilityLabel="Monto del recurrente" placeholder="0.00" placeholderTextColor={colors.placeholder} keyboardType="decimal-pad" value={form.amount} editable={!busy} onChangeText={(value) => change('amount', value)} keyboardAppearance={colors.dark ? "dark" : "light"} />
            {errors.amount && <Text style={styles.error}>{errors.amount}</Text>}
            <Text style={styles.label}>Categoría</Text>
            <CategoryPicker type={form.type} value={form.category} disabled={!!busy} error={errors.category} onChange={(value) => change('category', value)} />
            <Text style={styles.label}>Se repite</Text>
            <View style={styles.frequencyRow}>
              {frequencies.map(([value, label]) => <TouchableOpacity key={value} disabled={!!busy} accessibilityRole="radio"
                accessibilityState={{ checked: !form.custom && form.frequency === value }}
                onPress={() => {setForm((previous) => ({ ...previous, frequency: value, intervalCount: '1', custom: false }));change('intervalCount', '1');}}
                style={themeStyle([styles.frequency, !form.custom && form.frequency === value && styles.frequencyActive], colors)}>
                <Text style={themeStyle({ color: !form.custom && form.frequency === value ? '#FFFFFF' : colors.ink }, colors)}>{label}</Text>
              </TouchableOpacity>)}
              <TouchableOpacity disabled={!!busy} accessibilityRole="radio" accessibilityState={{ checked: form.custom }}
                onPress={() => {setForm((previous) => ({ ...previous, custom: true, frequency: previous.frequency === 'biweekly' ? 'weekly' : previous.frequency, intervalCount: previous.frequency === 'biweekly' ? '2' : previous.intervalCount }));setErrors((previous) => ({ ...previous, intervalCount: undefined }));}}
                style={themeStyle([styles.frequency, form.custom && styles.frequencyActive], colors)}>
                <Text style={themeStyle({ color: form.custom ? '#FFFFFF' : colors.ink }, colors)}>Elegir cada cuánto</Text>
              </TouchableOpacity>
            </View>
            {form.custom && <View style={styles.customSchedule}>
              <View style={styles.intervalRow}>
                <Text style={styles.label}>Cada</Text>
                <TextInput selectionColor={colors.link} cursorColor={colors.link} accessibilityLabel="Cantidad para repetir" style={styles.intervalInput} keyboardType="number-pad"
                  maxLength={3} editable={!busy} value={form.intervalCount} onChangeText={(value) => change('intervalCount', value)} keyboardAppearance={colors.dark ? "dark" : "light"} />
              </View>
              <View style={styles.frequencyRow}>{intervalUnits.map(([value, label]) => <TouchableOpacity key={value} disabled={!!busy}
                  accessibilityRole="radio" accessibilityState={{ checked: form.frequency === value }} onPress={() => change('frequency', value)}
                  style={themeStyle([styles.frequency, form.frequency === value && styles.frequencyActive], colors)}>
                <Text style={themeStyle({ color: form.frequency === value ? '#FFFFFF' : colors.ink }, colors)}>{label}</Text>
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
            {['monthly', 'yearly'].includes(form.frequency) && <InfoButton title={"Repeticiones en meses cortos"} text={"Si eliges el día 29, 30 o 31, los meses más cortos usarán su último día. Después se retomará el día elegido."} />}
            <Text style={styles.label}>Nota (opcional)</Text>
            <TextInput selectionColor={colors.link} cursorColor={colors.link} style={styles.input} accessibilityLabel="Nota del recurrente" value={form.description} placeholder="Detalles del pago o cobro" placeholderTextColor={colors.placeholder} editable={!busy} onChangeText={(value) => change('description', value)} keyboardAppearance={colors.dark ? "dark" : "light"} />
            {errors.service && <Text accessibilityLiveRegion="polite" style={styles.error}>{errors.service}</Text>}
          </ScrollView>
          <View style={styles.footer}>{Object.values(errors).some(Boolean) && <Text accessibilityLiveRegion="polite" style={styles.error}>Revisa los campos señalados antes de guardar.</Text>}<TouchableOpacity disabled={!!busy} accessibilityRole="button" style={themeStyle([styles.createButton, { marginBottom: 0 }], colors)} onPress={saveRule}>{busy === 'form' ? <ActivityIndicator color={themeColor("#FFFFFF", colors)} /> : <Text style={styles.buttonText}>Guardar programación</Text>}</TouchableOpacity></View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  </View>;
}

const makeStyles = (colors) => StyleSheet.create({
  menuHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  menuTitle: { color: colors.ink, fontSize: 21, fontWeight: '700', marginBottom: 4 },
  menuSubtitle: { color: colors.muted, fontSize: 13 },
  listHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 3 },
  listTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  countBadge: { color: colors.primary, backgroundColor: colors.softBlue, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, fontWeight: '700', fontSize: 12 },
  optionalCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 70, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 17, marginBottom: 12 },
  optionalIcon: { width: 39, height: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.softBlue },
  optionalLabel: { color: colors.muted, fontSize: 12, marginTop: 4 },
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
  input: { backgroundColor: colors.input, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, padding: 14, minHeight: 50, fontSize: 16, color: colors.ink, marginBottom: 8 },
  error: { color: movementColors.Gasto.foreground, fontSize: 13, marginBottom: 8 },
  frequencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  frequency: { padding: 12, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF' },
  footer: { backgroundColor: '#FFFFFF', padding: 14, borderTopWidth: 1, borderTopColor: colors.border }
});
