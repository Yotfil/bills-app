import { useState } from 'react';
import { useSessionStore } from '../../store/sessionStore';
import { recalculateBalances } from '../../data/transactionService';
import type { RecalculationCorrections } from '../../data/transactionService';

// Botón de mantenimiento (CLAUDE.md §9.3): reconstruye TODAS las cachés de saldo (cuentas,
// tarjetas, créditos) desde su semilla + los movimientos y corrige las que hayan divergido.
// Es la válvula de seguridad si una caché incremental se desfasa; normalmente no corrige nada.

type RecalcState =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'done'; corrections: RecalculationCorrections }
  | { kind: 'error'; message: string };

function countCorrections(c: RecalculationCorrections): number {
  return (
    Object.keys(c.accounts).length + Object.keys(c.cards).length + Object.keys(c.loans).length
  );
}

export function RecalculateBalancesButton() {
  const uid = useSessionStore((s) => s.user?.uid);
  const [state, setState] = useState<RecalcState>({ kind: 'idle' });

  async function handleRecalculate() {
    if (!uid || state.kind === 'running') return;
    setState({ kind: 'running' });
    try {
      const corrections = await recalculateBalances(uid);
      setState({ kind: 'done', corrections });
    } catch (err) {
      setState({ kind: 'error', message: err instanceof Error ? err.message : 'Error desconocido' });
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="font-medium text-slate-800">Recalcular saldos</p>
      <p className="mt-1 text-xs text-slate-400">
        Reconstruye los saldos de cuentas, tarjetas y créditos a partir de tus movimientos. Úsalo si
        algún saldo se ve desfasado.
      </p>

      <button
        type="button"
        onClick={() => void handleRecalculate()}
        disabled={!uid || state.kind === 'running'}
        className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
      >
        {state.kind === 'running' ? 'Recalculando…' : 'Recalcular saldos'}
      </button>

      {state.kind === 'done' &&
        (countCorrections(state.corrections) === 0 ? (
          <p className="mt-3 text-sm text-emerald-600">
            Todo cuadra: los saldos ya coincidían con tus movimientos.
          </p>
        ) : (
          <p className="mt-3 text-sm text-amber-600">
            Se corrigieron {countCorrections(state.corrections)} saldo(s) que estaban desfasados.
          </p>
        ))}

      {state.kind === 'error' && (
        <p className="mt-3 text-sm text-rose-600">No se pudo recalcular: {state.message}</p>
      )}
    </div>
  );
}
