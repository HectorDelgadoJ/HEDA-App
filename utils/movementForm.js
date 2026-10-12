export function categoryOptions(type) {
  return type === 'Ingreso' ? [
    ['Salario', 'briefcase-outline'], ['Venta', 'pricetag-outline'],
    ['Trabajo extra', 'construct-outline'], ['Regalo', 'gift-outline'],
    ['Rendimientos', 'trending-up-outline'], ['Reembolso', 'return-down-back-outline'],
  ] : [
    ['Comida', 'fast-food-outline'], ['Compras', 'bag-outline'],
    ['Transporte', 'car-outline'], ['Hogar', 'home-outline'],
    ['Servicios', 'receipt-outline'], ['Salud', 'medkit-outline'],
    ['Educación', 'school-outline'], ['Entretenimiento', 'game-controller-outline'],
  ];
}

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Monday-first grid; date-only strings are never converted through UTC.
export function calendarDays(year, month) {
  const offset = (new Date(year, month - 1, 1, 12).getDay() + 6) % 7;
  const length = new Date(year, month, 0, 12).getDate();
  return [...Array(offset).fill(null), ...Array.from({ length }, (_, i) => i + 1)];
}

export function rankedCategories(type, transactions) {
  const options = categoryOptions(type);
  const counts = new Map();
  const transactionType = type === 'Ingreso' ? 'income' : 'expense';
  for (const transaction of transactions) {
    if (transaction.type !== transactionType || transaction.is_card_payment) continue;
    const category = transaction.category?.trim();
    if (!category || category === 'Otra') continue;
    counts.set(category, (counts.get(category) || 0) + 1);
    if (!options.some(([label]) => label === category)) options.push([category, 'pricetag-outline']);
  }
  return options.sort((a, b) => (counts.get(b[0]) || 0) - (counts.get(a[0]) || 0));
}

export function validateMovement(amount, category) {
  const cleanAmount = amount.trim().replace(',', '.');
  const numericAmount = Number(cleanAmount);
  const errors = {};
  if (!/^\d+(?:\.\d{1,2})?$/.test(cleanAmount) || !Number.isFinite(numericAmount) || numericAmount <= 0) {
    errors.amount = 'Ingresa un monto mayor a cero, con hasta 2 decimales.';
  }
  if (!category.trim()) errors.category = 'Selecciona una categoría o escribe su nombre.';
  return { errors, numericAmount };
}

export function restoreCategoryPreferences(stored, current, touchedTypes) {
  const restored = { ...current };
  for (const type of ['Gasto', 'Ingreso']) {
    const value = stored?.[type];
    if (!touchedTypes.has(type) && typeof value === 'string' && value.trim() && value.trim().length <= 60) {
      restored[type] = value.trim();
    }
  }
  return restored;
}
