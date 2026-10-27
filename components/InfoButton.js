import {TouchableOpacity} from './AccessiblePrimitives';
import {Alert} from '../services/alerts';
import { useThemeStyles, themeStyle, themeColor } from "../theme/ThemeProvider";
import React from 'react';
import {Keyboard, StyleSheet} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

// Only secondary explanations belong here. Keep decisions, errors and consent visible.
export default function InfoButton({ title = 'Más información', text, style }) {
  const { colors, styles } = useThemeStyles(makeStyles);
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Información: ${title}`} accessibilityHint="Abre una explicación. No realiza cambios." style={themeStyle([styles.button, style], colors)} onPress={() => {
    Keyboard.dismiss();
    Alert.alert(title, text, [{ text: 'Entendido', style: 'cancel' }], { cancelable: true });
  }}>
    <Ionicons accessible={false} name="information-circle" size={25} color={themeColor(colors.primary, colors)} />
  </TouchableOpacity>;
}
const makeStyles = (colors) => StyleSheet.create({ button: { width: 44, height: 44, alignSelf: 'flex-end', alignItems: 'center', justifyContent: 'center', borderRadius: 22 } });
