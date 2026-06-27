// Estado de descarte del banner de sincronización plantilla→fijos (CLAUDE.md §5.10). Es estado de
// cliente puro (no toca reglas de negocio): recuerda en qué meses el usuario cerró el banner para
// mostrar solo el icono de actualizar en su lugar.
export interface FixedSyncState {
  /** Meses 'YYYY-MM' cuyo banner fue cerrado por el usuario. */
  dismissedMonths: Record<string, true>;
  /** Cierra el banner de un mes (queda solo el icono de actualizar). */
  dismiss: (month: string) => void;
  /** Reabre el banner de un mes (al aplicar/quedar sin cambios se vuelve a permitir mostrarlo). */
  undismiss: (month: string) => void;
}
