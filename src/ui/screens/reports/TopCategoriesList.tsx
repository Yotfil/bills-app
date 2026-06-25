import { formatCop } from '../../../lib/currency';
import type { TopCategoriesListProps } from './TopCategoriesListProps';

// Top categorías del periodo (CLAUDE.md §15): lista ordenada con una barra de proporción
// respecto a la categoría que más gasta. Tocar una abre el Registro filtrado por esa categoría.
export function TopCategoriesList({ rows, onSelect }: TopCategoriesListProps) {
  const max = rows[0]?.total ?? 0;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-semibold text-slate-700">Top categorías</h2>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">Sin gastos en este periodo.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.categoryId}>
              <button
                type="button"
                onClick={() => onSelect(row.categoryId)}
                className="flex w-full flex-col gap-1"
              >
                <span className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: row.color }}
                    />
                    {row.name}
                  </span>
                  <span className="text-slate-500">{formatCop(row.total)}</span>
                </span>
                <span className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: max > 0 ? `${Math.round((row.total / max) * 100)}%` : '0%',
                      backgroundColor: row.color,
                    }}
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
