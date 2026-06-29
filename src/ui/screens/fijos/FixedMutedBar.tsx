import { formatCop } from '../../../lib/currency';
import type { FixedMutedBarProps } from './FixedMutedBarProps';

// Cálculo temporal de "apagar" gastos (§8.3): aparece bajo el bar canónico cuando hay ≥1 apagado.
// Muestra el "Por destinar" SIN los apagados y la suma de los apagados. No afecta saldos ni el bar de
// arriba: es solo una vista "qué pasaría si". Fondo distinto (slate-100) para diferenciarlo.
export function FixedMutedBar({ pending, muted }: FixedMutedBarProps) {
  return (
    <section className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-4 text-center">
      <div>
        <p className="text-xs text-slate-400">Por destinar (sin apagados)</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-700">{formatCop(pending)}</p>
      </div>
      <div>
        <p className="text-xs text-slate-400">Apagados</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-500">{formatCop(muted)}</p>
      </div>
    </section>
  );
}
