import { Modal } from './Modal';
import type { ConfirmDeleteModalProps } from './ConfirmDeleteModalProps';

// Popup de confirmación de borrado, reutilizable en todas las secciones (§8.4). Avisa que el
// registro se borrará por completo. Si tiene movimientos asociados (`blocked`), no deja borrar
// —explica por qué— y ofrece archivar como alternativa segura.
export function ConfirmDeleteModal({
  open,
  itemLabel,
  itemKind,
  blocked = false,
  onConfirm,
  onArchive,
  onClose,
}: ConfirmDeleteModalProps) {
  const title = blocked ? 'No se puede eliminar' : `Eliminar ${itemKind}`;

  return (
    <Modal open={open} title={title} onClose={onClose}>
      {blocked ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600">
            <span className="font-semibold">«{itemLabel}»</span> tiene movimientos asociados, así
            que no se puede eliminar sin romper el histórico del Registro. Puedes archivarlo: sale
            de las listas activas pero su historial se conserva.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
            >
              Cerrar
            </button>
            {onArchive && (
              <button
                type="button"
                onClick={onArchive}
                className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-white"
              >
                Archivar
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600">
            Se eliminará por completo <span className="font-semibold">«{itemLabel}»</span>. Esta
            acción <span className="font-semibold">no se puede deshacer</span>.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
