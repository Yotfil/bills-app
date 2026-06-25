import type { BulkSelectBarProps } from './BulkSelectBarProps';

// Barra de acciones masivas, reutilizable en cualquier lista con checkbox de selección.
// Aparece cuando hay al menos un ítem seleccionado: checkbox de "seleccionar todas" + conteo,
// y un único botón rojo que dispara la eliminación (con su confirmación). Fondo blanco para
// no chillar sobre el verde de marca; pegada arriba (sticky) para quedar a la vista en móvil.
export function BulkSelectBar({
  selectedCount,
  totalCount,
  allSelected,
  onToggleAll,
  onDelete,
}: BulkSelectBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-2 z-10 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onToggleAll}
          className="h-5 w-5 accent-slate-800"
          aria-label={allSelected ? 'Quitar selección de todas' : 'Seleccionar todas'}
        />
        <span className="font-medium">
          {selectedCount} de {totalCount}
        </span>
      </label>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Eliminar ${selectedCount} seleccionada(s)`}
        className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-500"
      >
        Limpiar
      </button>
    </div>
  );
}
