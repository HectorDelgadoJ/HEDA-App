import {Text, TextInput, TouchableOpacity, Modal} from './AccessiblePrimitives';
import {Alert} from '../services/alerts';
import { notifyFinanceChange } from '../services/financeEvents';
import { useThemeStyles, themeStyle, themeColor } from "../theme/ThemeProvider";
import InfoButton from './InfoButton';
import { cardDebt, recordedRows } from '../utils/finance';
import { useCallback, useState } from 'react';
import {View, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { colors } from '../theme/colors';
import { localDate, validateMovement } from '../utils/movementForm';
import { MovementDate } from './MovementFields';
import { cardSummary } from '../utils/cardPayments';

const money = (value) => '$' + Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateLabel = (value) => new Date(`${value}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
const blank = () => ({ name: '', amount: '', date: localDate(), reminder: true });

export default function CardPayments({ transactions, onPaid, mode = 'simple' }) {
  const { colors, styles } = useThemeStyles(makeStyles);
  const recordedTransactions = recordedRows(transactions, localDate());
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [userId, setUserId] = useState(null);
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    setLoading(true);setError('');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Vuelve a iniciar sesión.');
      setUserId(user.id);
      const rows = [];
      for (let offset = 0;; offset += 1000) {
        const { data, error: queryError } = await supabase.from('card_payments').select('*').eq('user_id', user.id).order('due_date').order('id').range(offset, offset + 999);
        if (queryError) throw new Error(['PGRST205', '42P01'].includes(queryError.code) ? 'Falta habilitar las tarjetas en Supabase.' : 'No pudimos cargar tus tarjetas.');
        rows.push(...data);
        if (data.length < 1000) break;
      }
      setCards(rows);
    } catch (e) {setError(e.message);} finally
    {setLoading(false);}
  }
  useFocusEffect(useCallback(() => {load();}, []));
  const summary = cardSummary(cards, recordedTransactions);
  function open(card) {
    setEditing(card?.id || null);
    setForm(card ? { name: card.name, amount: String(card.ledger_enabled ? card.opening_balance : card.amount), date: card.due_date, reminder: card.reminder } : blank());
    setFormError('');setVisible(true);
  }
  async function save() {
    if (busy) return;
    const validation = validateMovement(form.amount, 'Tarjeta');
    const zeroDebt = (mode === 'cards' || cards.find((card) => card.id === editing)?.ledger_enabled) && /^0([.,]0{1,2})?$/.test(form.amount.trim());
    if (!form.name.trim() || !zeroDebt && Object.keys(validation.errors).length) {setFormError(mode === 'cards' ? 'Escribe el nombre y una deuda inicial de cero o más.' : 'Escribe el nombre y un importe mayor que cero.');return;}
    setBusy(true);
    try {
      const ledger = cards.find((card) => card.id === editing)?.ledger_enabled || mode === 'cards';
      const value = zeroDebt ? 0 : validation.numericAmount;
      const payload = { name: form.name.trim(), amount: ledger ? Math.max(value, 0.01) : value, due_date: form.date, reminder: form.reminder, paid: false, ...(ledger ? { ledger_enabled: true, opening_balance: value } : {}) };
      const query = editing ? supabase.from('card_payments').update(payload).eq('id', editing).eq('user_id', userId) : supabase.from('card_payments').insert({ ...payload, user_id: userId });
      const { error: queryError } = await query.select('id').single();
      if (queryError) throw new Error('No pudimos guardar la tarjeta. Intenta de nuevo.');
      setVisible(false);setNotice(`Tarjeta guardada: ${form.name.trim()}, ${dateLabel(form.date)}.`);await load();notifyFinanceChange();await onPaid();
    } catch (e) {setFormError(e.message);} finally {setBusy(false);}
  }
  function pay(card) {
    Alert.alert('Confirmar pago', `${card.ledger_enabled ? 'Se registrará un pago' : 'Se registrará un gasto'} de ${money(cardDebt(card, recordedTransactions))} por ${card.name}. ${card.ledger_enabled ? 'Reduce tu saldo disponible y liquida la deuda registrada. No vuelve a contar las compras como gastos.' : 'Confirma solo si ya pagaste y no lo registraste antes como movimiento o programado.'}`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Ya lo pagué', onPress: async () => {
        setBusy(true);
        try {
          const { error: queryError } = await supabase.rpc(card.ledger_enabled ? 'heda_pay_tracked_card' : 'heda_pay_card', { p_id: card.id, ...(card.ledger_enabled ? { p_amount: cardDebt(card, recordedTransactions) } : {}) });
          if (queryError) throw new Error('No pudimos registrar el pago. Intenta de nuevo.');
          notifyFinanceChange();await onPaid();await load();setNotice('Pago registrado en tu historial. Actualiza el importe y la fecha cuando tengas el siguiente estado de cuenta.');
        } catch (e) {setNotice(e.message);} finally {setBusy(false);}
      } }]
    );
  }
  function remove(card) {
    Alert.alert('Eliminar tarjeta', 'Se elimina este recordatorio. Los pagos registrados permanecen en el historial.', [
    { text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: async () => {
        setBusy(true);
        const { error: queryError } = await supabase.from('card_payments').delete().eq('id', card.id).eq('user_id', userId).select('id').single();
        if (queryError) setNotice('No se puede eliminar una tarjeta con cargos, pagos o recurrentes asociados. Conserva la tarjeta para mantener tu historial.');else {await load();notifyFinanceChange();await onPaid();}
        setBusy(false);
      } }]
    );
  }
  return <View style={styles.section}>
    <View style={styles.row}><Ionicons accessible={false} name="card-outline" size={23} color={themeColor(colors.primary, colors)} /><Text style={styles.title}>{mode === 'cards' ? 'Mis tarjetas' : 'Tarjetas por pagar'}</Text></View>
    <InfoButton title="Tarjetas y saldo disponible" text={mode === 'cards' ? 'Tus cargos se suman aquí. Tu saldo baja al pagar la tarjeta.' : 'Tu saldo sigue igual. Aquí reservas lo que necesitas para tus tarjetas.'} />
    {notice ? <Text accessibilityLiveRegion="polite" style={styles.caption}>{notice}</Text> : null}
    {loading ? <ActivityIndicator color={themeColor(colors.primary, colors)} /> : error ? <View><Text style={styles.error}>{error}</Text><TouchableOpacity accessibilityRole="button" onPress={load} style={styles.action}><Text style={styles.link}>Intentar de nuevo</Text></TouchableOpacity></View> : <>
      <View style={styles.summary}><Text style={styles.caption}>Saldo actual: {money(summary.balance)}</Text><Text style={styles.caption}>Pendiente en tarjetas: {money(summary.pending)}</Text><Text style={styles.title}>Después de pagarlas: {money(summary.remaining)}</Text><InfoButton title={"Qué significa Después de pagarlas"} text={"Reserva toda la deuda registrada de estas tarjetas; no incluye otros pagos programados."} /></View>
      <TouchableOpacity disabled={busy} accessibilityRole="button" style={styles.action} onPress={() => open()}><Ionicons accessible={false} name="add" size={19} color={themeColor(colors.primary, colors)} /><Text style={styles.link}>Agregar tarjeta</Text></TouchableOpacity>
      {!cards.length ? <Text style={styles.caption}>Añade el importe pendiente de tu estado de cuenta y su fecha límite.</Text> : null}
      {cards.map((card) => <View key={card.id} style={styles.card}>
        <View style={styles.row}><Text style={themeStyle([styles.title, { flex: 1 }], colors)}>{card.name}</Text><Text style={styles.amount}>{cardDebt(card, recordedTransactions) < 0 ? `${money(-cardDebt(card, recordedTransactions))} a favor` : cardDebt(card, recordedTransactions) === 0 ? 'Sin deuda' : money(cardDebt(card, recordedTransactions))}</Text></View>
        <Text style={styles.caption}>{cardDebt(card, recordedTransactions) <= 0 ? 'Sin importe pendiente' : `Fecha límite: ${dateLabel(card.due_date)}`}</Text>
        {cardDebt(card, recordedTransactions) > 0 && card.reminder && <Text style={themeStyle([styles.caption, card.due_date <= localDate() && styles.error], colors)}>{card.due_date < localDate() ? 'Fecha vencida · Revisa tu pago' : card.due_date === localDate() ? 'Hoy es tu fecha límite' : `Aviso en HEDA el ${dateLabel(card.due_date)}`}</Text>}
        <View style={styles.actions}>
          {cardDebt(card, recordedTransactions) > 0 && <TouchableOpacity disabled={busy} accessibilityRole="button" style={styles.action} onPress={() => pay(card)}><Text style={styles.link}>Ya pagué</Text></TouchableOpacity>}
          <TouchableOpacity disabled={busy} accessibilityRole="button" style={styles.action} onPress={() => open(card)}><Text style={styles.link}>{card.ledger_enabled ? 'Editar tarjeta' : card.paid ? 'Siguiente pago' : 'Editar'}</Text></TouchableOpacity>
          <TouchableOpacity disabled={busy} accessibilityRole="button" style={themeStyle([styles.action, { backgroundColor: '#FFF0F1' }], colors)} onPress={() => remove(card)}><Text style={styles.error}>Eliminar</Text></TouchableOpacity>
        </View>
      </View>)}
      <Text style={styles.caption}>Avisos dentro de HEDA al abrir esta sección. El importe es el que tú ingresas; no se consulta al banco.</Text>
    </>}
    <Modal visible={visible} presentationStyle="pageSheet" animationType="slide" onRequestClose={() => {if (!busy) setVisible(false);}}>
      <SafeAreaProvider><SafeAreaView style={styles.modal} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.header}><Text style={styles.title}>{editing ? 'Actualizar pago' : 'Agregar tarjeta'}</Text><TouchableOpacity disabled={busy} accessibilityRole="button" accessibilityLabel="Cerrar formulario" onPress={() => setVisible(false)} style={styles.action}><Text style={styles.link}>Cerrar</Text><Ionicons accessible={false} name="close" size={22} color={themeColor(colors.primary, colors)} /></TouchableOpacity></View>
        <KeyboardAvoidingView style={themeStyle({ flex: 1 }, colors)} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18 }}>
          <Text style={styles.caption}>Nombre de la tarjeta</Text><TextInput selectionColor={colors.link} cursorColor={colors.link} editable={!busy} accessibilityLabel="Nombre de la tarjeta" value={form.name} maxLength={60} placeholder="Ej. Nu o BBVA" placeholderTextColor={colors.placeholder} onChangeText={(name) => setForm((previous) => ({ ...previous, name }))} style={styles.input} keyboardAppearance={colors.dark ? "dark" : "light"} />
          <Text style={styles.caption}>{mode === 'cards' || cards.find((card) => card.id === editing)?.ledger_enabled ? 'Deuda inicial anterior a HEDA · MXN' : 'Importe pendiente por pagar · MXN'}</Text><TextInput selectionColor={colors.link} cursorColor={colors.link} editable={!busy} accessibilityLabel="Importe pendiente por pagar" value={form.amount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.placeholder} onChangeText={(amount) => setForm((previous) => ({ ...previous, amount }))} style={styles.input} keyboardAppearance={colors.dark ? "dark" : "light"} />
          <Text style={styles.caption}>Fecha límite de pago</Text><MovementDate disabled={busy} value={form.date} onChange={(date) => setForm((previous) => ({ ...previous, date }))} />
          <TouchableOpacity disabled={busy} accessibilityRole="checkbox" accessibilityState={{ checked: form.reminder }} style={styles.action} onPress={() => setForm((previous) => ({ ...previous, reminder: !previous.reminder }))}><Ionicons accessible={false} name={form.reminder ? 'checkbox' : 'square-outline'} size={23} color={themeColor(colors.primary, colors)} /><Text style={styles.link}>Recordarme dentro de HEDA</Text></TouchableOpacity>
          <Text style={styles.caption}>{mode === 'cards' || cards.find((card) => card.id === editing)?.ledger_enabled ? 'Escribe solo lo que debías antes de registrar cargos aquí. Usa 0 si empiezas sin deuda. Las compras que registres se sumarán automáticamente. Actualiza la fecha límite con tu estado de cuenta.' : 'Usa el importe que quieres cubrir de tu estado de cuenta. Puedes actualizarlo cada mes.'}</Text>
          {formError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{formError}</Text> : null}
          <TouchableOpacity disabled={busy} accessibilityRole="button" onPress={save} style={styles.save}>{busy ? <ActivityIndicator color={themeColor("#FFFFFF", colors)} /> : <Text style={themeStyle({ color: '#FFFFFF', fontWeight: '600' }, colors)}>Guardar tarjeta</Text>}</TouchableOpacity>
        </ScrollView></KeyboardAvoidingView>
      </SafeAreaView></SafeAreaProvider>
    </Modal>
  </View>;
}
const makeStyles = (colors) => StyleSheet.create({
  section: { marginBottom: 20, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, title: { fontSize: 17, fontWeight: '600', color: colors.ink },
  caption: { fontSize: 13, color: colors.muted, marginVertical: 6, lineHeight: 19 },
  summary: { backgroundColor: colors.softBlue, padding: 12, borderRadius: 12, marginVertical: 12 },
  card: { borderWidth: 1.5, borderColor: '#EFAEB5', borderRadius: 14, padding: 12, marginTop: 12 },
  amount: { fontSize: 16, fontWeight: '600', color: '#B42332' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, action: { minHeight: 44, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.softBlue, borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  link: { color: colors.primary, fontWeight: '600', fontSize: 13 }, error: { color: '#B42332', fontSize: 13 },
  modal: { flex: 1, backgroundColor: colors.background }, header: { padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: { backgroundColor: colors.input, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, padding: 14, minHeight: 50, marginBottom: 16, color: colors.ink },
  save: { minHeight: 50, backgroundColor: colors.primary, borderRadius: 12, marginTop: 18, alignItems: 'center', justifyContent: 'center' }
});
