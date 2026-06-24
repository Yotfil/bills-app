import type { OnboardingItemListProps } from './OnboardingItemListProps';

// Lista de lo ya agregado en un paso del onboarding (cuentas/tarjetas/créditos).
export function OnboardingItemList({ items, empty }: OnboardingItemListProps) {
  if (items.length === 0) {
    return <p className="text-center text-sm text-slate-400">{empty}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((it) => (
        <li
          key={it.id}
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
        >
          <span className="font-medium text-slate-700">{it.primary}</span>
          <span className="text-sm text-slate-400">{it.secondary}</span>
        </li>
      ))}
    </ul>
  );
}
