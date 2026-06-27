export interface HormigaCapModalProps {
  open: boolean;
  /** Tope actual (o la sugerencia) para prellenar el campo; null = vacío. */
  initialValue: number | null;
  /** `true` si ya hay un tope guardado (muestra la opción de quitarlo). */
  hasCap: boolean;
  /** Guarda el nuevo tope; `null` lo quita. */
  onSave: (value: number | null) => void | Promise<void>;
  onClose: () => void;
}
