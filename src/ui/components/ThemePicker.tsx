import { Check } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { THEMES } from '../../lib/theme';

// Selector de tema de color (5 temas). Vive en la pantalla "Más". Cada opción muestra una
// muestra (mitad fondo / mitad color de marca) y marca el activo.
export function ThemePicker() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-800">Tema</p>
      <p className="text-xs text-slate-400">Elige los colores de la app</p>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {THEMES.map((t) => {
          const active = t.id === theme;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              aria-pressed={active}
              aria-label={`Tema ${t.label}`}
              className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 ${
                active ? 'border-slate-800 ring-1 ring-slate-800' : 'border-slate-200'
              }`}
            >
              <span
                className="relative h-8 w-8 overflow-hidden rounded-full border border-slate-200"
                style={{ background: t.swatch.bg }}
              >
                <span
                  className="absolute inset-x-0 bottom-0 h-1/2"
                  style={{ background: t.swatch.brand }}
                />
                {active && (
                  <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
                )}
              </span>
              <span className="text-[11px] text-slate-600">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
