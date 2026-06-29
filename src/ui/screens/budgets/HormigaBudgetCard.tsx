import { useState } from 'react';
import { useHormigaCap } from '../../hooks/useHormigaCap';
import { HormigaCapModal } from '../../components/HormigaCapModal';
import { formatCop } from '../../../lib/currency';
import { progressBarColor } from '../../../lib/progress';

// Item RESALTADO de gasto hormiga dentro de la lista de presupuestos del mes (CLAUDE.md §5.8): se ve
// distinto (ámbar) porque su tope es AUTOMÁTICO cada mes, pero el usuario puede editarlo (override de
// ese mes). Muestra el gasto hormiga del `month` dado (por defecto el mes en curso) vs el tope efectivo.
export function HormigaBudgetCard({ month }: { month?: string }) {
  const { currentHormiga, effectiveCap, hasOverride, setCap } = useHormigaCap(month);
  const [modalOpen, setModalOpen] = useState(false);

  const cap = effectiveCap ?? 0;
  const ratio = cap > 0 ? currentHormiga / cap : 0;
  const pct = Math.min(100, Math.round(ratio * 100));
  const exceeded = effectiveCap !== null && currentHormiga > effectiveCap;

  return (
    <li className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate font-semibold text-amber-900">🐜 Gasto hormiga</p>
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
            {hasOverride ? 'Tope manual' : 'Tope automático'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="shrink-0 text-xs font-medium text-amber-700 underline"
        >
          {effectiveCap !== null ? 'Editar' : 'Poner tope'}
        </button>
      </div>

      {effectiveCap !== null ? (
        <>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
            <div className={`h-full ${progressBarColor(ratio)}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-amber-800">
              {formatCop(currentHormiga)} de {formatCop(effectiveCap)}
            </span>
            <span className={exceeded ? 'font-medium text-red-600' : 'text-amber-700'}>
              {exceeded
                ? `Te pasaste ${formatCop(currentHormiga - effectiveCap)}`
                : `Quedan ${formatCop(effectiveCap - currentHormiga)}`}
            </span>
          </div>
        </>
      ) : (
        <p className="mt-1 text-xs text-amber-800">
          Sin tope este mes (aún no hay historia para calcularlo). Llevas{' '}
          {formatCop(currentHormiga)}.
        </p>
      )}

      <HormigaCapModal
        open={modalOpen}
        initialValue={effectiveCap}
        hasOverride={hasOverride}
        onSave={setCap}
        onClose={() => setModalOpen(false)}
      />
    </li>
  );
}
