export interface FixedSyncBannerProps {
  /** Cuántos cambios de la plantilla están pendientes para este mes. */
  count: number;
  /** Abre el modal con el detalle. */
  onOpen: () => void;
  /** Cierra el banner (queda solo el icono de actualizar). */
  onDismiss: () => void;
}
