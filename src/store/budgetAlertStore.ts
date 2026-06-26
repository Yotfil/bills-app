import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BudgetAlertState } from './BudgetAlertState';

// Avisos de tope ya mostrados, persistidos en localStorage (§5.9): así el pop-up sale una sola vez
// por presupuesto y nivel, y sobrevive recargas.
export const useBudgetAlertStore = create<BudgetAlertState>()(
  persist(
    (set) => ({
      acknowledged: {},
      acknowledge: (key, level) =>
        set((s) => ({ acknowledged: { ...s.acknowledged, [key]: level } })),
    }),
    { name: 'budget-alerts' },
  ),
);
