import type { EyeToggleProps } from './EyeToggleProps';

// Botón de ojo para mostrar/ocultar un valor sensible (saldos). Reutilizable: encapsula los dos
// íconos (ojo abierto / tachado) en un solo lugar para no duplicar los SVG por la app.
export function EyeToggle({ shown, onToggle, label = 'saldo', iconClassName }: EyeToggleProps) {
  const size = iconClassName ?? 'h-4 w-4';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? `Ocultar ${label}` : `Mostrar ${label}`}
      className="text-slate-400 hover:text-slate-600"
    >
      {shown ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className={size}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className={size}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l12.544 12.544L21 21"
          />
        </svg>
      )}
    </button>
  );
}
