import { useState } from 'react';
import { formatCop } from '../../../lib/currency';
import { EyeToggle } from '../../components/EyeToggle';
import type { HeroBalanceProps } from './HeroBalanceProps';

// NÚMERO-HÉROE (CLAUDE.md §4, §8.1): lo más importante de la pantalla. Disponible real =
// Σ saldos de uso − Σ reservado. Debajo, el Saldo total (TODO, incl. Ahorros). Ambos saldos se
// pueden ocultar tras un ojo por privacidad (el disponible se ve por defecto; el total, oculto).
// Calma, no culpa: rojo solo si de verdad está en negativo (y visible).
export function HeroBalance({ amount, total }: HeroBalanceProps) {
  const negative = amount < 0;
  const [showAmount, setShowAmount] = useState(true);
  const [showTotal, setShowTotal] = useState(false);

  return (
    <section className="rounded-2xl bg-white p-5 text-center shadow-sm">
      <p className="text-xs tracking-wide text-slate-400 uppercase">Disponible real</p>
      <div className="mt-1 flex items-center justify-center gap-2">
        <p
          className={`text-4xl font-bold ${negative && showAmount ? 'text-red-600' : 'text-slate-800'}`}
        >
          {showAmount ? formatCop(amount) : '••••••'}
        </p>
        <EyeToggle
          shown={showAmount}
          onToggle={() => setShowAmount((v) => !v)}
          label="disponible real"
          iconClassName="h-5 w-5"
        />
      </div>
      <p className="mt-1 text-xs text-slate-400">Lo que de verdad puedes usar hoy</p>

      <div className="mt-2 flex items-center justify-center gap-2 text-xs text-slate-400">
        <span>
          Saldo total:{' '}
          <span className="font-medium text-slate-500">
            {showTotal ? formatCop(total) : '••••••••'}
          </span>
        </span>
        <EyeToggle shown={showTotal} onToggle={() => setShowTotal((v) => !v)} label="saldo total" />
      </div>
    </section>
  );
}
