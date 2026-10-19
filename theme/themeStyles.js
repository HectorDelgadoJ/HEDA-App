import { lightColors } from './colors';
function rgb(value) {
  if (typeof value !== 'string') return null;
  let hex = value.trim().replace('#', '');
  if (!value.startsWith('#') || !/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null;
  if (hex.length === 3) hex = [...hex].map(char => char + char).join('');
  return [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16));
}
function family([r, g, b], soft = false) {
  if(soft && Math.max(r,g,b)-Math.min(r,g,b)>=12){
    if(r>b+15&&g>b+10&&Math.abs(r-g)<60)return 'amber';
    if(g>r+6&&g>b+5)return 'green';
    if(r>g+6&&r>b-5)return 'red';
    if(b>g+6&&r>g+6)return 'purple';
    if(b>r+6)return 'blue';
  }
  if (Math.max(r, g, b) - Math.min(r, g, b) < 40) return 'neutral';
  if (r > b + 20 && g > b + 15 && Math.abs(r - g) < 90) return 'amber';
  if (g > r + 15 && g > b - 15) return 'green';
  if (r > g + 20 && r > b - 10) return 'red';
  if (b > g + 15 && r > g + 10) return 'purple';
  return 'blue';
}
// Resolves legacy literal colors as well as semantic palette tokens. Layout/values are untouched.
export function themeColor(value, palette, property = 'color') {
  if (!palette.dark) return value;
  if(typeof value==='string')value=({white:'#FFFFFF',black:'#000000'})[value.toLowerCase()]||value;
  const channels = rgb(value);
  if (!channels) return value;
  const normalized = value.toLowerCase();
  const kind = family(channels,property!=='color'), average = channels.reduce((a, b) => a + b) / 3;
  if (property === 'color') {
    if(['ink','muted','link','placeholder','onPrimary','income','expense','warning'].some(key=>palette[key]?.toLowerCase()===normalized))return value;
    if (['#fff', '#ffffff'].includes(normalized)) return value; // text on colored actions
    if ([palette.ink, palette.muted, palette.link].some(color => color.toLowerCase() === normalized)) return value;
    if ([palette.primary, lightColors.primary].some(color => color.toLowerCase() === normalized)) return palette.link;
    if (average > 215 && Math.min(...channels) > 180) return '#FFFFFF';
    if (kind === 'neutral') return average < 65 ? palette.ink : palette.muted;
    return { red: '#FDA4AF', green: '#86EFAC', amber: '#FCD34D', purple: '#D8B4FE', blue: palette.link }[kind];
  }
  if (property.toLowerCase().includes('border')) {
    if(normalized===lightColors.border.toLowerCase())return palette.border;
    if(normalized===palette.inputBorder.toLowerCase())return value;
    if ([palette.primary, lightColors.primary].some(color => color.toLowerCase() === normalized)) return palette.link;
    if ([palette.border, palette.headerBorder, '#784552', '#376B55', '#75602C', '#665080'].some(color => color.toLowerCase() === normalized)) return value;
    if (average < 110) return kind === 'neutral' ? palette.border : themeColor(value, palette);
    return { neutral: palette.border, red: '#784552', green: '#376B55', amber: '#75602C', purple: '#665080', blue: palette.headerBorder }[kind];
  }
  if (property === 'backgroundColor') {
    if(['surface','raised','softBlue','input','incomeSurface','expenseSurface','warningSurface','headerBackground'].some(key=>palette[key]?.toLowerCase()===normalized))return value;
    if (normalized === lightColors.background.toLowerCase()) return palette.background;
    if (average < 170) return value; // retain saturated action colors and dark overlays
    if (kind === 'neutral') return average > 245 ? palette.surface : palette.raised;
    return { red: '#3A1E2B', green: '#173529', amber: '#372F1D', purple: '#302341', blue: palette.softBlue }[kind];
  }
  return value;
}
export function themeStyle(style, palette) {
  if (!palette.dark || !style || typeof style !== 'object') return style;
  if (Array.isArray(style)) return style.map(item => themeStyle(item, palette));
  return Object.fromEntries(Object.entries(style).map(([key, value]) => [key,
    typeof value === 'string' && (key === 'color' || key === 'backgroundColor' || key.toLowerCase().includes('border') && key.endsWith('Color'))
      ? themeColor(value, palette, key) : typeof value === 'object' && value !== null ? themeStyle(value, palette) : value]));
}
