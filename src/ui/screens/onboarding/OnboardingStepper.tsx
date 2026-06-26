import { Check } from 'lucide-react';
import type { OnboardingStepperProps } from './OnboardingStepperProps';

// Stepper del onboarding (CLAUDE.md §7): muestra TODOS los pasos para que el usuario vea lo que
// sigue, resalta el actual y marca los completados. Mientras el paso 1 (obligatorio) no se cumpla,
// los pasos se ven pero NO son clickeables; cumplido (`enabled`), habilita la navegación libre.
//
// Responsive (patrón estándar tipo Material UI): VERTICAL al lado en escritorio (md+) y HORIZONTAL
// arriba en móvil, porque la variante vertical apretaba el contenido centrado en pantallas chicas.

function circleClass(isCurrent: boolean, isDone: boolean, enabled: boolean): string {
  const state = isCurrent
    ? 'border-slate-800 bg-slate-800 text-white'
    : isDone
      ? 'border-slate-800 bg-white text-slate-800'
      : 'border-slate-300 bg-white text-slate-400';
  return `flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${state} ${
    enabled ? 'cursor-pointer' : 'cursor-not-allowed'
  }`;
}

export function OnboardingStepper({ steps, current, enabled, onSelect }: OnboardingStepperProps) {
  return (
    <>
      {/* Móvil: horizontal, arriba. Círculos numerados unidos por líneas; el título del paso ya
          se ve debajo, así que las etiquetas van pequeñas para no saturar. */}
      <nav aria-label="Pasos del onboarding" className="md:hidden">
        <ol className="flex items-start">
          {steps.map((label, i) => {
            const n = i + 1;
            const isCurrent = n === current;
            const isDone = n < current;
            const isLast = n === steps.length;
            return (
              <li key={label} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full items-center">
                  <span
                    className={`h-0.5 flex-1 ${n === 1 ? 'invisible' : n <= current ? 'bg-slate-800' : 'bg-slate-200'}`}
                  />
                  <button
                    type="button"
                    disabled={!enabled}
                    onClick={() => onSelect(n)}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={circleClass(isCurrent, isDone, enabled)}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : n}
                  </button>
                  <span
                    className={`h-0.5 flex-1 ${isLast ? 'invisible' : n < current ? 'bg-slate-800' : 'bg-slate-200'}`}
                  />
                </div>
                <span
                  className={`text-center text-[10px] leading-tight ${
                    isCurrent ? 'font-semibold text-slate-800' : 'text-slate-400'
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Escritorio: vertical, al lado. */}
      <nav
        aria-label="Pasos del onboarding"
        className="hidden shrink-0 flex-col justify-center md:flex"
      >
        <ol className="flex flex-col">
          {steps.map((label, i) => {
            const n = i + 1;
            const isCurrent = n === current;
            const isDone = n < current;
            const isLast = n === steps.length;
            return (
              <li key={label} className="flex gap-2">
                {/* Columna del círculo + conector, para que la línea quede centrada bajo el número. */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    disabled={!enabled}
                    onClick={() => onSelect(n)}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={circleClass(isCurrent, isDone, enabled)}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : n}
                  </button>
                  {!isLast && <span className="my-1 w-0.5 flex-1 bg-slate-200" />}
                </div>
                <button
                  type="button"
                  disabled={!enabled}
                  onClick={() => onSelect(n)}
                  className={`pb-5 text-left text-sm ${
                    isCurrent ? 'font-semibold text-slate-800' : 'text-slate-400'
                  } ${enabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  {label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
