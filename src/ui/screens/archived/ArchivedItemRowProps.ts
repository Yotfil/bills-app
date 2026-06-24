export interface ArchivedItemRowProps {
  /** Nombre del elemento archivado. */
  label: string;
  /** Texto secundario (tipo, monto, categoría…). */
  sublabel?: string;
  /** Devuelve el elemento a las listas activas. */
  onRestore: () => void;
  /**
   * Lo borra físicamente. Si es `undefined`, el borrado está bloqueado (p.ej. tiene
   * movimientos asociados, §8.4) y se muestra `deleteBlockedReason` en su lugar.
   */
  onDelete?: () => void;
  /** Motivo por el que no se puede eliminar (se muestra cuando no hay `onDelete`). */
  deleteBlockedReason?: string;
}
