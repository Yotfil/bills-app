export interface ConfirmDeleteModalProps {
  /** Controla la visibilidad del popup. */
  open: boolean;
  /** Nombre del registro a eliminar (se muestra en el mensaje). */
  itemLabel: string;
  /** Texto del tipo de registro para el título (ej. "la cuenta", "la tarjeta"). */
  itemKind: string;
  /**
   * `true` si tiene movimientos asociados y NO se puede borrar sin romper el histórico
   * (§8.4): el popup explica el bloqueo y, si hay `onArchive`, ofrece archivarlo.
   */
  blocked?: boolean;
  /** Confirma el borrado físico completo (solo se llama cuando no está bloqueado). */
  onConfirm: () => void;
  /** Acción opcional para archivar (se ofrece cuando el borrado está bloqueado). */
  onArchive?: () => void;
  /** Cierra el popup sin hacer nada. */
  onClose: () => void;
}
