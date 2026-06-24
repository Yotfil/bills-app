import type { OnboardingStepProps } from './OnboardingStepProps';

// Envoltura de un paso del onboarding: título, subtítulo y contenido centrado.
export function OnboardingStep({ title, subtitle, children }: OnboardingStepProps) {
  return (
    <section className="flex flex-1 flex-col justify-center gap-4">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
