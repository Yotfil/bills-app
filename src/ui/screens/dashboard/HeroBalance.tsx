import { formatCop } from '../../../lib/currency';
import type { HeroBalanceProps } from './HeroBalanceProps';

// NÚMERO-HÉROE (CLAUDE.md §4, §8.1): lo más importante de la pantalla. Disponible real =
// Σ saldos − Σ reservado. Calma, no culpa: rojo solo si de verdad está en negativo.
export function HeroBalance({ amount }: HeroBalanceProps) {
  const negative = amount < 0;
  return (
    <section className="rounded-2xl bg-white p-5 text-center shadow-sm">
      <p className="text-xs tracking-wide text-slate-400 uppercase">Disponible real</p>
      <p className={`mt-1 text-4xl font-bold ${negative ? 'text-red-600' : 'text-slate-800'}`}>
        {formatCop(amount)}
      </p>
      <p className="mt-1 text-xs text-slate-400">Lo que de verdad puedes usar hoy</p>
    </section>
  );
}
