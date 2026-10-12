// Money that actually left the user's available balance, as opposed to credit charges.
export const cents = value => Math.round(Number(value || 0) * 100);
export const isSpending = row => row.type === 'expense' && !row.is_card_payment;
export const isCashMovement = row => !row.card_id || row.is_card_payment;
export function cashBalance(rows) {
  return rows.filter(isCashMovement).reduce((sum, row) => sum + (row.type === 'income' ? 1 : -1) * cents(row.amount), 0) / 100;
}
export function cardDebt(card, rows) {
  if (!card.ledger_enabled) return card.paid ? 0 : Number(card.amount);
  return (cents(card.opening_balance) + rows.filter(row => row.card_id === card.id).reduce((sum, row) => sum + (row.is_card_payment ? -1 : 1) * cents(row.amount), 0)) / 100;
}
export function spendingTotal(rows) {
  return rows.filter(isSpending).reduce((sum, row) => sum + cents(row.amount), 0) / 100;
}
