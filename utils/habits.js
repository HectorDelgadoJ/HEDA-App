import { cents, isSpending } from './finance';

const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dateAt = (year, month, day) => new Date(year, month, day, 12);
const sum = rows => rows.reduce((total, row) => total + cents(row.amount), 0) / 100;

// Descriptive patterns from recorded transactions, never a financial-health score.
export function habitsData(rows, now = new Date()) {
  const year = now.getFullYear(), month = now.getMonth(), day = now.getDate();
  const today = dateKey(now), monthStart = dateKey(dateAt(year, month, 1));
  const valid = rows.filter(row => typeof row.transaction_date === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(row.transaction_date)
    && ['income', 'expense'].includes(row.type)
    && Number.isFinite(Number(row.amount)) && Number(row.amount) > 0
    && row.transaction_date <= today);
  const monthly = valid.filter(row => row.transaction_date >= monthStart);
  const spending = monthly.filter(isSpending);
  const expenses = sum(spending), income = sum(monthly.filter(row => row.type === 'income'));
  const categoryCents = new Map();
  spending.forEach(row => {
    const category = typeof row.category === 'string' && row.category.trim() ? row.category.trim() : 'Sin categoría';
    categoryCents.set(category, (categoryCents.get(category) || 0) + cents(row.amount));
  });
  const categories = [...categoryCents.entries()].map(([name, amount]) => ({ name, amount: amount / 100, percent: expenses ? Math.round(amount / cents(expenses) * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
  const activeDays = new Set(monthly.map(row => row.transaction_date)).size;
  const recordedDays = new Set(valid.map(row => row.transaction_date));
  let cursor = dateAt(year, month, day), streak = 0;
  if (!recordedDays.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (recordedDays.has(dateKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }

  // Compare the same number of calendar days even after a shorter previous month.
  const compareDays = Math.min(day, dateAt(year, month, 0).getDate());
  const currentEnd = dateKey(dateAt(year, month, compareDays));
  const previousStart = dateKey(dateAt(year, month - 1, 1));
  const previousEnd = dateKey(dateAt(year, month - 1, compareDays));
  const currentComparable = sum(spending.filter(row => row.transaction_date <= currentEnd));
  const previousSpending = valid.filter(row => isSpending(row) && row.transaction_date >= previousStart && row.transaction_date <= previousEnd);
  const previousExpenses = sum(previousSpending);
  const difference = (cents(currentComparable) - cents(previousExpenses)) / 100;
  const changePercent = previousExpenses > 0 ? Math.round(difference / previousExpenses * 100) : null;
  const monday = dateAt(year, month, day - (now.getDay() + 6) % 7);
  const weeks = Array.from({ length: 6 }, (_, index) => {
    const startDate = dateAt(monday.getFullYear(), monday.getMonth(), monday.getDate() - (5 - index) * 7);
    const endDate = dateAt(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6);
    const start = dateKey(startDate), end = index === 5 ? today : dateKey(endDate);
    return { start, end, partial: index === 5 && now.getDay() !== 0,
      amount: sum(valid.filter(row => isSpending(row) && row.transaction_date >= start && row.transaction_date <= end)) };
  });
  return { today, monthStart, expenses, income, result: (cents(income) - cents(expenses)) / 100,
    transactionCount: monthly.length, expenseCount: spending.length, activeDays, elapsedDays: day,
    recordingPercent: Math.round(activeDays / day * 100), streak, categories, weeks,
    comparison: { days: compareDays, currentStart: monthStart, currentEnd, previousStart, previousEnd,
      currentExpenses: currentComparable, previousExpenses, difference, changePercent } };
}
