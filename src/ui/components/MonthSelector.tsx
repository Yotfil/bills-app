import { formatMonthLabel } from '../../lib/date';
import type { MonthSelectorProps } from './MonthSelectorProps';

// Selector de periodo por mes (CLAUDE.md §8.1, §8.3): mes actual por defecto, con flechas.
// Compartido por el Dashboard y la pantalla de Fijos.
export function MonthSelector({ month, onPrev, onNext }: MonthSelectorProps) {
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Mes anterior"
        className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100"
      >
        ◀
      </button>
      <span className="text-sm font-semibold text-slate-700 capitalize">
        {formatMonthLabel(month)}
      </span>
      <button
        type="button"
        onClick={onNext}
        aria-label="Mes siguiente"
        className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100"
      >
        ▶
      </button>
    </div>
  );
}
