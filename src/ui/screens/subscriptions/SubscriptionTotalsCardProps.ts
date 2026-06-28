import type { SubscriptionTotals } from '../../../domain/subscriptions';

export interface SubscriptionTotalsCardProps {
  totals: SubscriptionTotals;
  count: number; // cuántas suscripciones activas
}
