// Proyección de fecha estimada de pago de un crédito (CLAUDE.md §5.6). Función pura.
//   - Sin tasa: aproximación simple = ceil(saldo / cuota) meses.
//   - Con tasa: usa la fórmula de amortización (más precisa). Si la cuota no cubre ni el
//     interés mensual, el crédito nunca se paga → null.
import type { Loan } from './types';

/**
 * Número de meses estimados para saldar el crédito. Devuelve null si no se puede proyectar
 * (cuota <= 0, o cuota insuficiente para cubrir el interés con tasa).
 */
export function estimatePayoffMonths(loan: Loan): number | null {
  const { cachedBalance: balance, monthlyPayment: payment, annualRate } = loan;
  if (balance <= 0) return 0;
  if (payment <= 0) return null;

  // Sin tasa (o tasa 0): aproximación lineal.
  if (!annualRate || annualRate <= 0) {
    return Math.ceil(balance / payment);
  }

  // Con tasa: amortización. r = tasa mensual.
  const r = annualRate / 12;
  if (payment <= balance * r) return null; // la cuota no cubre el interés → no se salda
  const months = -Math.log(1 - (balance * r) / payment) / Math.log(1 + r);
  return Math.ceil(months);
}
