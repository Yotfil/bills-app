import { Eye, EyeOff } from 'lucide-react';
import type { EyeToggleProps } from './EyeToggleProps';

// Botón de ojo para mostrar/ocultar un valor sensible (saldos). Reutilizable: encapsula los dos
// íconos (ojo abierto / tachado) en un solo lugar para no duplicarlos por la app.
export function EyeToggle({ shown, onToggle, label = 'saldo', iconClassName }: EyeToggleProps) {
  const size = iconClassName ?? 'h-4 w-4';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? `Ocultar ${label}` : `Mostrar ${label}`}
      className="text-slate-400 hover:text-slate-600"
    >
      {shown ? <Eye className={size} /> : <EyeOff className={size} />}
    </button>
  );
}
