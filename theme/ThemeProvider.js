import AccessibilityProvider from '../components/AccessibilityContext';
import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { Appearance, Platform } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { lightColors, darkColors } from './colors';
import { themeStyle } from './themeStyles';
export { themeStyle, themeColor } from './themeStyles';
const ThemeContext = createContext(lightColors);
export default function ThemeProvider({ theme = 'light', accessibility, children }) {
  const palette=useMemo(()=>{const base=theme==='dark'?darkColors:lightColors;return accessibility?.highContrast?{...base,ink:base.dark?'#FFFFFF':'#10243A',muted:base.dark?'#DFE7F2':'#374151',link:base.dark?'#B9DCFF':'#124B9D',inputBorder:base.dark?'#B0C4DE':'#52657B',border:base.dark?'#91A7C2':'#52657B'}:base;},[theme,accessibility?.highContrast]);
  useEffect(() => {
    if(Platform.OS==='web'){document.documentElement.style.colorScheme=theme;document.body.style.backgroundColor=palette.background;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',palette.background);return;}
    Appearance.setColorScheme(theme);
    void SystemUI.setBackgroundColorAsync(palette.background).catch(() => {});
    return () => Appearance.setColorScheme(null);
  }, [theme, palette]);
  return <AccessibilityProvider options={accessibility}><ThemeContext.Provider value={palette}><StatusBar style={palette.dark ? 'light' : 'dark'} />{children}</ThemeContext.Provider></AccessibilityProvider>;
}
export function useThemeStyles(makeStyles) {
  const colors = useContext(ThemeContext);
  const styles = useMemo(() => makeStyles ? themeStyle(makeStyles(colors), colors) : {}, [colors, makeStyles]);
  return { colors, styles };
}
