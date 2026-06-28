import { TrendingUp, Bell } from 'lucide-react';
import type { SubscriptionAlertsProps } from './SubscriptionAlertsProps';

// Avisos suaves del módulo de Suscripciones (§15): subidas de precio y renovaciones próximas.
// No aparece nada si no hay ninguno (calma, no culpa — §2).
export function SubscriptionAlerts({ priceIncreaseCount, renewalCount }: SubscriptionAlertsProps) {
  if (priceIncreaseCount === 0 && renewalCount === 0) return null;

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      {priceIncreaseCount > 0 && (
        <p className="flex items-center gap-2 text-sm text-amber-800">
          <TrendingUp className="h-4 w-4 shrink-0" />
          {priceIncreaseCount === 1
            ? '1 suscripción subió de precio'
            : `${priceIncreaseCount} suscripciones subieron de precio`}
        </p>
      )}
      {renewalCount > 0 && (
        <p className="flex items-center gap-2 text-sm text-amber-800">
          <Bell className="h-4 w-4 shrink-0" />
          {renewalCount === 1 ? '1 suscripción renueva pronto' : `${renewalCount} renuevan pronto`}
        </p>
      )}
    </section>
  );
}
