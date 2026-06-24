import type { SearchBarProps } from './SearchBarProps';

// Campo de búsqueda por texto, reutilizable (Registro §8.2, Fijos y Obligaciones fijas).
// Controlado: el dueño de la pantalla guarda el texto y filtra con `matchesQuery` (lib/text).
export function SearchBar({ value, onChange, placeholder = 'Buscar…' }: SearchBarProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
        🔍
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-xl border border-slate-300 py-2.5 pr-9 pl-9 outline-none focus:border-slate-500"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
          className="absolute top-1/2 right-2 -translate-y-1/2 px-1 text-lg text-slate-400 hover:text-slate-600"
        >
          ×
        </button>
      )}
    </div>
  );
}
