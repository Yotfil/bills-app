export interface BulkSelectBarProps {
  /** Cuántos ítems hay seleccionados (controla la visibilidad: si es 0, no se muestra). */
  selectedCount: number;
  /** Total de ítems visibles, para el "seleccionar todas". */
  totalCount: number;
  /** `true` si ya están todas las visibles seleccionadas (alterna el checkbox de cabecera). */
  allSelected: boolean;
  /** Marca/desmarca todas las visibles. */
  onToggleAll: () => void;
  /** Dispara la acción de eliminar las seleccionadas (abre la confirmación). El botón rojo. */
  onDelete: () => void;
}
