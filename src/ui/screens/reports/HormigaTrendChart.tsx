import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { useHormigaCap } from '../../hooks/useHormigaCap';
import { HormigaCapModal } from '../../components/HormigaCapModal';
import { formatCop } from '../../../lib/currency';
import { formatMonthLabel, formatMonthShort } from '../../../lib/date';
import type { HormigaTrendChartProps } from './HormigaTrendChartProps';

// Gasto hormiga histórico (CLAUDE.md §5.8, §15): cuánto se va en gasto hormiga mes a mes,
// cruzando todas las categorías. Muestra el total del periodo, una barra por mes y el tope del mes
// (automático, editable desde aquí; así siempre es accesible aunque el aviso del Inicio no se muestre).
export function HormigaTrendChart({ data }: HormigaTrendChartProps) {
  const { effectiveCap, hasOverride, setCap } = useHormigaCap();
  const [modalOpen, setModalOpen] = useState(false);

  const rows = data.map((m) => ({ ...m, label: formatMonthShort(m.month) }));
  const total = rows.reduce((sum, r) => sum + r.hormiga, 0);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-slate-700">🐜 Gasto hormiga</h2>
        <span className="text-sm font-semibold text-amber-600">{formatCop(total)}</span>
      </div>
      {total > 0 ? (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip
                formatter={(value) => [formatCop(Number(value ?? 0)), 'Hormiga']}
                labelFormatter={(_label, payload) =>
                  payload?.[0] ? formatMonthLabel(payload[0].payload.month) : ''
                }
              />
              <Bar dataKey="hormiga" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-slate-400">
          Sin gastos marcados como hormiga en este periodo.
        </p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <span className="text-slate-500">
          {effectiveCap !== null ? (
            <>
              Tope de este mes: {formatCop(effectiveCap)}{' '}
              <span className="text-slate-400">{hasOverride ? '(manual)' : '(automático)'}</span>
            </>
          ) : (
            'Sin tope este mes'
          )}
        </span>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="font-medium text-slate-600 underline"
        >
          {effectiveCap !== null ? 'Editar' : 'Poner tope'}
        </button>
      </div>

      <HormigaCapModal
        open={modalOpen}
        initialValue={effectiveCap}
        hasOverride={hasOverride}
        onSave={setCap}
        onClose={() => setModalOpen(false)}
      />
    </section>
  );
}
