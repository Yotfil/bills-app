export interface HormigaCapModalProps {
  open: boolean;
  /** Tope actual (o la sugerencia) para prellenar el campo; null = vacío. */
  initialValue: number | null;
  /** `true` si hay un override manual de este mes (muestra "Volver al tope automático"). */
  hasOverride: boolean;
  /** Guarda el override del mes; `null` vuelve al tope automático. */
  onSave: (value: number | null) => void | Promise<void>;
  onClose: () => void;
}
