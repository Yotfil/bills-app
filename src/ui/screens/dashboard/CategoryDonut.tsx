import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { formatCop } from '../../../lib/currency';
import type { CategoryDonutProps } from './CategoryDonutProps';

// Desglose de gasto por categoría (CLAUDE.md §8.1). Dona ligera (Recharts). Tocar una
// categoría filtra sus transacciones en el Registro.
export function CategoryDonut({ slices, total, onSelect }: CategoryDonutProps) {
  if (slices.length === 0) {
    return (
      <section className="rounded-2xl bg-white p-5 text-center shadow-sm">
        <p className="text-sm text-slate-400">Sin gastos este mes todavía.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-semibold text-slate-700">¿En qué se me va?</h2>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={2}
              onClick={(data: unknown) => {
                const id = (data as { id?: string }).id;
                if (id) onSelect(id);
              }}
            >
              {slices.map((slice) => (
                <Cell key={slice.id} fill={slice.color} className="cursor-pointer" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-2 flex flex-col gap-1">
        {slices.map((slice) => (
          <li key={slice.id}>
            <button
              type="button"
              onClick={() => onSelect(slice.id)}
              className="flex w-full items-center justify-between py-1 text-sm"
            >
              <span className="flex items-center gap-2 text-slate-600">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: slice.color }} />
                {slice.name}
              </span>
              <span className="text-slate-500">
                {formatCop(slice.value)}
                <span className="ml-1 text-xs text-slate-400">
                  {total > 0 ? `${Math.round((slice.value / total) * 100)}%` : ''}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
