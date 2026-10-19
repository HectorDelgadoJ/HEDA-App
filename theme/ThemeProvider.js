import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { Appearance, Platform } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { lightColors, darkColors } from './colors';
import { themeStyle } from './themeStyles';
export { themeStyle, themeColor } from './themeStyles';
const ThemeContext = createContext(lightColors);
export default function ThemeProvider({ theme = 'light', children }) {
  const palette = theme === 'dark' ? darkColors : lightColors;
  useEffect(() => {
    if(Platform.OS==='web'){document.documentElement.style.colorScheme=theme;document.body.style.backgroundColor=palette.background;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',palette.background);return;}
    Appearance.setColorScheme(theme);
    void SystemUI.setBackgroundColorAsync(palette.background).catch(() => {});
    return () => Appearance.setColorScheme(null);
  }, [theme, palette]);
  return <ThemeContext.Provider value={palette}><StatusBar style={palette.dark ? 'light' : 'dark'} />{children}</ThemeContext.Provider>;
}
export function useThemeStyles(makeStyles) {
  const colors = useContext(ThemeContext);
  const styles = useMemo(() => makeStyles ? themeStyle(makeStyles(colors), colors) : {}, [colors, makeStyles]);
  return { colors, styles };
}
