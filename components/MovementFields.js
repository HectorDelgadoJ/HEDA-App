import { useThemeStyles, themeStyle, themeColor } from "../theme/ThemeProvider";
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { categoryOptions, localDate, calendarDays } from '../utils/movementForm';

export const movementColors = {
  Ingreso: { foreground: '#157347', background: '#EAF7EF' },
  Gasto: { foreground: '#B42332', background: '#FFF0F1' }
};

export function MovementType({ value, onChange, disabled = false }) {
  const { colors, styles } = useThemeStyles(makeStyles);
  return <View style={styles.typeRow}>{['Gasto', 'Ingreso'].map((type) => {
      const palette = movementColors[type];
      const active = value === type;
      return <TouchableOpacity key={type} disabled={disabled} accessibilityRole="radio"
      accessibilityState={{ checked: active, disabled }} accessibilityLabel={type}
      onPress={() => onChange(type)}
      style={themeStyle([styles.typeButton, { borderColor: active ? palette.foreground : colors.border, backgroundColor: active ? palette.background : '#FFFFFF' }], colors)}>
      <Ionicons name={type === 'Ingreso' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} size={22} color={themeColor(palette.foreground, colors)} />
      <Text style={themeStyle([styles.typeLabel, { color: palette.foreground }], colors)}>{type}</Text>
      {active && <Ionicons name="checkmark" size={18} color={themeColor(palette.foreground, colors)} />}
    </TouchableOpacity>;
    })}</View>;
}

export function CategoryPicker({ type, value, onChange, disabled = false, options = categoryOptions(type), error }) {
  const { colors, styles } = useThemeStyles(makeStyles);
  const custom = !options.some(([label]) => label === value);
  const palette = movementColors[type];
  return <View style={styles.categorySection}>
    <View style={styles.chips}>{[...options, ['Otra', 'create-outline']].map(([label, icon]) => {
        const active = label === 'Otra' ? custom : value === label;
        return <TouchableOpacity key={label} disabled={disabled} accessibilityRole="radio"
        accessibilityState={{ checked: active, disabled }}
        onPress={() => onChange(label === 'Otra' ? '' : label)}
        style={themeStyle([styles.chip, active && { borderColor: palette.foreground, backgroundColor: palette.background }], colors)}>
        <Ionicons name={icon} size={18} color={themeColor(active ? palette.foreground : colors.muted, colors)} />
        <Text style={themeStyle([styles.chipLabel, active && { color: palette.foreground }], colors)}>{label}</Text>
      </TouchableOpacity>;
      })}</View>
    {custom && <TextInput selectionColor={colors.link} cursorColor={colors.link} accessibilityLabel="Nombre de la categoría" editable={!disabled}
    placeholder={type === 'Ingreso' ? 'Ej. Comisión, renta de un cuarto…' : 'Ej. Mascotas, reparación…'}
    placeholderTextColor={colors.placeholder} maxLength={60} value={value} onChangeText={onChange} style={styles.customInput} keyboardAppearance={colors.dark ? "dark" : "light"} />}
    {error ? <Text accessibilityLiveRegion="polite" style={themeStyle({ color: movementColors.Gasto.foreground, marginTop: 8, fontSize: 13 }, colors)}>{error}</Text> : null}
  </View>;
}

export function MovementDate({ value, onChange, disabled = false, title = 'Fecha del movimiento', initiallyOpen = false, compact = false }) {
  const { colors, styles } = useThemeStyles(makeStyles);
  const [open, setOpen] = useState(initiallyOpen);
  const [month, setMonth] = useState(() => value.slice(0, 7));
  const [year, monthNumber] = month.split('-').map(Number);
  const palette = colors.primary;
  const selectedDate = new Date(`${value}T12:00:00`);
  const label = selectedDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  function moveMonth(offset) {
    const date = new Date(year, monthNumber - 1 + offset, 1, 12);
    setMonth(localDate(date).slice(0, 7));
  }
  function choose(date) {onChange(date);setOpen(false);}
  return <View style={themeStyle([styles.dateCard, compact && { padding: 10 }], colors)}>
    <TouchableOpacity disabled={disabled} accessibilityRole="button" accessibilityLabel={`Fecha: ${label}. Cambiar fecha`}
    accessibilityState={{ expanded: open, disabled }} onPress={() => {setMonth(value.slice(0, 7));setOpen(!open);}} style={styles.dateHeader}>
      <Ionicons name="calendar-outline" size={22} color={themeColor(colors.ink, colors)} />
      <View style={themeStyle({ flex: 1 }, colors)}><Text style={styles.caption}>{title}</Text><Text style={styles.dateValue}>{compact && value === localDate() ? 'Hoy' : label}</Text></View>
      <Text style={styles.change}>Cambiar</Text>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={themeColor(palette, colors)} />
    </TouchableOpacity>
    {open && <View>
      <View style={styles.monthRow}>
        <TouchableOpacity accessibilityLabel="Mes anterior" accessibilityRole="button" onPress={() => moveMonth(-1)} style={styles.monthArrow}><Ionicons name="chevron-back" size={22} color={themeColor(colors.ink, colors)} /></TouchableOpacity>
        <Text style={styles.monthTitle}>{new Date(year, monthNumber - 1, 1, 12).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</Text>
        <TouchableOpacity accessibilityLabel="Mes siguiente" accessibilityRole="button" onPress={() => moveMonth(1)} style={styles.monthArrow}><Ionicons name="chevron-forward" size={22} color={themeColor(colors.ink, colors)} /></TouchableOpacity>
      </View>
      <View style={styles.grid}>{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => <Text key={i} style={styles.weekday}>{day}</Text>)}</View>
      <View style={styles.grid}>{calendarDays(year, monthNumber).map((day, i) => day === null ?
        <View key={`empty-${i}`} style={styles.day} /> :
        <TouchableOpacity key={day} accessibilityRole="button" accessibilityState={{ selected: value === `${month}-${String(day).padStart(2, '0')}` }}
        accessibilityLabel={`${day} de ${new Date(year, monthNumber - 1, 1, 12).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`}
        onPress={() => choose(`${month}-${String(day).padStart(2, '0')}`)}
        style={themeStyle([styles.day, value === `${month}-${String(day).padStart(2, '0')}` && { backgroundColor: palette }], colors)}>
          <Text style={themeStyle({ color: value === `${month}-${String(day).padStart(2, '0')}` ? '#FFFFFF' : colors.ink, fontSize: 15 }, colors)}>{day}</Text>
        </TouchableOpacity>)}</View>
      <TouchableOpacity accessibilityRole="button" onPress={() => choose(localDate())} style={styles.today}><Text style={styles.change}>Usar hoy</Text></TouchableOpacity>
    </View>}
  </View>;
}

const makeStyles = (colors) => StyleSheet.create({
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeButton: { flex: 1, minHeight: 52, padding: 10, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  typeLabel: { fontSize: 16, fontWeight: '600' },
  categorySection: { marginBottom: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 7 },
  chipLabel: { color: colors.ink, fontSize: 13, fontWeight: '500' },
  customInput: { marginTop: 10, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, padding: 14, minHeight: 48, backgroundColor: colors.input, color: colors.ink, fontSize: 15 },
  dateCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  dateHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  caption: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  dateValue: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  change: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  monthArrow: { padding: 10, minWidth: 44, minHeight: 44 },
  monthTitle: { fontSize: 15, fontWeight: '600', color: colors.ink, textTransform: 'capitalize' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', textAlign: 'center', paddingVertical: 8, fontSize: 12, color: colors.muted },
  day: { width: '14.2857%', minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  today: { alignItems: 'center', padding: 12, minHeight: 44, marginTop: 8 }
});
