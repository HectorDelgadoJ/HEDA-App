export const shortcutDefaults={assistant:true,education:true,finances:true,ethereum:true,reports:true,qr:true};
export const accessibilityDefaults={textScale:1,highContrast:false,boldText:false,comfortableReading:false,reduceMotion:false,largeTargets:false};
export function experienceDefaults(mode = 'simple', priority = 'expenses') {
  const complete = mode === 'complete';
  return { version: 1, mode: complete ? 'complete' : 'simple', priority: ['expenses', 'payments', 'saving'].includes(priority) ? priority : 'expenses', configured: false, welcomeDone:false, tourDone:false, theme: 'light',
    widgets: { metrics: complete, cards: complete, budgets: complete, goals: complete || priority === 'saving', payments: true }, tools: { cardPayments: false }, shortcuts:{...shortcutDefaults}, accessibility:{...accessibilityDefaults} };
}
export function normalizeExperience(raw) {
  const base = experienceDefaults(raw?.mode, raw?.priority);
  if (!raw || typeof raw !== 'object' || raw.version !== 1) return base;
  return { ...base, shortcuts:Object.fromEntries(Object.entries(shortcutDefaults).map(([key,v])=>[key,typeof raw.shortcuts?.[key]==='boolean'?raw.shortcuts[key]:v])), accessibility:{...Object.fromEntries(Object.entries(accessibilityDefaults).filter(([k])=>k!=='textScale').map(([key])=>[key,raw.accessibility?.[key]===true])),textScale:[1,1.2,1.4,2].includes(raw.accessibility?.textScale)?raw.accessibility.textScale:1}, configured: raw.configured === true, welcomeDone:raw.welcomeDone===true, tourDone:raw.tourDone===true, theme: raw.theme === 'dark' ? 'dark' : 'light', tools: { cardPayments: typeof raw.tools?.cardPayments === 'boolean' ? raw.tools.cardPayments : false }, widgets: Object.fromEntries(Object.entries(base.widgets).map(([key, fallback]) => [key, typeof raw.widgets?.[key] === 'boolean' ? raw.widgets[key] : fallback])) };
}
export function visibleCategories(options, selected, expanded) {
  if (expanded) return options;
  const visible = options.slice(0, 4);
  const chosen = options.find(([name]) => name === selected);
  if (chosen && !visible.some(([name]) => name === selected)) visible.push(chosen);
  return visible;
}

export function isCustomizedExperience(value) {
  const preferences = normalizeExperience(value);
  const defaults = experienceDefaults(preferences.mode, preferences.priority);
  return Object.keys(defaults.widgets).some(key => preferences.widgets[key] !== defaults.widgets[key])
    || preferences.tools.cardPayments !== defaults.tools.cardPayments
    || Object.keys(shortcutDefaults).some(key=>preferences.shortcuts[key]!==defaults.shortcuts[key]);
}
export function resetExperienceView(value) {
  const preferences = normalizeExperience(value), defaults = experienceDefaults(preferences.mode, preferences.priority);
  return { ...preferences, widgets: { ...defaults.widgets }, tools: { ...defaults.tools },shortcuts:{...defaults.shortcuts} };
}
