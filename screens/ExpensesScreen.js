import {Alert} from '../services/alerts';
import { notifyFinanceChange } from '../services/financeEvents';
import { useThemeStyles, themeStyle, themeColor } from "../theme/ThemeProvider";
import InfoButton from '../components/InfoButton';
import { useExperience } from '../components/ExperienceProvider';
import { visibleCategories } from '../utils/experience';
import ScreenHeader from '../components/ScreenHeader';
import { layout } from '../theme/layout';
import PaymentSource from '../components/PaymentSource';
import { transactionRows, accountRows } from '../services/finance';
import { financialTotals, isSpending } from '../utils/finance';
import RecurringMovements from '../components/RecurringMovements';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MovementType, CategoryPicker, MovementDate, movementColors } from '../components/MovementFields';
import { localDate, categoryOptions, rankedCategories, validateMovement, restoreCategoryPreferences } from '../utils/movementForm';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, Keyboard, KeyboardAvoidingView, TouchableWithoutFeedback, Platform, InputAccessoryView } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { supabase } from '../services/supabase';

const AMOUNT_ACCESSORY_ID = 'expensesAmountKeyboardAccessory';

export default function ExpensesScreen({ route, navigation }) {
  const { colors, styles } = useThemeStyles(makeStyles);
  const { simple } = useExperience();
  const [moreOptions, setMoreOptions] = useState(false);
  const [allCategories, setAllCategories] = useState(false);
  // =====================================================
  // FORMULARIO NUEVO MOVIMIENTO
  // =====================================================

  const [mode, setMode] = useState('simple');
  const [modeReady, setModeReady] = useState(false);
  const [modeBusy, setModeBusy] = useState(false);
  const [cards, setCards] = useState([]);
  const [cardId, setCardId] = useState(null);
  const [editCardId, setEditCardId] = useState(null);
  const [type, setType] = useState('Gasto');
  const [selectedCategory, setSelectedCategory] =
  useState('Comida');

  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [transactionDate, setTransactionDate] = useState(localDate);
  const activeColor = movementColors[type].foreground;

  // =====================================================
  // MOVIMIENTOS
  // =====================================================

  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');
  const [section, setSection] = useState('Nuevo');
  useEffect(() => {if (['Nuevo', 'Historial', 'Recurrentes'].includes(route?.params?.openSection)) {setSection(route.params.openSection);navigation.setParams({ openSection: undefined });}}, [route?.params?.openSection, navigation]);
  const [noteOpen, setNoteOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const scrollRef = useRef(null);
  const amountRef = useRef(null);
  const editScrollRef = useRef(null);
  const categoryY = useRef(0);
  const preferredCategories = useRef({ Gasto: 'Comida', Ingreso: 'Salario' });
  const preferenceKey = useRef(null);
  const preferenceWrites = useRef(Promise.resolve());
  const touchedTypes = useRef(new Set());
  const draftDirty = useRef(false);
  const [categoryOrder, setCategoryOrder] = useState({ Gasto: categoryOptions('Gasto'), Ingreso: categoryOptions('Ingreso') });
  useEffect(() => {
    const requested = route?.params?.movementType;
    if (!saving && ['Gasto', 'Ingreso'].includes(requested)) {
      changeType(requested);setSection('Nuevo');
      navigation.setParams({ movementType: undefined });
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [route?.params?.movementType, saving, navigation]);


  function refreshCategoryOrder(rows) {
    setCategoryOrder({ Gasto: rankedCategories('Gasto', rows), Ingreso: rankedCategories('Ingreso', rows) });
  }

  function selectCategory(value) {
    draftDirty.current = true;
    touchedTypes.current.add(type);
    setSelectedCategory(value);
    setErrors((previous) => ({ ...previous, category: undefined }));
    setSaveNotice('');
    if (!value.trim()) return;
    preferredCategories.current = { ...preferredCategories.current, [type]: value.trim() };
    persistCategories();
  }

  function persistCategories() {
    if (!preferenceKey.current) return;
    const key = preferenceKey.current;
    const value = JSON.stringify(preferredCategories.current);
    preferenceWrites.current = preferenceWrites.current.catch(() => {}).then(() => AsyncStorage.setItem(key, value)).catch(() => {});
  }

  async function hydrateCategories(userId) {
    const key = `heda:movement-categories:${userId}`;
    if (preferenceKey.current === key) return;
    preferenceKey.current = key;
    try {
      const stored = JSON.parse((await AsyncStorage.getItem(key)) || '{}');
      preferredCategories.current = restoreCategoryPreferences(stored, preferredCategories.current, touchedTypes.current);
      // Never replace a category while the user is already filling the form.
      if (!draftDirty.current) setSelectedCategory(preferredCategories.current.Gasto);
      if (touchedTypes.current.size) persistCategories();
    } catch {/* Device storage is optional; registration still works. */}
  }

  // =====================================================
  // EDICIÓN
  // =====================================================

  const [editModalVisible, setEditModalVisible] =
  useState(false);

  const [selectedTransaction, setSelectedTransaction] =
  useState(null);

  const [editType, setEditType] = useState('Gasto');
  const [editCategory, setEditCategory] =
  useState('Comida');

  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDate, setEditDate] = useState(localDate);

  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // =====================================================
  // CARGAR MOVIMIENTOS
  // =====================================================

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [])
  );

  async function loadTransactions() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError) {


        return;
      }

      if (!user) {
        return;
      }

      await hydrateCategories(user.id);

      const [transactionResult, profileResult, cardResult] = await Promise.all([
      transactionRows(user.id),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      accountRows('card_payments', '*', user.id)]
      );
      if (profileResult.error || cardResult.error && !['PGRST205', '42P01'].includes(cardResult.error.code)) {
        throw new Error('No pudimos cargar la configuración de tarjetas.');
      }
      setMode(profileResult.data?.movement_mode || 'simple');
      setModeReady(!!profileResult.data?.movement_mode);
      setCards(cardResult.data || []);
      const { data, error } = transactionResult;

      if (error) {


        Alert.alert(
          'Error',
          'No se pudieron cargar tus movimientos.'
        );

        return;
      }

      setTransactions(data || []);
      if (!draftDirty.current) refreshCategoryOrder(data || []);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // REGISTRAR MOVIMIENTO
  // =====================================================

  async function handleRegisterMovement() {
    Keyboard.dismiss();

    setSaveNotice('');

    const { errors: validationErrors, numericAmount } = validateMovement(amount, selectedCategory);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      scrollRef.current?.scrollTo({ y: validationErrors.amount ? 0 : categoryY.current, animated: true });
      if (validationErrors.amount) amountRef.current?.focus();
      return;
    }

    try {
      setSaving(true);

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

      const transactionType =
      type === 'Ingreso' ?
      'income' :
      'expense';



      const { error } = await supabase.
      from('transactions').
      insert({
        user_id: user.id,
        type: transactionType,
        amount: numericAmount,
        category: selectedCategory.trim(),
        description: notes.trim() || null,
        transaction_date: transactionDate,
        ...(modeReady ? { card_id: type === 'Gasto' && mode === 'cards' ? cardId : null } : {})
      });

      if (error) {


        Alert.alert(
          'Error',
          'No se pudo registrar el movimiento.'
        );

        return;
      }

      preferredCategories.current[type] = selectedCategory.trim();
      persistCategories();
      setAmount('');
      setNotes('');
      setNoteOpen(false);
      draftDirty.current = false;

      notifyFinanceChange();await loadTransactions();

      setSaveNotice(type === 'Ingreso' ? 'Ingreso guardado' : 'Gasto guardado');
    } catch (error) {


      Alert.alert(
        'Error',
        'Ocurrió un problema al registrar el movimiento.'
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // ABRIR EDICIÓN
  // =====================================================

  function handleOpenMovement(transaction) {
    Keyboard.dismiss();

    setSelectedTransaction(transaction);
    setEditErrors({});

    setEditType(
      transaction.type === 'income' ?
      'Ingreso' :
      'Gasto'
    );

    setEditCategory(
      transaction.category || 'Comida'
    );

    setEditAmount(
      String(transaction.amount || '')
    );

    setEditNotes(
      transaction.description || ''
    );

    setEditCardId(transaction.card_id || null);
    setEditDate(transaction.transaction_date || localDate());
    setEditModalVisible(true);
  }

  // =====================================================
  // CERRAR EDICIÓN
  // =====================================================

  function closeEditModal() {
    Keyboard.dismiss();

    if (updating || deleting) {
      return;
    }

    setEditModalVisible(false);
    setSelectedTransaction(null);

    setEditAmount('');
    setEditNotes('');
    setEditType('Gasto');
    setEditCategory('Comida');
  }

  // =====================================================
  // ACTUALIZAR MOVIMIENTO
  // =====================================================

  async function handleUpdateMovement() {
    Keyboard.dismiss();

    if (!selectedTransaction) {
      return;
    }

    const { errors: validationErrors, numericAmount } = validateMovement(editAmount, editCategory);
    setEditErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      editScrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    try {
      setUpdating(true);

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

      const transactionType =
      editType === 'Ingreso' ?
      'income' :
      'expense';

      const { error } = await supabase.
      from('transactions').
      update({
        type: transactionType,
        amount: numericAmount,
        category: editCategory.trim(),
        description: editNotes.trim() || null,
        transaction_date: editDate,
        ...(modeReady ? { card_id: selectedTransaction.is_card_payment ? selectedTransaction.card_id : editType === 'Gasto' ? editCardId : null } : {}),
        updated_at: new Date().toISOString()
      }).
      eq('id', selectedTransaction.id).
      eq('user_id', user.id);

      if (error) {


        Alert.alert(
          'Error',
          'No se pudo actualizar el movimiento.'
        );

        return;
      }

      setEditModalVisible(false);
      setSelectedTransaction(null);

      setEditAmount('');
      setEditNotes('');

      notifyFinanceChange();await loadTransactions();

      Alert.alert(
        'Movimiento actualizado',
        'Los cambios se guardaron correctamente.'
      );
    } catch (error) {


      Alert.alert(
        'Error',
        'Ocurrió un problema al actualizar el movimiento.'
      );
    } finally {
      setUpdating(false);
    }
  }

  // =====================================================
  // CONFIRMAR ELIMINACIÓN
  // =====================================================

  function handleDeleteConfirmation() {
    Keyboard.dismiss();

    if (!selectedTransaction) {
      return;
    }

    Alert.alert(
      'Eliminar movimiento',
      '¿Seguro que deseas eliminar este movimiento? Esta acción no se puede deshacer.',
      [
      {
        text: 'Cancelar',
        style: 'cancel'
      },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: handleDeleteMovement
      }]

    );
  }

  // =====================================================
  // ELIMINAR MOVIMIENTO
  // =====================================================

  async function handleDeleteMovement() {
    if (!selectedTransaction) {
      return;
    }

    try {
      setDeleting(true);

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
      from('transactions').
      delete().
      eq('id', selectedTransaction.id).
      eq('user_id', user.id);

      if (error) {


        Alert.alert(
          'Error',
          'No se pudo eliminar el movimiento.'
        );

        return;
      }

      setEditModalVisible(false);
      setSelectedTransaction(null);

      setEditAmount('');
      setEditNotes('');

      notifyFinanceChange();await loadTransactions();

      Alert.alert(
        'Movimiento eliminado',
        'El movimiento fue eliminado correctamente.'
      );
    } catch (error) {


      Alert.alert(
        'Error',
        'Ocurrió un problema al eliminar el movimiento.'
      );
    } finally {
      setDeleting(false);
    }
  }

  // =====================================================
  // LIMPIAR FORMULARIO
  // =====================================================

  function handleCancel() {
    Keyboard.dismiss();

    setAmount('');
    setNotes('');
    setSelectedCategory(preferredCategories.current[type]);
    setNoteOpen(false);
    setErrors({});
    draftDirty.current = false;
    refreshCategoryOrder(transactions);
    setTransactionDate(localDate());
    setSaveNotice('');
  }

  // =====================================================
  // CÁLCULOS
  // =====================================================

  const { income: totalIncome, expenses: totalExpenses, balance } = financialTotals(transactions, localDate());

  // =====================================================
  // FECHA LOCAL
  // =====================================================

  function changeType(nextType) {
    if (nextType === type) return;
    setType(nextType);
    if (nextType === 'Ingreso') setCardId(null);
    setSaveNotice('');
    draftDirty.current = true;
    setErrors({});
    setSelectedCategory(preferredCategories.current[nextType]);
  }

  function changeEditType(nextType) {
    if (nextType === editType) return;
    setEditType(nextType);
    if (nextType === 'Ingreso') setEditCardId(null);
    setEditErrors({});
    setEditCategory(categoryOptions(nextType)[0][0]);
  }

  async function changeMode(nextMode) {
    if (modeBusy || saving || nextMode === mode) return;
    setModeBusy(true);
    try {
      const { error } = await supabase.rpc('heda_set_movement_mode', { p_mode: nextMode });
      if (error) throw new Error('No pudimos cambiar el modo. Verifica que el nuevo SQL esté habilitado.');
      setCardId(null);
      notifyFinanceChange();await loadTransactions();
      setSaveNotice(nextMode === 'cards' ? 'Modo Con tarjetas activado' : 'Modo Simple activado');
    } catch (error) {Alert.alert('Cambiar modo', error.message);} finally
    {setModeBusy(false);}
  }

  // =====================================================
  // FORMATO MONEDA
  // =====================================================

  function formatCurrency(value) {
    const number = Number(value || 0);

    return number.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // =====================================================
  // FORMATO FECHA
  // =====================================================

  function formatDate(dateString) {
    if (!dateString) {
      return '';
    }

    const [year, month, day] =
    dateString.split('-');

    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );

    return date.toLocaleDateString(
      'es-MX',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }
    );
  }

  // =====================================================
  // INTERFAZ
  // =====================================================

  const accountOptions = <View style={themeStyle({ marginBottom: 14 }, colors)}>
          <Text style={themeStyle({ color: colors.muted, fontSize: 12, marginBottom: 8 }, colors)}>Forma de registrar tus gastos</Text>
          <View style={themeStyle({ flexDirection: 'row', gap: 8 }, colors)}>{[['simple', 'Desde mi saldo'], ['cards', 'Con tarjetas']].map(([value, label]) => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ checked: mode === value, disabled: !modeReady || modeBusy || saving || loading }} disabled={!modeReady || modeBusy || saving || loading} onPress={() => changeMode(value)} style={themeStyle({ flex: 1, minHeight: 44, borderWidth: 1, borderColor: mode === value ? colors.primary : colors.border, backgroundColor: mode === value ? colors.softBlue : '#FFFFFF', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, colors)}><Text style={themeStyle({ color: mode === value ? colors.primary : colors.muted, fontWeight: '600' }, colors)}>{label}</Text></TouchableOpacity>)}</View>
          <Text style={themeStyle({ color: colors.muted, fontSize: 12, marginTop: 7 }, colors)}>{mode === 'cards' ? 'Elige Mi saldo o una tarjeta para cada gasto.' : 'Registra ingresos y gastos directamente en tu saldo.'}</Text>
          {!modeReady && !loading && <Text style={themeStyle({ color: colors.muted, fontSize: 12 }, colors)}>Habilita el nuevo SQL para elegir modo.</Text>}
        </View>;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <KeyboardAvoidingView style={themeStyle({ flex: 1 }, colors)} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
          ref={scrollRef}
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

        {/* HEADER */}

        <ScreenHeader title="Movimientos" subtitle="Registra lo que entra y lo que sale" icon="swap-vertical-outline" />

        {!simple && accountOptions}
        <View style={styles.sectionTabs}>
          {['Nuevo', 'Historial', 'Recurrentes'].map((name) => <TouchableOpacity key={name} accessibilityRole="tab"
            accessibilityState={{ selected: section === name, disabled: saving }} disabled={saving}
            onPress={() => {Keyboard.dismiss();setSection(name);scrollRef.current?.scrollTo({ y: 0, animated: false });}}
            style={themeStyle([styles.sectionTab, section === name && styles.sectionTabActive], colors)}>
            <Text style={themeStyle([styles.sectionTabText, section === name && { color: '#FFFFFF' }], colors)}>{{ Nuevo: 'Registrar', Historial: 'Historial', Recurrentes: simple ? 'Pagos' : 'Programados' }[name]}</Text>
          </TouchableOpacity>)}
        </View>
        {section === 'Recurrentes' ? <RecurringMovements onConfirmed={loadTransactions} mode={mode} cards={cards} /> : section === 'Nuevo' ? <>
        {/* TIPO */}

        <MovementType value={type} onChange={changeType} disabled={saving || modeBusy || loading} />
        {!simple && mode === 'cards' && type === 'Gasto' && <PaymentSource cards={cards} value={cardId} onChange={setCardId} disabled={saving || loading} onManage={() => {Keyboard.dismiss();setSection('Recurrentes');scrollRef.current?.scrollTo({ y: 0, animated: false });}} />}

        {/* MONTO */}

        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>
            Monto en MXN
          </Text>

          <View style={styles.amountRow}>
            <Text style={themeStyle([styles.currencySymbol, { color: activeColor }], colors)}>
              $
            </Text>

            <TextInput selectionColor={colors.link} cursorColor={colors.link}
                  ref={amountRef}
                  placeholder="0.00"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="decimal-pad"
                  inputAccessoryViewID={
                  Platform.OS === 'ios' ?
                  AMOUNT_ACCESSORY_ID :
                  undefined
                  }
                  style={themeStyle([styles.amountInput, { color: activeColor }], colors)}
                  accessibilityLabel="Monto en pesos mexicanos"
                  editable={!saving}
                  value={amount}
                  onChangeText={(value) => {draftDirty.current = true;setAmount(value);setSaveNotice('');setErrors((previous) => ({ ...previous, amount: undefined }));}} keyboardAppearance={colors.dark ? "dark" : "light"} />

          </View>
          {errors.amount ? <Text accessibilityLiveRegion="polite" style={styles.fieldError}>{errors.amount}</Text> : null}
        </View>

        {/* CATEGORÍAS */}

        <View onLayout={(event) => {categoryY.current = event.nativeEvent.layout.y;}} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Categoría
          </Text>
        </View>

        <CategoryPicker type={type} value={selectedCategory} onChange={selectCategory} options={visibleCategories(categoryOrder[type], selectedCategory, !simple || allCategories)} error={errors.category} disabled={saving} />
        {simple && categoryOrder[type].length > 4 ? <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: allCategories }} disabled={saving} style={styles.noteToggle} onPress={() => setAllCategories(!allCategories)}><Text style={styles.noteToggleText}>{allCategories ? 'Ver menos categorías' : 'Ver todas las categorías'}</Text><Ionicons name={allCategories ? 'chevron-up' : 'chevron-down'} size={17} color={themeColor(colors.primary, colors)} /></TouchableOpacity> : null}
        <MovementDate compact={simple} value={transactionDate} onChange={(value) => {draftDirty.current = true;setTransactionDate(value);}} disabled={saving} />

        {simple ? <TouchableOpacity accessibilityRole="button" disabled={saving} accessibilityState={{ expanded: moreOptions }} style={styles.noteToggle} onPress={() => setMoreOptions(!moreOptions)}><Ionicons name="options-outline" size={19} color={themeColor(colors.primary, colors)} /><View style={themeStyle({ flex: 1 }, colors)}><Text style={styles.noteToggleText}>Más opciones</Text><Text style={themeStyle({ color: colors.muted, fontSize: 11, marginTop: 4 }, colors)}>{type === 'Ingreso' ? 'Ingresa a Mi saldo' : cardId ? `Tarjeta: ${cards.find((card) => card.id === cardId)?.name || 'seleccionada'}` : 'Sale de Mi saldo'}{notes ? ' · Con nota' : ''}</Text></View><Ionicons name={moreOptions ? 'chevron-up' : 'chevron-down'} size={18} color={themeColor(colors.primary, colors)} /></TouchableOpacity> : null}
        {(!simple || moreOptions) && <>
        {simple && type === 'Gasto' && accountOptions}
        {simple && mode === 'cards' && type === 'Gasto' && <PaymentSource cards={cards} value={cardId} onChange={setCardId} disabled={saving || loading} onManage={() => {Keyboard.dismiss();setSection('Recurrentes');scrollRef.current?.scrollTo({ y: 0, animated: false });}} />}
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: noteOpen, disabled: saving }} disabled={saving}
              style={styles.noteToggle} onPress={() => setNoteOpen(!noteOpen)}>
          <Ionicons name="create-outline" size={18} color={themeColor(colors.primary, colors)} />
          <Text style={styles.noteToggleText}>{noteOpen ? 'Plegar nota' : notes ? 'Ver nota' : 'Añadir nota (opcional)'}</Text>
          <Ionicons name={noteOpen ? 'chevron-up' : 'chevron-down'} size={16} color={themeColor(colors.primary, colors)} />
        </TouchableOpacity>
        {/* NOTAS */}

        {noteOpen && <View style={styles.notesCard}>
          <View style={styles.optionLeft}>
            <Ionicons
                    name="menu-outline"
                    size={22}
                    color={themeColor(colors.ink, colors)} />


            <Text style={styles.optionLabel}>
              Descripción (opcional)
            </Text>
          </View>

          <TextInput selectionColor={colors.link} cursorColor={colors.link}
                  placeholder={type === 'Ingreso' ? 'Ej. Salario de octubre, venta de bicicleta…' : 'Ej. Despensa, comida con amigos…'}
                  placeholderTextColor={colors.placeholder}
                  multiline
                  style={styles.notesInput}
                  editable={!saving}
                  value={notes}
                  onChangeText={(value) => {draftDirty.current = true;setNotes(value);}} keyboardAppearance={colors.dark ? "dark" : "light"} />

        </View>}
        </>}
        </> : <>
        {/* BALANCE */}

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>
            Saldo disponible
          </Text>

          <Text style={styles.balanceAmount}>
            ${formatCurrency(balance)} MXN
          </Text>

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

        {transactions.some((row) => row.card_id) && <InfoButton title={"Gastos, tarjetas y saldo"} text={"Los gastos incluyen compras con tarjeta. El saldo disponible solo baja con pagos desde Mi saldo o al pagar una tarjeta."} />}
        {/* MOVIMIENTOS */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Movimientos recientes
          </Text>
        </View>

        {loading ?
            <ActivityIndicator
              size="large"
              color={themeColor(colors.primary, colors)}
              style={themeStyle({
                marginVertical: 25
              }, colors)} /> :

            transactions.length === 0 ?
            <View style={styles.emptyCard}>
            <Ionicons
                name="wallet-outline"
                size={32}
                color={themeColor("#9CA3AF", colors)} />


            <Text style={styles.emptyTitle}>
              Sin movimientos
            </Text>

            <Text style={styles.emptyText}>
              Registra tu primer ingreso o gasto.
            </Text>
          </View> :

            transactions.map(
              (transaction) =>
              <Movement
                key={transaction.id}
                title={
                transaction.description ||
                transaction.category
                }
                category={transaction.is_card_payment ? 'Pago de tarjeta' : transaction.card_id ? `${transaction.category} · ${cards.find((card) => card.id === transaction.card_id)?.name || 'Tarjeta'}` : transaction.category}
                date={formatDate(
                  transaction.transaction_date
                )}
                amount={
                transaction.amount
                }
                type={
                transaction.type
                }
                onPress={() =>
                handleOpenMovement(
                  transaction
                )
                } />


            )
            }
        </>}
      </ScrollView>
      {section === 'Nuevo' && <View style={styles.saveBar}>
        {saveNotice ? <Text accessibilityLiveRegion="polite" style={styles.saveNotice}>{saveNotice} ✓</Text> : null}
        <View style={styles.saveActions}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Restablecer formulario" disabled={saving}
            onPress={handleCancel} style={styles.resetButton}>
            <Ionicons name="refresh-outline" size={22} color={themeColor(colors.muted, colors)} />
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: saving, busy: saving }}
            style={themeStyle([styles.primaryButton, { backgroundColor: activeColor }, saving && styles.primaryButtonDisabled], colors)}
            onPress={handleRegisterMovement} disabled={saving || modeBusy || loading}>
            {saving ? <ActivityIndicator color={themeColor("#FFFFFF", colors)} /> : <Text style={styles.primaryButtonText}>{type === 'Ingreso' ? 'Guardar ingreso' : 'Guardar gasto'}</Text>}
          </TouchableOpacity>
        </View>
      </View>}
      </KeyboardAvoidingView>

      {/* ================================================= */}
      {/* MODAL EDITAR MOVIMIENTO */}
      {/* ================================================= */}

      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeEditModal}>

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
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>
                      Editar movimiento
                    </Text>

                    {selectedTransaction &&
                    <Text
                      style={
                      styles.modalSubtitle
                      }>

                        {formatDate(
                        selectedTransaction.transaction_date
                      )}
                      </Text>
                    }
                  </View>

                  <TouchableOpacity
                    onPress={closeEditModal}
                    disabled={
                    updating || deleting
                    }>

                    <Ionicons
                      name="close"
                      size={26}
                      color={themeColor(colors.ink, colors)} />

                  </TouchableOpacity>
                </View>

                <ScrollView
                  ref={editScrollRef}
                  showsVerticalScrollIndicator={
                  false
                  }
                  keyboardShouldPersistTaps="handled">

                  {/* TIPO */}

                  <Text style={styles.editLabel}>
                    Tipo
                  </Text>

                  <MovementType value={editType} onChange={changeEditType} disabled={updating || deleting || selectedTransaction?.is_card_payment} />
                  {(mode === 'cards' || editCardId) && editType === 'Gasto' && !selectedTransaction?.is_card_payment && <PaymentSource cards={cards} value={editCardId} onChange={setEditCardId} disabled={updating || deleting} />}
                  {selectedTransaction?.is_card_payment && <Text style={themeStyle({ color: colors.muted, marginBottom: 12 }, colors)}>Pago de tarjeta: reduce tu saldo y la deuda; no cuenta como un segundo gasto.</Text>}

                  {/* MONTO */}

                  <Text style={styles.editLabel}>
                    Monto
                  </Text>

                  <View
                    style={styles.editAmountCard}>

                    <Text
                      style={
                      styles.editCurrencySymbol
                      }>

                      $
                    </Text>

                    <TextInput selectionColor={colors.link} cursorColor={colors.link}
                      editable={!updating && !deleting}
                      value={editAmount}
                      onChangeText={(value) => {setEditAmount(value);setEditErrors((previous) => ({ ...previous, amount: undefined }));}}
                      keyboardType="decimal-pad"
                      inputAccessoryViewID={
                      Platform.OS === 'ios' ?
                      AMOUNT_ACCESSORY_ID :
                      undefined
                      }
                      placeholder="0.00"
                      placeholderTextColor={colors.placeholder}
                      style={themeStyle([styles.editAmountInput, { color: movementColors[editType].foreground }], colors)} keyboardAppearance={colors.dark ? "dark" : "light"} />

                  </View>

                  {editErrors.amount ? <Text accessibilityLiveRegion="polite" style={styles.fieldError}>{editErrors.amount}</Text> : null}

                  {/* CATEGORÍA */}

                  <Text style={styles.editLabel}>
                    Categoría
                  </Text>

                  <CategoryPicker type={editType} value={editCategory} options={categoryOrder[editType]} error={editErrors.category} onChange={(value) => {setEditCategory(value);setEditErrors((previous) => ({ ...previous, category: undefined }));}} disabled={updating || deleting || selectedTransaction?.is_card_payment} />
                  <MovementDate key={selectedTransaction?.id} value={editDate} onChange={setEditDate} disabled={updating || deleting} />

                  {/* NOTAS */}

                  <Text style={styles.editLabel}>
                    Notas
                  </Text>

                  <TextInput selectionColor={colors.link} cursorColor={colors.link}
                    editable={!updating && !deleting}
                    value={editNotes}
                    onChangeText={setEditNotes}
                    placeholder="Descripción del movimiento"
                    placeholderTextColor={colors.placeholder}
                    multiline
                    style={styles.editNotesInput} keyboardAppearance={colors.dark ? "dark" : "light"} />


                  {/* GUARDAR */}

                  <TouchableOpacity
                    style={themeStyle([
                    styles.modalSaveButton,
                    { backgroundColor: movementColors[editType].foreground },
                    (updating || deleting) &&
                    styles.primaryButtonDisabled], colors)
                    }
                    onPress={
                    handleUpdateMovement
                    }
                    disabled={
                    updating || deleting
                    }>

                    {updating ?
                    <ActivityIndicator
                      color={themeColor("#FFFFFF", colors)} /> :


                    <>
                        <Ionicons
                        name="checkmark-circle-outline"
                        size={21}
                        color={themeColor("#FFFFFF", colors)} />


                        <Text
                        style={
                        styles.modalSaveButtonText
                        }>

                          Guardar cambios
                        </Text>
                      </>
                    }
                  </TouchableOpacity>

                  {/* ELIMINAR */}

                  <TouchableOpacity
                    style={themeStyle([
                    styles.deleteButton,
                    (updating || deleting) &&
                    styles.primaryButtonDisabled], colors)
                    }
                    onPress={
                    handleDeleteConfirmation
                    }
                    disabled={
                    updating || deleting
                    }>

                    {deleting ?
                    <ActivityIndicator
                      color={themeColor("#D71920", colors)} /> :


                    <>
                        <Ionicons
                        name="trash-outline"
                        size={20}
                        color={themeColor("#D71920", colors)} />


                        <Text
                        style={
                        styles.deleteButtonText
                        }>

                          Eliminar movimiento
                        </Text>
                      </>
                    }
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================================================= */}
      {/* LISTO PARA TECLADO NUMÉRICO DE iPHONE */}
      {/* ================================================= */}

      {Platform.OS === 'ios' &&
      <InputAccessoryView
        nativeID={AMOUNT_ACCESSORY_ID}>

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
// MOVEMENT
// =====================================================

function Movement({
  title,
  category,
  date,
  amount,
  type,
  onPress
}) {
  const { colors, styles } = useThemeStyles(makeStyles);
  const isIncome =
  type === 'income';

  const numericAmount =
  Number(amount || 0);

  return (
    <TouchableOpacity
      style={themeStyle([styles.movementCard, { borderWidth: 1.5, borderColor: isIncome ? '#9DD4B4' : '#EFAEB5' }], colors)}
      onPress={onPress}
      activeOpacity={0.75}>

      <View style={themeStyle({ flex: 1 }, colors)}>
        <Text
          style={styles.movementTitle}
          numberOfLines={1}>

          {title}
        </Text>

        <Text style={styles.movementDate}>
          {category} · {date}
        </Text>

        <Text style={styles.editHint}>
          Toca para editar
        </Text>
      </View>

      <View style={styles.movementRight}>
        <Text
          style={themeStyle([
          styles.movementAmount,
          isIncome ?
          styles.green :
          styles.red], colors)
          }>

          {isIncome ? '+' : '-'}$
          {numericAmount.toLocaleString(
            'es-MX',
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }
          )}
        </Text>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={themeColor("#9CA3AF", colors)} />

      </View>
    </TouchableOpacity>);

}


// =====================================================
// ESTILOS
// =====================================================

const makeStyles = (colors) => StyleSheet.create({
  sectionTabs: { flexDirection: 'row', backgroundColor: '#DCE7F7', padding: 4, borderRadius: 14, marginBottom: 16 },
  sectionTab: { flex: 1, minHeight: 44, padding: 10, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  sectionTabActive: { backgroundColor: colors.primary },
  sectionTabText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  noteToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, minHeight: 44, marginBottom: 12 },
  noteToggleText: { color: colors.primary, fontSize: 14, flex: 1 },
  fieldError: { color: '#B42332', fontSize: 13, marginTop: 8, marginBottom: 8 },
  saveBar: { backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  saveActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resetButton: { width: 48, height: 52, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  saveNotice: { color: '#157347', fontSize: 13, marginBottom: 6, textAlign: 'center' },
  formHeading: { fontSize: 18, fontWeight: '600', color: colors.ink, marginBottom: 12 },
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






  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18
  },

  balanceLabel: {
    fontSize: 15,
    color: colors.muted,
    marginBottom: 8
  },

  balanceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 12
  },

  balanceRow: {
    flexDirection: 'row',
    backgroundColor:
    colors.background,
    borderRadius: 16,
    padding: 14
  },

  balanceItem: {
    flex: 1
  },

  smallLabel: {
    color: colors.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 4
  },

  income: {
    color: '#157347',
    fontSize: 16,
    fontWeight: '600'
  },

  expense: {
    color: '#B42332',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right'
  },

  separator: {
    width: 1,
    backgroundColor:
    colors.border,
    marginHorizontal: 12
  },






  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    elevation: 2
  },

  inputLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#9CA3AF',
    fontWeight: '700',
    marginBottom: 8
  },

  amountRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },

  currencySymbol: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.muted,
    marginRight: 8
  },

  amountInput: {
    flex: 1,
    fontSize: 30,
    fontWeight: '700',
    color: colors.ink
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink
  },








  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },

  optionLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#9CA3AF',
    fontWeight: '700'
  },


  notesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    minHeight: 120,
    marginBottom: 18,
    elevation: 2
  },

  notesInput: {
    marginTop: 12,
    fontSize: 15,
    color: colors.ink,
    minHeight: 52,
    textAlignVertical: 'top'
  },





  primaryButton: {
    flex: 1,
    minHeight: 52,
    justifyContent: 'center',
    backgroundColor: colors.ink,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 0
  },

  primaryButtonDisabled: {
    opacity: 0.6
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700'
  },

  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.ink
  },

  secondaryButtonText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700'
  },

  movementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },

  movementTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink
  },

  movementDate: {
    marginTop: 4,
    fontSize: 13,
    color: colors.muted
  },

  editHint: {
    marginTop: 5,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700'
  },

  movementRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    gap: 5
  },

  movementAmount: {
    fontSize: 16,
    fontWeight: '700'
  },

  green: {
    color: '#008A2E'
  },

  red: {
    color: '#B42332'
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    marginBottom: 18
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink
  },

  emptyText: {
    marginTop: 5,
    fontSize: 13,
    color: colors.muted
  },

  // =====================================================
  // MODAL
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
    paddingBottom: 38,
    maxHeight: '90%'
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18
  },

  modalTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: colors.ink
  },

  modalSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.muted
  },

  editLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#9CA3AF',
    fontWeight: '700',
    marginBottom: 8
  },


  editAmountCard: {
    backgroundColor: colors.background,
    borderRadius: 17,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },

  editCurrencySymbol: {
    fontSize: 25,
    fontWeight: '700',
    color: colors.muted,
    marginRight: 7
  },

  editAmountInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 25,
    fontWeight: '700',
    color: colors.ink
  },







  editNotesInput: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 15,
    minHeight: 85,
    fontSize: 15,
    color: colors.ink,
    textAlignVertical: 'top',
    marginBottom: 20
  },

  modalSaveButton: {
    backgroundColor: colors.ink,
    borderRadius: 17,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7
  },

  modalSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },

  deleteButton: {
    marginTop: 12,
    backgroundColor: '#FFF2F2',
    borderRadius: 17,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    borderWidth: 1,
    borderColor: '#FFD6D6'
  },

  deleteButtonText: {
    color: '#B42332',
    fontSize: 15,
    fontWeight: '700'
  },

  // =====================================================
  // TECLADO iOS
  // =====================================================

  keyboardAccessory: {
    backgroundColor: colors.background,
    borderTopWidth:
    StyleSheet.hairlineWidth,
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
