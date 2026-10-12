import { cashBalance, cardDebt, cents } from './finance';
export function cardSummary(cards, transactions) {
  const balance = cashBalance(transactions);
  const pending = cards.reduce((total, card) => total + Math.max(0, cents(cardDebt(card, transactions))), 0) / 100;
  return { balance, pending, remaining: (cents(balance) - cents(pending)) / 100 };
}
