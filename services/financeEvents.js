const listeners = new Set();
export const onFinanceChange = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export const notifyFinanceChange = () => listeners.forEach(listener => listener());
