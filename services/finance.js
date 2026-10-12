import { supabase } from './supabase';
export async function accountRows(table, columns, userId) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from(table).select(columns).eq('user_id', userId).order('id').range(offset, offset + 999);
    if (error) return { data: null, error };
    rows.push(...data);
    if (data.length < 1000) return { data: rows, error: null };
  }
}
export async function transactionRows(userId) {
  const result = await accountRows('transactions', '*', userId);
  if (result.data) result.data.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date) || b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id));
  return result;
}
