import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import type { BackButtonProps } from './BackButtonProps';

// Enlace para volver a una pantalla anterior. Por defecto vuelve al menú "Más" (Cuentas,
// Tarjetas, etc.); acepta un destino/etiqueta propios para pantallas más profundas (p. ej.
// los movimientos de una cuenta vuelven a la lista de Cuentas).
export function BackButton({ to = '/mas', label = 'Volver a Más' }: BackButtonProps = {}) {
  return (
    <Link
      to={to}
      className="-ml-1 inline-flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
    >
      <ChevronLeft className="h-4 w-4" /> {label}
    </Link>
  );
}
