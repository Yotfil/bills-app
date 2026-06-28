import { formatCop } from '../../../lib/currency';
import type { SubscriptionTotalsCardProps } from './SubscriptionTotalsCardProps';

// Tarjeta-resumen del módulo de Suscripciones (§15): cuánto suman al mes y, anualizado, al año.
export function SubscriptionTotalsCard({ totals, count }: SubscriptionTotalsCardProps) {
  return (
    <section className="rounded-2xl bg-slate-800 p-4 text-white shadow-sm">
      <p className="text-xs text-white/70">
        {count} {count === 1 ? 'suscripción activa' : 'suscripciones activas'}
      </p>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <p className="text-xs text-white/70">Al mes</p>
          <p className="text-2xl font-bold">{formatCop(totals.monthly)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/70">Al año</p>
          <p className="text-lg font-semibold">{formatCop(totals.annual)}</p>
        </div>
      </div>
    </section>
  );
}
