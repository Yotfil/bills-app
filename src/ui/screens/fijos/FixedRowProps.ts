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
  // "Apagar" (§8.3): excluye este gasto del cálculo temporal de "Por destinar". Si se pasa
  // onToggleMute, se muestra el icono de ojo; `muted` atenúa la fila.
  muted?: boolean;
  onToggleMute?: () => void;
  // Ítem del checklist de una bolsa (§5.9 ext.): se renderiza indentado bajo su presupuesto.
  nested?: boolean;
}
