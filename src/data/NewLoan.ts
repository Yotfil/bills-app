// Datos para crear un crédito grande (CLAUDE.md §5.6).
export interface NewLoan {
  name: string;
  originalAmount: number; // monto original
  currentBalance: number; // saldo actual (semilla del onboarding)
  monthlyPayment: number; // cuota mensual
  annualRate?: number | null; // tasa anual opcional (ej. 0.24 = 24%)
  linkedFixedTemplateId?: string | null; // fijo ligado como cuota (§5.6)
}
