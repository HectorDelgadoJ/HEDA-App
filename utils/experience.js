export function experienceDefaults(mode = 'simple', priority = 'expenses') {
  const complete = mode === 'complete';
  return { version: 1, mode: complete ? 'complete' : 'simple', priority: ['expenses', 'payments', 'saving'].includes(priority) ? priority : 'expenses', configured: false, welcomeDone:false, tourDone:false, theme: 'light',
    widgets: { metrics: complete, cards: complete, budgets: complete, goals: complete || priority === 'saving', payments: true }, tools: { cardPayments: false } };
}
export function normalizeExperience(raw) {
  const base = experienceDefaults(raw?.mode, raw?.priority);
  if (!raw || typeof raw !== 'object' || raw.version !== 1) return base;
  return { ...base, configured: raw.configured === true, welcomeDone:raw.welcomeDone===true, tourDone:raw.tourDone===true, theme: raw.theme === 'dark' ? 'dark' : 'light', tools: { cardPayments: typeof raw.tools?.cardPayments === 'boolean' ? raw.tools.cardPayments : false }, widgets: Object.fromEntries(Object.entries(base.widgets).map(([key, fallback]) => [key, typeof raw.widgets?.[key] === 'boolean' ? raw.widgets[key] : fallback])) };
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
    || preferences.tools.cardPayments !== defaults.tools.cardPayments;
}
export function resetExperienceView(value) {
  const preferences = normalizeExperience(value), defaults = experienceDefaults(preferences.mode, preferences.priority);
  return { ...preferences, widgets: { ...defaults.widgets }, tools: { ...defaults.tools } };
}
