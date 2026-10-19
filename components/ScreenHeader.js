import HedaBrand from './HedaBrand';
import { useThemeStyles, themeStyle, themeColor } from "../theme/ThemeProvider";
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';

export default function ScreenHeader({ title, subtitle, icon, actionIcon, actionLabel, onAction }) {
  const { colors, styles } = useThemeStyles(makeStyles);
  return <View style={styles.header}>
    <View style={styles.identity}>
      <Text style={styles.brand}>HEDA · TUS FINANZAS</Text>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
    {onAction ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} style={styles.icon}>
      <Ionicons name={actionIcon} size={24} color={themeColor(colors.primary, colors)} />
    </TouchableOpacity> : <View style={styles.icon}><Ionicons name={icon} size={24} color={themeColor(colors.primary, colors)} /></View>}
  </View>;
}

const makeStyles = (colors) => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.headerBackground, borderWidth: 1, borderColor: colors.headerBorder, borderRadius: layout.headerRadius, padding: 16, marginTop: 2, marginBottom: layout.sectionGap },
  identity: { flex: 1, minWidth: 0 },
  brand: { color: colors.primary, fontSize: 9, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 },
  title: { color: colors.ink, fontSize: layout.titleSize, fontWeight: '700', letterSpacing: -0.6 },
  subtitle: { color: colors.muted, fontSize: layout.subtitleSize, lineHeight: 19, marginTop: 5 },
  icon: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }
});
