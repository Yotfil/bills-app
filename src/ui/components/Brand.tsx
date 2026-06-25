import type { BrandProps } from './BrandProps';

// Marca de la app: el logo (favicon) + el nombre "Mis Luks". Se usa en el header de la app
// (logueado) y en la pantalla de login. El logo reutiliza el mismo asset que el favicon.
export function Brand({ size = 'sm' }: BrandProps) {
  const logo = size === 'lg' ? 'h-14 w-14' : 'h-8 w-8';
  const text = size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <span className="inline-flex items-center gap-2">
      <img src="/favicon.svg" alt="" className={`${logo} rounded-lg`} />
      <span className={`font-bold text-slate-800 ${text}`}>Mis Luks</span>
    </span>
  );
}
