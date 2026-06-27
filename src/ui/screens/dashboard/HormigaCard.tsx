import { useState } from 'react';
import { useSessionStore } from '../../../store/sessionStore';
import { useUserSettings } from '../../hooks/useUserSettings';
import { useHormigaPromptStore } from '../../../store/hormigaPromptStore';
import { HormigaCapModal } from '../../components/HormigaCapModal';
import { setHormigaCap } from '../../../data/userRepository';
import { budgetAlertLevel } from '../../../domain/budgetAlert';
import { formatCop } from '../../../lib/currency';
import { NEAR_LIMIT_RATIO, progressBarColor } from '../../../lib/progress';
import type { HormigaCardProps } from './HormigaCardProps';

// Tope de gasto hormiga en el Inicio (CLAUDE.md §5.8, §2.5): la app PIDE poner un tope (con una
// sugerencia basada en los meses más bajos del usuario) y luego AVISA, sin regaño, cuando el mes en
// curso se acerca/pasa. Calma, no culpa: es una card informativa, no un pop-up.
export function HormigaCard({ currentHormiga, suggestedCap }: HormigaCardProps) {
  const uid = useSessionStore((s) => s.user?.uid);
  const { settings } = useUserSettings();
  const dismissed = useHormigaPromptStore((s) => s.dismissed);
  const dismiss = useHormigaPromptStore((s) => s.dismiss);
  const [modalOpen, setModalOpen] = useState(false);

  const cap = settings?.hormigaMonthlyCap ?? null;

  async function save(value: number | null) {
    if (uid) await setHormigaCap(uid, value);
  }

  // Sin tope: la app PIDE ponerlo (mientras no lo descarte). Si ya hay historia, sugiere un valor;
  // si aún no (poca data), lo pide igual pero con entrada manual —así el pendiente sí se ve en el
  // Inicio sin un badge permanente que regañe (§2.5)—.
  if (cap === null) {
    if (dismissed) return null;
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">🐜 ¿Le ponemos un tope a tus gastos hormiga?</p>
        <p className="mt-1 text-xs text-slate-500">
          {suggestedCap !== null ? (
            <>
              Según tus meses más bajos, te sugerimos un tope de{' '}
              <span className="font-medium text-slate-700">{formatCop(suggestedCap)}</span> al mes.
              Te avisaremos (sin regaño) cuando te acerques.
            </>
          ) : (
            'Define cuánto quieres permitirte al mes y te avisaremos (sin regaño) cuando te acerques.'
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestedCap !== null && (
            <button
              type="button"
              onClick={() => void save(suggestedCap)}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white"
            >
              Usar {formatCop(suggestedCap)}
            </button>
          )}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className={`rounded-lg px-3 py-2 text-sm ${
              suggestedCap !== null
                ? 'border border-slate-300 text-slate-600'
                : 'bg-slate-800 font-medium text-white'
            }`}
          >
            {suggestedCap !== null ? 'Otro valor' : 'Poner tope'}
          </button>
          <button type="button" onClick={dismiss} className="px-2 py-2 text-sm text-slate-400">
            Ahora no
          </button>
        </div>
        <HormigaCapModal
          open={modalOpen}
          initialValue={suggestedCap}
          hasCap={false}
          onSave={save}
          onClose={() => setModalOpen(false)}
        />
      </section>
    );
  }

  // Con tope: avisa calmado solo si el mes en curso ya va alto (≥80%) o se pasó.
  const level = budgetAlertLevel(currentHormiga, cap, NEAR_LIMIT_RATIO);
  if (level === 'none') return null;

  const exceeded = level === 'exceeded';
  const ratio = cap > 0 ? currentHormiga / cap : 0;
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
        {formatCop(currentHormiga)} de {formatCop(cap)}
        {exceeded ? ` · te excediste ${formatCop(currentHormiga - cap)}` : ` (${pct}%)`}
      </p>
      <HormigaCapModal
        open={modalOpen}
        initialValue={cap}
        hasCap
        onSave={save}
        onClose={() => setModalOpen(false)}
      />
    </section>
  );
}
