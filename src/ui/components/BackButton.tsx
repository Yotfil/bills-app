import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

// Enlace para volver al menú "Más" desde sus sub-pantallas (Cuentas, Tarjetas, etc.).
export function BackButton() {
  return (
    <Link
      to="/mas"
      className="-ml-1 inline-flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
    >
      <ChevronLeft className="h-4 w-4" /> Volver a Más
    </Link>
  );
}
