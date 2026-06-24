import { Link } from 'react-router-dom';
import type { FixedProgressCardProps } from './FixedProgressCardProps';

// Progreso de los fijos del mes (CLAUDE.md §8.1): "X de Y pagados", pendientes y destinados.
// Los datos llegan con el Paso 9; mientras tanto, total = 0 muestra un acceso a configurarlos.
export function FixedProgressCard({ paid, allocated, pending, total }: FixedProgressCardProps) {
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    <Link to="/fijos" className="block rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Fijos del mes</h2>
        <span className="text-xs text-slate-400">
          {total > 0 ? `${paid} de ${total} pagados` : 'Configurar →'}
        </span>
      </div>
      {total > 0 && (
        <>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {pending} pendientes · {allocated} destinados · {paid} pagados
          </p>
        </>
      )}
    </Link>
  );
}
