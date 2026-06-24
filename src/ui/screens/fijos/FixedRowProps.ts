import type { FixedObligationMonthly } from '../../../domain/types';

export interface FixedRowProps {
  fixed: FixedObligationMonthly;
  onAllocate: () => void; // pendiente → destinado
  onUnallocate: () => void; // destinado → pendiente (deshacer)
  onPay: () => void; // abrir el flujo de pago
}
