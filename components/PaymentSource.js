import {Text, TouchableOpacity} from './AccessiblePrimitives';
import { useThemeStyles, themeStyle, themeColor } from "../theme/ThemeProvider";
import {View, StyleSheet} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
export default function PaymentSource({ cards, value, onChange, disabled, onManage }) {
  const { colors, styles } = useThemeStyles(makeStyles);
  const choices = [{ id: null, name: 'Mi saldo' }, ...cards.filter((card) => card.ledger_enabled)];
  return <View style={styles.container}>
    <Text style={styles.label}>¿Cómo lo pagas?</Text>
    <View style={styles.row}>{choices.map((card) => <TouchableOpacity key={card.id || 'cash'} accessibilityRole="radio" accessibilityState={{ checked: value === card.id, disabled }} disabled={disabled} onPress={() => onChange(card.id)} style={themeStyle([styles.button, value === card.id && styles.selected], colors)}>
      <Ionicons accessible={false} name={card.id ? 'card-outline' : 'wallet-outline'} size={18} color={themeColor(colors.primary, colors)} /><Text style={styles.text}>{card.name}</Text>
    </TouchableOpacity>)}</View>
    {value && !choices.some((card) => card.id === value) && <Text style={styles.error}>La tarjeta ya no está disponible. Elige dónde registrar este gasto.</Text>}
    <Text style={styles.caption}>{value ? 'Aumenta la deuda de esta tarjeta. Tu saldo cambia cuando la pagas.' : 'Se descuenta directamente de tu saldo disponible.'}</Text>
    {onManage && <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onManage} style={styles.manage}><Text style={styles.text}>Administrar tarjetas</Text></TouchableOpacity>}
  </View>;
}
const makeStyles = (colors) => StyleSheet.create({ container: { marginBottom: 16 }, label: { color: colors.ink, fontSize: 15, fontWeight: '600', marginBottom: 8 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, button: { minHeight: 44, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 7 }, selected: { borderColor: colors.primary, backgroundColor: colors.softBlue }, text: { color: colors.primary, fontSize: 13, fontWeight: '600' }, caption: { marginTop: 8, color: colors.muted, fontSize: 12, lineHeight: 18 }, error: { color: '#B42332', fontSize: 13 }, manage: { paddingVertical: 10, minHeight: 44 } });
