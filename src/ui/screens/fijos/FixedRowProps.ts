import type { FixedObligationMonthly } from '../../../domain/types';

export interface FixedRowProps {
  fixed: FixedObligationMonthly;
  onAllocate: () => void; // pendiente → destinado
  onUnallocate: () => void; // destinado → pendiente (deshacer)
  onPay: () => void; // abrir el flujo de pago (crea movimiento)
  onMarkPaid: () => void; // marcar pagado SIN movimiento ("ya estaba pagado")
  onRevert: () => void; // deshacer el pago (devuelve el dinero si hubo movimiento)
  // Selección para acciones masivas (opcional). Si se pasa onToggleSelect, se muestra el checkbox.
  selected?: boolean;
  onToggleSelect?: () => void;
}
