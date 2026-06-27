import type { SegmentedTabsProps } from './SegmentedTabsProps';

// Control segmentado (tabs internos) reutilizable. Controlado: el dueño de la pantalla
// guarda el tab activo y reacciona en `onChange`. Genérico sobre la unión de valores.
export function SegmentedTabs<T extends string>({ tabs, value, onChange }: SegmentedTabsProps<T>) {
  return (
    <div role="tablist" className="flex gap-1 rounded-xl bg-slate-100 p-1">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span className="ml-1.5 text-xs text-slate-400">{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
