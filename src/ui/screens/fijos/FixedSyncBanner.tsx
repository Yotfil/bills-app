import { RefreshCw, X } from 'lucide-react';
import type { FixedSyncBannerProps } from './FixedSyncBannerProps';

// Aviso de que la plantilla tiene cambios sin aplicar a este mes (CLAUDE.md §5.10). El botón de
// actualizar abre el modal con el detalle; la X lo cierra (queda solo el icono en el header).
export function FixedSyncBanner({ count, onOpen, onDismiss }: FixedSyncBannerProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <button
        type="button"
        onClick={onOpen}
        aria-label="Actualizar fijos del mes según la plantilla"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200"
      >
        <RefreshCw className="h-4 w-4" />
      </button>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className="text-sm font-medium text-amber-800">
          {count} {count === 1 ? 'cambio' : 'cambios'} de la plantilla para este mes
        </p>
        <p className="text-xs text-amber-700">Toca para revisar qué actualizar.</p>
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar aviso"
        className="shrink-0 rounded-lg p-1 text-amber-600 hover:bg-amber-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
