import { X } from 'lucide-react';
import type { ModalProps } from './ModalProps';

// Modal simple, mobile-first: hoja inferior en móvil, centrado cómodo en pantallas grandes.
export function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      {/* Altura máxima del 80% del viewport: el header queda fijo y el cuerpo hace scroll si el
          contenido es más alto (evita que el modal toque los bordes superior/inferior). */}
      {/* role="dialog" + aria-modal: a11y (lectores de pantalla) y permite a los tests acotar al modal
          (p.ej. distinguir el botón de confirmar de otro homónimo en la pantalla de fondo). */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between p-5 pb-3">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}
