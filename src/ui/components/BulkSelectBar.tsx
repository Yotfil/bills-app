import type { BulkSelectBarProps } from './BulkSelectBarProps';

// Barra de acciones masivas, reutilizable en cualquier lista con checkbox de selección.
// Aparece cuando hay al menos un ítem seleccionado: checkbox de "seleccionar todas" + conteo,
// y uno o varios botones de acción (eliminar, marcar pagados…). Los `danger` se pintan rojos;
// el resto, neutros oscuros. Fondo blanco para no chillar sobre el verde de marca; pegada
// arriba (sticky) para quedar a la vista en móvil.
export function BulkSelectBar({
  selectedCount,
  totalCount,
  allSelected,
  onToggleAll,
  actions,
}: BulkSelectBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
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
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium text-white ${
              action.danger ? 'bg-red-600 hover:bg-red-500' : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
