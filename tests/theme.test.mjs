import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const url = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const paletteSource = readFileSync(new URL('../theme/colors.js', import.meta.url), 'utf8');
const paletteUrl = url(paletteSource);
const { lightColors, darkColors } = await import(paletteUrl);
const { themeColor, themeStyle } = await import(url(readFileSync(new URL('../theme/themeStyles.js', import.meta.url), 'utf8').replace("'./colors'", JSON.stringify(paletteUrl))));
const luminance = color => {
  const values = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
};
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);

test('light appearance preserves existing style values exactly', () => {
  const original = { card: { backgroundColor: '#FFFFFF', color: '#183153', padding: 18, borderRadius: 20 } };
  assert.equal(themeStyle(original, lightColors), original);
});
test('dark surfaces, primary text, secondary text and links have readable contrast', () => {
  assert.ok(contrast(darkColors.ink, darkColors.surface) >= 7);
  assert.ok(contrast(darkColors.muted, darkColors.surface) >= 4.5);
  assert.ok(contrast(darkColors.link, darkColors.surface) >= 4.5);
  assert.ok(contrast('#FFFFFF', darkColors.primary) >= 4.5);
  assert.ok(luminance(darkColors.background) < luminance(lightColors.background));
});
test('legacy cards and inputs become dark while white action labels remain white', () => {
  const original = { card: { backgroundColor: '#FFFFFF', color: '#4B5563', borderColor: '#E2E8F0' }, button: { backgroundColor: '#2563EB', color: '#FFFFFF' } };
  const result = themeStyle(original, darkColors);
  assert.equal(result.card.backgroundColor, darkColors.surface); assert.equal(result.card.color, darkColors.muted);
  assert.equal(result.card.borderColor, darkColors.border); assert.equal(result.button.color, '#FFFFFF');
  assert.equal(result.button.backgroundColor, '#2563EB'); assert.equal(original.card.backgroundColor, '#FFFFFF');
});
test('semantic financial tones remain distinct without changing layout or numeric data', () => {
  const original = [{ color: '#B42332', backgroundColor: '#FFF0F1', height: 44 }, false, { color: '#157347', backgroundColor: '#EAF7EF', width: '80%' }];
  const result = themeStyle(original, darkColors);
  assert.equal(result[0].color, '#FDA4AF'); assert.equal(result[2].color, '#86EFAC');
  assert.notEqual(result[0].backgroundColor, result[2].backgroundColor); assert.equal(result[0].height, 44); assert.equal(result[2].width, '80%'); assert.equal(result[1], false);
});
test('theme resolution is stable when nested components receive already-themed styles', () => {
  const original = { color: '#B42332', backgroundColor: '#FFF0F1', borderColor: '#EFAEB5' };
  const once = themeStyle(original, darkColors);
  assert.deepEqual(themeStyle(once, darkColors), once);
  assert.equal(themeColor(darkColors.border, darkColors, 'borderColor'), darkColors.border);
  assert.equal(themeColor(darkColors.primary, darkColors), darkColors.link);
  assert.equal(themeColor('transparent', darkColors), 'transparent');
});

test('light explanatory labels on saturated actions keep sufficient contrast in dark mode', () => {
  const foreground = themeColor('#E0ECFF', darkColors);
  assert.ok(contrast(foreground, darkColors.primary) >= 4.5);
});


test('pale semantic backgrounds remain visibly green, red and amber rather than becoming gray cards',()=>{
 assert.equal(themeColor('#F0FDF4',darkColors,'backgroundColor'),darkColors.incomeSurface);
 assert.equal(themeColor('#FFF0F1',darkColors,'backgroundColor'),darkColors.expenseSurface);
 assert.equal(themeColor('#FFF4E5',darkColors,'backgroundColor'),darkColors.warningSurface);
 for(const [fg,bg] of [['income','incomeSurface'],['expense','expenseSurface'],['warning','warningSurface']])assert.ok(contrast(darkColors[fg],darkColors[bg])>=4.5);
});
test('input boundaries, placeholders and action labels meet contrast targets in dark mode',()=>{
 assert.ok(contrast(darkColors.inputBorder,darkColors.input)>=3);
 assert.ok(contrast(darkColors.placeholder,darkColors.input)>=4.5);
 assert.ok(contrast(darkColors.onPrimary,darkColors.primary)>=4.5);
 assert.notEqual(darkColors.input,darkColors.surface);
 for(const key of ['input','incomeSurface','expenseSurface','warningSurface'])assert.equal(themeColor(darkColors[key],darkColors,'backgroundColor'),darkColors[key]);
 assert.equal(themeColor(darkColors.placeholder,darkColors),darkColors.placeholder);
});

test('legacy named-color cards do not remain white in dark mode and labels remain readable',()=>{
 assert.equal(themeColor('white',darkColors,'backgroundColor'),darkColors.surface);
 assert.equal(themeColor('black',darkColors),darkColors.ink);
 assert.equal(themeColor('white',darkColors),'#FFFFFF');
 assert.equal(themeColor('white',lightColors,'backgroundColor'),'white');
 for(const surface of ['surface','raised','input','softBlue'])for(const foreground of ['ink','muted','link'])assert.ok(contrast(darkColors[foreground],darkColors[surface])>=4.5,`${foreground} on ${surface}`);
});
