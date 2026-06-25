import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { formatCop } from '../../../lib/currency';
import { formatMonthLabel, formatMonthShort } from '../../../lib/date';
import type { MonthlyTrendChartProps } from './MonthlyTrendChartProps';

// Tendencia mes a mes (CLAUDE.md §15): ingreso vs gasto por mes. Barras agrupadas (Recharts).
export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const rows = data.map((m) => ({ ...m, label: formatMonthShort(m.month) }));
  const hasData = rows.some((r) => r.income > 0 || r.expense > 0);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-semibold text-slate-700">Ingreso vs. gasto por mes</h2>
      {hasData ? (
        <>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip
                  formatter={(value, name) => [
                    formatCop(Number(value ?? 0)),
                    name === 'income' ? 'Ingreso' : 'Gasto',
                  ]}
                  labelFormatter={(_label, payload) =>
                    payload?.[0] ? formatMonthLabel(payload[0].payload.month) : ''
                  }
                />
                <Bar dataKey="income" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expense" fill="#f43f5e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Ingreso
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Gasto
            </span>
          </div>
        </>
      ) : (
        <p className="py-6 text-center text-sm text-slate-400">
          Aún no hay movimientos en este periodo.
        </p>
      )}
    </section>
  );
}
