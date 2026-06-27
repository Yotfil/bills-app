import { useState } from 'react';
import { useHormigaCap } from '../../hooks/useHormigaCap';
import { useHormigaPromptStore } from '../../../store/hormigaPromptStore';
import { HormigaCapModal } from '../../components/HormigaCapModal';
import { budgetAlertLevel } from '../../../domain/budgetAlert';
import { formatCop } from '../../../lib/currency';
import { currentMonthKey } from '../../../lib/date';
import { NEAR_LIMIT_RATIO, progressBarColor } from '../../../lib/progress';
import type { HormigaCardProps } from './HormigaCardProps';

// Tope de gasto hormiga en el Inicio (CLAUDE.md §5.8, §2.5). El tope es AUTOMÁTICO cada mes; esta
// card solo aparece cuando es accionable:
//  - sin historia para el automático (y sin override): pide ponerlo manual (nudge, descartable);
//  - con tope efectivo y el mes va alto/excedido: avisa SIN regaño (naranja/rojo).
export function HormigaCard({ month }: HormigaCardProps) {
  const { currentHormiga, effectiveCap, hasOverride, setCap } = useHormigaCap(month);
  const dismissed = useHormigaPromptStore((s) => s.dismissed);
  const dismiss = useHormigaPromptStore((s) => s.dismiss);
  const [modalOpen, setModalOpen] = useState(false);

  // Sin tope (no hay historia para el automático ni override): la app pide ponerlo manual. El nudge
  // solo tiene sentido en el mes en curso (el tope es del mes actual); al navegar otros meses no se
  // muestra para no invitar a fijar un tope de un mes que no estás viviendo.
  if (effectiveCap === null) {
    if (dismissed || month !== currentMonthKey()) return null;
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">🐜 ¿Le ponemos un tope a tus gastos hormiga?</p>
        <p className="mt-1 text-xs text-slate-500">
          Aún no tienes historia suficiente para calcularlo solo. Define cuánto quieres permitirte y
          te avisaremos (sin regaño) cuando te acerques.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white"
          >
            Poner tope
          </button>
          <button type="button" onClick={dismiss} className="px-2 py-2 text-sm text-slate-400">
            Ahora no
          </button>
        </div>
        <HormigaCapModal
          open={modalOpen}
          initialValue={null}
          hasOverride={false}
          onSave={setCap}
          onClose={() => setModalOpen(false)}
        />
      </section>
    );
  }

  // Con tope: avisa calmado solo si el mes en curso ya va alto (≥80%) o se pasó.
  const level = budgetAlertLevel(currentHormiga, effectiveCap, NEAR_LIMIT_RATIO);
  if (level === 'none') return null;

  const exceeded = level === 'exceeded';
  const ratio = effectiveCap > 0 ? currentHormiga / effectiveCap : 0;
  const pct = Math.min(100, Math.round(ratio * 100));

  return (
    <section
      className={`rounded-2xl border p-4 ${
        exceeded ? 'border-red-300 bg-red-50' : 'border-orange-300 bg-orange-50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={`text-sm font-semibold ${exceeded ? 'text-red-800' : 'text-orange-800'}`}>
          {exceeded ? '🐜 Te pasaste tu tope hormiga' : '🐜 Tu gasto hormiga va alto este mes'}
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={`text-xs underline ${exceeded ? 'text-red-600' : 'text-orange-600'}`}
        >
          Editar
        </button>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
        <div className={`h-full ${progressBarColor(ratio)}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`mt-2 text-xs ${exceeded ? 'text-red-600' : 'text-orange-700'}`}>
        {formatCop(currentHormiga)} de {formatCop(effectiveCap)}
        {exceeded ? ` · te excediste ${formatCop(currentHormiga - effectiveCap)}` : ` (${pct}%)`}
      </p>
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
