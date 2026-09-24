import React, { useCallback, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Keyboard,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Platform,
  InputAccessoryView,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { supabase } from '../services/supabase';

const AMOUNT_ACCESSORY_ID = 'expensesAmountKeyboardAccessory';

export default function ExpensesScreen() {
  // =====================================================
  // FORMULARIO NUEVO MOVIMIENTO
  // =====================================================

  const [type, setType] = useState('Gasto');
  const [selectedCategory, setSelectedCategory] =
    useState('Comida');

  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  // =====================================================
  // MOVIMIENTOS
  // =====================================================

  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.log(
          'Error obteniendo usuario:',
          userError.message
        );

        return;
      }

      if (!user) {
        return;
      }

      const { data, error } = await supabase
        .from('transactions')
        .select(
          'id, type, amount, category, description, transaction_date, created_at'
        )
        .eq('user_id', user.id)
        .order('transaction_date', {
          ascending: false,
        })
        .order('created_at', {
          ascending: false,
        });

      if (error) {
        console.log(
          'Error cargando movimientos:',
          error.message
        );

        Alert.alert(
          'Error',
          'No se pudieron cargar tus movimientos.'
        );

        return;
      }

      setTransactions(data || []);
    } catch (error) {
      console.log(
        'Error inesperado cargando movimientos:',
        error
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // REGISTRAR MOVIMIENTO
  // =====================================================

  async function handleRegisterMovement() {
    Keyboard.dismiss();

    const cleanAmount = amount
      .trim()
      .replace(',', '.');

    const numericAmount = Number(cleanAmount);

    if (
      !cleanAmount ||
      Number.isNaN(numericAmount) ||
      numericAmount <= 0
    ) {
      Alert.alert(
        'Monto inválido',
        'Ingresa un monto mayor a cero.'
      );

      return;
    }

    if (!selectedCategory) {
      Alert.alert(
        'Categoría requerida',
        'Selecciona una categoría.'
      );

      return;
    }

    try {
      setSaving(true);

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

      const transactionType =
        type === 'Ingreso'
          ? 'income'
          : 'expense';

      const today = getLocalDateString();

      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: transactionType,
          amount: numericAmount,
          category: selectedCategory,
          description: notes.trim() || null,
          transaction_date: today,
        });

      if (error) {
        console.log(
          'Error registrando movimiento:',
          error.message
        );

        Alert.alert(
          'Error',
          'No se pudo registrar el movimiento.'
        );

        return;
      }

      setAmount('');
      setNotes('');

      await loadTransactions();

      Alert.alert(
        'Movimiento registrado',
        type === 'Ingreso'
          ? 'El ingreso fue registrado correctamente.'
          : 'El gasto fue registrado correctamente.'
      );
    } catch (error) {
      console.log(
        'Error inesperado registrando movimiento:',
        error
      );

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

    setEditType(
      transaction.type === 'income'
        ? 'Ingreso'
        : 'Gasto'
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

    const cleanAmount = editAmount
      .trim()
      .replace(',', '.');

    const numericAmount = Number(cleanAmount);

    if (
      !cleanAmount ||
      Number.isNaN(numericAmount) ||
      numericAmount <= 0
    ) {
      Alert.alert(
        'Monto inválido',
        'Ingresa un monto mayor a cero.'
      );

      return;
    }

    if (!editCategory) {
      Alert.alert(
        'Categoría requerida',
        'Selecciona una categoría.'
      );

      return;
    }

    try {
      setUpdating(true);

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

      const transactionType =
        editType === 'Ingreso'
          ? 'income'
          : 'expense';

      const { error } = await supabase
        .from('transactions')
        .update({
          type: transactionType,
          amount: numericAmount,
          category: editCategory,
          description: editNotes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTransaction.id)
        .eq('user_id', user.id);

      if (error) {
        console.log(
          'Error actualizando movimiento:',
          error.message
        );

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

      await loadTransactions();

      Alert.alert(
        'Movimiento actualizado',
        'Los cambios se guardaron correctamente.'
      );
    } catch (error) {
      console.log(
        'Error inesperado actualizando movimiento:',
        error
      );

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
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: handleDeleteMovement,
        },
      ]
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
        .from('transactions')
        .delete()
        .eq('id', selectedTransaction.id)
        .eq('user_id', user.id);

      if (error) {
        console.log(
          'Error eliminando movimiento:',
          error.message
        );

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

      await loadTransactions();

      Alert.alert(
        'Movimiento eliminado',
        'El movimiento fue eliminado correctamente.'
      );
    } catch (error) {
      console.log(
        'Error inesperado eliminando movimiento:',
        error
      );

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
    setType('Gasto');
    setSelectedCategory('Comida');
  }

  // =====================================================
  // CÁLCULOS
  // =====================================================

  const totalIncome = transactions
    .filter(
      (transaction) =>
        transaction.type === 'income'
    )
    .reduce(
      (total, transaction) =>
        total + Number(transaction.amount),
      0
    );

  const totalExpenses = transactions
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
  // FECHA LOCAL
  // =====================================================

  function getLocalDateString() {
    const date = new Date();

    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      date.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // =====================================================
  // FORMATO MONEDA
  // =====================================================

  function formatCurrency(value) {
    const number = Number(value || 0);

    return number.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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
        year: 'numeric',
      }
    );
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
              HEDA
            </Text>

            <Text style={styles.subtitle}>
              Registro de movimientos
            </Text>
          </View>

          <TouchableOpacity
            style={styles.notificationButton}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color="#062B5F"
            />
          </TouchableOpacity>
        </View>

        {/* BALANCE */}

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>
            Balance
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

        {/* TIPO */}

        <View style={styles.switchContainer}>
          <TouchableOpacity
            style={[
              styles.switchButton,
              type === 'Gasto' &&
                styles.switchButtonActive,
            ]}
            onPress={() => setType('Gasto')}
          >
            <Text
              style={[
                styles.switchText,
                type === 'Gasto' &&
                  styles.switchTextActive,
              ]}
            >
              Gasto
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.switchButton,
              type === 'Ingreso' &&
                styles.switchButtonActive,
            ]}
            onPress={() => setType('Ingreso')}
          >
            <Text
              style={[
                styles.switchText,
                type === 'Ingreso' &&
                  styles.switchTextActive,
              ]}
            >
              Ingreso
            </Text>
          </TouchableOpacity>
        </View>

        {/* MONTO */}

        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>
            Monto
          </Text>

          <View style={styles.amountRow}>
            <Text style={styles.currencySymbol}>
              $
            </Text>

            <TextInput
              placeholder="0.00"
              placeholderTextColor="#C7CDD6"
              keyboardType="decimal-pad"
              inputAccessoryViewID={
                Platform.OS === 'ios'
                  ? AMOUNT_ACCESSORY_ID
                  : undefined
              }
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
            />
          </View>
        </View>

        {/* CATEGORÍAS */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Categoría
          </Text>
        </View>

        <View style={styles.categoryRow}>
          <Category
            icon="fast-food-outline"
            label="Comida"
            active={
              selectedCategory === 'Comida'
            }
            onPress={() =>
              setSelectedCategory('Comida')
            }
          />

          <Category
            icon="bag-outline"
            label="Compras"
            active={
              selectedCategory === 'Compras'
            }
            onPress={() =>
              setSelectedCategory('Compras')
            }
          />

          <Category
            icon="car-outline"
            label="Transporte"
            active={
              selectedCategory ===
              'Transporte'
            }
            onPress={() =>
              setSelectedCategory(
                'Transporte'
              )
            }
          />

          <Category
            icon="home-outline"
            label="Hogar"
            active={
              selectedCategory === 'Hogar'
            }
            onPress={() =>
              setSelectedCategory('Hogar')
            }
          />
        </View>

        {/* FECHA */}

        <View style={styles.optionCard}>
          <View style={styles.optionLeft}>
            <Ionicons
              name="calendar-outline"
              size={22}
              color="#062B5F"
            />

            <View>
              <Text style={styles.optionLabel}>
                Fecha
              </Text>

              <Text style={styles.optionValue}>
                {formatDate(
                  getLocalDateString()
                )}
              </Text>
            </View>
          </View>
        </View>

        {/* NOTAS */}

        <View style={styles.notesCard}>
          <View style={styles.optionLeft}>
            <Ionicons
              name="menu-outline"
              size={22}
              color="#062B5F"
            />

            <Text style={styles.optionLabel}>
              Notas
            </Text>
          </View>

          <TextInput
            placeholder="¿Para qué fue este movimiento?"
            placeholderTextColor="#C7CDD6"
            multiline
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* HEDA PREDICTIVO */}

        <View style={styles.aiCard}>
          <View style={styles.aiIcon}>
            <Ionicons
              name="sparkles"
              size={20}
              color="#0A84FF"
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>
              HEDA Predictivo
            </Text>

            <Text style={styles.cardText}>
              Registra tus movimientos para que
              HEDA pueda analizar tus hábitos
              financieros y generar
              recomendaciones.
            </Text>
          </View>
        </View>

        {/* REGISTRAR */}

        <TouchableOpacity
          style={[
            styles.primaryButton,
            saving &&
              styles.primaryButtonDisabled,
          ]}
          onPress={handleRegisterMovement}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <Text
              style={styles.primaryButtonText}
            >
              Registrar movimiento
            </Text>
          )}
        </TouchableOpacity>

        {/* LIMPIAR */}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleCancel}
          disabled={saving}
        >
          <Text
            style={styles.secondaryButtonText}
          >
            Limpiar
          </Text>
        </TouchableOpacity>

        {/* MOVIMIENTOS */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Movimientos recientes
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#0A84FF"
            style={{
              marginVertical: 25,
            }}
          />
        ) : transactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="wallet-outline"
              size={32}
              color="#9CA3AF"
            />

            <Text style={styles.emptyTitle}>
              Sin movimientos
            </Text>

            <Text style={styles.emptyText}>
              Registra tu primer ingreso o gasto.
            </Text>
          </View>
        ) : (
          transactions.map(
            (transaction) => (
              <Movement
                key={transaction.id}
                title={
                  transaction.description ||
                  transaction.category
                }
                category={
                  transaction.category
                }
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
                }
              />
            )
          )
        )}
      </ScrollView>

      {/* ================================================= */}
      {/* MODAL EDITAR MOVIMIENTO */}
      {/* ================================================= */}

      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeEditModal}
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
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>
                      Editar movimiento
                    </Text>

                    {selectedTransaction && (
                      <Text
                        style={
                          styles.modalSubtitle
                        }
                      >
                        {formatDate(
                          selectedTransaction.transaction_date
                        )}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={closeEditModal}
                    disabled={
                      updating || deleting
                    }
                  >
                    <Ionicons
                      name="close"
                      size={26}
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
                  {/* TIPO */}

                  <Text style={styles.editLabel}>
                    Tipo
                  </Text>

                  <View
                    style={
                      styles.editSwitchContainer
                    }
                  >
                    <TouchableOpacity
                      style={[
                        styles.switchButton,
                        editType === 'Gasto' &&
                          styles.switchButtonActive,
                      ]}
                      onPress={() =>
                        setEditType('Gasto')
                      }
                    >
                      <Text
                        style={[
                          styles.switchText,
                          editType === 'Gasto' &&
                            styles.switchTextActive,
                        ]}
                      >
                        Gasto
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.switchButton,
                        editType === 'Ingreso' &&
                          styles.switchButtonActive,
                      ]}
                      onPress={() =>
                        setEditType('Ingreso')
                      }
                    >
                      <Text
                        style={[
                          styles.switchText,
                          editType === 'Ingreso' &&
                            styles.switchTextActive,
                        ]}
                      >
                        Ingreso
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* MONTO */}

                  <Text style={styles.editLabel}>
                    Monto
                  </Text>

                  <View
                    style={styles.editAmountCard}
                  >
                    <Text
                      style={
                        styles.editCurrencySymbol
                      }
                    >
                      $
                    </Text>

                    <TextInput
                      value={editAmount}
                      onChangeText={setEditAmount}
                      keyboardType="decimal-pad"
                      inputAccessoryViewID={
                        Platform.OS === 'ios'
                          ? AMOUNT_ACCESSORY_ID
                          : undefined
                      }
                      placeholder="0.00"
                      placeholderTextColor="#C7CDD6"
                      style={styles.editAmountInput}
                    />
                  </View>

                  {/* CATEGORÍA */}

                  <Text style={styles.editLabel}>
                    Categoría
                  </Text>

                  <View
                    style={
                      styles.editCategoryRow
                    }
                  >
                    <EditCategory
                      icon="fast-food-outline"
                      label="Comida"
                      active={
                        editCategory === 'Comida'
                      }
                      onPress={() =>
                        setEditCategory('Comida')
                      }
                    />

                    <EditCategory
                      icon="bag-outline"
                      label="Compras"
                      active={
                        editCategory ===
                        'Compras'
                      }
                      onPress={() =>
                        setEditCategory(
                          'Compras'
                        )
                      }
                    />

                    <EditCategory
                      icon="car-outline"
                      label="Transporte"
                      active={
                        editCategory ===
                        'Transporte'
                      }
                      onPress={() =>
                        setEditCategory(
                          'Transporte'
                        )
                      }
                    />

                    <EditCategory
                      icon="home-outline"
                      label="Hogar"
                      active={
                        editCategory === 'Hogar'
                      }
                      onPress={() =>
                        setEditCategory('Hogar')
                      }
                    />
                  </View>

                  {/* NOTAS */}

                  <Text style={styles.editLabel}>
                    Notas
                  </Text>

                  <TextInput
                    value={editNotes}
                    onChangeText={setEditNotes}
                    placeholder="Descripción del movimiento"
                    placeholderTextColor="#C7CDD6"
                    multiline
                    style={styles.editNotesInput}
                  />

                  {/* GUARDAR */}

                  <TouchableOpacity
                    style={[
                      styles.modalSaveButton,
                      (updating || deleting) &&
                        styles.primaryButtonDisabled,
                    ]}
                    onPress={
                      handleUpdateMovement
                    }
                    disabled={
                      updating || deleting
                    }
                  >
                    {updating ? (
                      <ActivityIndicator
                        color="#FFFFFF"
                      />
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={21}
                          color="#FFFFFF"
                        />

                        <Text
                          style={
                            styles.modalSaveButtonText
                          }
                        >
                          Guardar cambios
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* ELIMINAR */}

                  <TouchableOpacity
                    style={[
                      styles.deleteButton,
                      (updating || deleting) &&
                        styles.primaryButtonDisabled,
                    ]}
                    onPress={
                      handleDeleteConfirmation
                    }
                    disabled={
                      updating || deleting
                    }
                  >
                    {deleting ? (
                      <ActivityIndicator
                        color="#D71920"
                      />
                    ) : (
                      <>
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color="#D71920"
                        />

                        <Text
                          style={
                            styles.deleteButtonText
                          }
                        >
                          Eliminar movimiento
                        </Text>
                      </>
                    )}
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

      {Platform.OS === 'ios' && (
        <InputAccessoryView
          nativeID={AMOUNT_ACCESSORY_ID}
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
// CATEGORY
// =====================================================

function Category({
  icon,
  label,
  active,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={styles.categoryItem}
      onPress={onPress}
    >
      <View
        style={[
          styles.categoryIcon,
          active &&
            styles.categoryIconActive,
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={
            active
              ? '#0A84FF'
              : '#6B7280'
          }
        />
      </View>

      <Text
        style={[
          styles.categoryLabel,
          active &&
            styles.categoryLabelActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}


// =====================================================
// EDIT CATEGORY
// =====================================================

function EditCategory({
  icon,
  label,
  active,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={styles.editCategoryItem}
      onPress={onPress}
    >
      <View
        style={[
          styles.editCategoryIcon,
          active &&
            styles.editCategoryIconActive,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={
            active
              ? '#0A84FF'
              : '#6B7280'
          }
        />
      </View>

      <Text
        style={[
          styles.editCategoryLabel,
          active &&
            styles.editCategoryLabelActive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
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
  onPress,
}) {
  const isIncome =
    type === 'income';

  const numericAmount =
    Number(amount || 0);

  return (
    <TouchableOpacity
      style={styles.movementCard}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={styles.movementTitle}
          numberOfLines={1}
        >
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
          style={[
            styles.movementAmount,
            isIncome
              ? styles.green
              : styles.red,
          ]}
        >
          {isIncome ? '+' : '-'}$
          {numericAmount.toLocaleString(
            'es-MX',
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }
          )}
        </Text>

        <Ionicons
          name="chevron-forward"
          size={18}
          color="#9CA3AF"
        />
      </View>
    </TouchableOpacity>
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

  balanceCard: {
    backgroundColor: '#0A84FF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 22,
  },

  balanceLabel: {
    fontSize: 15,
    color: '#DCEEFF',
    marginBottom: 8,
  },

  balanceAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 20,
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
    fontWeight: '800',
  },

  expense: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
  },

  separator: {
    width: 1,
    backgroundColor:
      'rgba(255,255,255,0.25)',
    marginHorizontal: 12,
  },

  switchContainer: {
    backgroundColor: '#EAF1F8',
    flexDirection: 'row',
    borderRadius: 18,
    padding: 5,
    marginBottom: 18,
  },

  switchButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
  },

  switchButtonActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },

  switchText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '800',
  },

  switchTextActive: {
    color: '#062B5F',
  },

  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 22,
    elevation: 2,
  },

  inputLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#9CA3AF',
    fontWeight: '900',
    marginBottom: 8,
  },

  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  currencySymbol: {
    fontSize: 32,
    fontWeight: '900',
    color: '#6B7280',
    marginRight: 8,
  },

  amountInput: {
    flex: 1,
    fontSize: 34,
    fontWeight: '900',
    color: '#062B5F',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#062B5F',
  },

  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  categoryItem: {
    alignItems: 'center',
    width: '23%',
  },

  categoryIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    elevation: 2,
  },

  categoryIconActive: {
    backgroundColor: '#EAF4FF',
    borderWidth: 1,
    borderColor: '#0A84FF',
  },

  categoryLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '700',
  },

  categoryLabelActive: {
    color: '#062B5F',
  },

  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  optionLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#9CA3AF',
    fontWeight: '900',
  },

  optionValue: {
    marginTop: 4,
    fontSize: 15,
    color: '#062B5F',
    fontWeight: '700',
  },

  notesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    minHeight: 120,
    marginBottom: 18,
    elevation: 2,
  },

  notesInput: {
    marginTop: 12,
    fontSize: 15,
    color: '#062B5F',
    minHeight: 60,
    textAlignVertical: 'top',
  },

  aiCard: {
    flexDirection: 'row',
    backgroundColor: '#EAF4FF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 22,
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

  cardTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#062B5F',
    marginBottom: 6,
  },

  cardText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },

  primaryButton: {
    backgroundColor: '#062B5F',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },

  primaryButtonDisabled: {
    opacity: 0.6,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },

  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#062B5F',
  },

  secondaryButtonText: {
    color: '#062B5F',
    fontSize: 16,
    fontWeight: '900',
  },

  movementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  movementTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#062B5F',
  },

  movementDate: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
  },

  editHint: {
    marginTop: 5,
    fontSize: 11,
    color: '#0A84FF',
    fontWeight: '700',
  },

  movementRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    gap: 5,
  },

  movementAmount: {
    fontSize: 16,
    fontWeight: '900',
  },

  green: {
    color: '#008A2E',
  },

  red: {
    color: '#D71920',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 18,
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: '900',
    color: '#062B5F',
  },

  emptyText: {
    marginTop: 5,
    fontSize: 13,
    color: '#6B7280',
  },

  // =====================================================
  // MODAL
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
    paddingBottom: 38,
    maxHeight: '90%',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  modalTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#062B5F',
  },

  modalSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
  },

  editLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#9CA3AF',
    fontWeight: '900',
    marginBottom: 8,
  },

  editSwitchContainer: {
    backgroundColor: '#EAF1F8',
    flexDirection: 'row',
    borderRadius: 18,
    padding: 5,
    marginBottom: 20,
  },

  editAmountCard: {
    backgroundColor: '#F4F7FB',
    borderRadius: 17,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  editCurrencySymbol: {
    fontSize: 25,
    fontWeight: '900',
    color: '#6B7280',
    marginRight: 7,
  },

  editAmountInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 25,
    fontWeight: '900',
    color: '#062B5F',
  },

  editCategoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  editCategoryItem: {
    width: '23%',
    alignItems: 'center',
  },

  editCategoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#F4F7FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },

  editCategoryIconActive: {
    backgroundColor: '#EAF4FF',
    borderWidth: 1,
    borderColor: '#0A84FF',
  },

  editCategoryLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '700',
  },

  editCategoryLabelActive: {
    color: '#062B5F',
    fontWeight: '900',
  },

  editNotesInput: {
    backgroundColor: '#F4F7FB',
    borderRadius: 16,
    padding: 15,
    minHeight: 85,
    fontSize: 15,
    color: '#062B5F',
    textAlignVertical: 'top',
    marginBottom: 20,
  },

  modalSaveButton: {
    backgroundColor: '#062B5F',
    borderRadius: 17,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  modalSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
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
    borderColor: '#FFD6D6',
  },

  deleteButtonText: {
    color: '#D71920',
    fontSize: 15,
    fontWeight: '900',
  },

  // =====================================================
  // TECLADO iOS
  // =====================================================

  keyboardAccessory: {
    backgroundColor: '#F4F7FB',
    borderTopWidth:
      StyleSheet.hairlineWidth,
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