import type { LedgerEntityKind } from '../../domain/types';

export interface EntityMovementsScreenProps {
  // Qué tipo de entidad muestra sus movimientos: cuenta (saldo) o tarjeta (deuda).
  kind: Extract<LedgerEntityKind, 'account' | 'card'>;
}
