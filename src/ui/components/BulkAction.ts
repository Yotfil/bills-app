// Una acción masiva del BulkSelectBar (un botón). Reutilizable en cualquier lista con selección.
export interface BulkAction {
  /** Texto del botón (ej. "Eliminar", "Marcar pagados"). */
  label: string;
  /** Qué hace al pulsarlo (normalmente abre una confirmación). */
  onClick: () => void;
  /** Estilo destructivo (rojo). Si no, botón neutro oscuro. */
  danger?: boolean;
}
