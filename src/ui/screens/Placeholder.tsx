import type { PlaceholderProps } from './PlaceholderProps';

// Pantalla provisional para los destinos que se construyen en pasos posteriores (§14).
export function Placeholder({ title, step }: PlaceholderProps) {
  return (
    <div className="flex flex-col gap-2 p-6 pb-24">
      <h1 className="text-xl font-bold text-slate-800">{title}</h1>
      <p className="text-slate-500">En construcción — llega en el {step}.</p>
    </div>
  );
}
