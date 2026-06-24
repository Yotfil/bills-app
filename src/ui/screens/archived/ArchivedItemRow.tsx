import type { ArchivedItemRowProps } from './ArchivedItemRowProps';

// Fila reutilizable de la sección Archivados (§8.4): nombre + "Desarchivar" y "Eliminar".
// Si el borrado está bloqueado (tiene histórico), muestra el motivo en lugar del botón.
export function ArchivedItemRow({
  label,
  sublabel,
  onRestore,
  onDelete,
  deleteBlockedReason,
}: ArchivedItemRowProps) {
  return (
    <li className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 last:border-0">
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-800">{label}</p>
        {sublabel && <p className="truncate text-xs text-slate-400">{sublabel}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3 text-sm">
        <button type="button" onClick={onRestore} className="font-medium text-slate-600 underline">
          Desarchivar
        </button>
        {onDelete ? (
          <button type="button" onClick={onDelete} className="font-medium text-red-600 underline">
            Eliminar
          </button>
        ) : (
          <span
            className="max-w-[8rem] text-right text-xs text-slate-400"
            title={deleteBlockedReason}
          >
            {deleteBlockedReason}
          </span>
        )}
      </div>
    </li>
  );
}
