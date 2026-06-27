import { Link } from 'react-router-dom';
import { ChevronRight, Settings } from 'lucide-react';
import { RecalculateBalancesButton } from './RecalculateBalancesButton';
import type { MenuItem } from './MenuItem';

// Pantalla "Más": administración (CLAUDE.md §8.4). Cada enlace lleva a un CRUD. Los que
// aún no existen se irán habilitando en sus pasos del plan.
const ITEMS: MenuItem[] = [
  { to: '/mas/cuentas', label: 'Cuentas', hint: 'Saldos, reservado y disponible', ready: true },
  { to: '/mas/tarjetas', label: 'Tarjetas', hint: 'Cupo y deuda', ready: true },
  { to: '/mas/creditos', label: 'Créditos', hint: 'Amortización y progreso', ready: true },
  {
    to: '/mas/ahorros',
    label: 'Ahorros',
    hint: 'Bolsas apartadas (no cuentan en disponible)',
    ready: true,
  },
  { to: '/mas/categorias', label: 'Categorías', hint: 'Administrar categorías', ready: true },
  { to: '/mas/fijos', label: 'Obligaciones fijas', hint: 'Plantilla mensual', ready: true },
  { to: '/mas/presupuestos', label: 'Presupuestos', hint: 'Topes por categoría', ready: true },
  {
    to: '/mas/presupuestos/historico',
    label: 'Histórico de presupuestos',
    hint: 'Gastos de meses anteriores',
    ready: true,
  },
  {
    to: '/mas/reportes',
    label: 'Reportes',
    hint: 'Tendencias, top categorías y gasto hormiga',
    ready: true,
  },
  {
    to: '/mas/archivados',
    label: 'Archivados',
    hint: 'Restaurar o eliminar lo archivado',
    ready: true,
  },
  {
    to: '/onboarding',
    label: 'Configurar mis datos',
    hint: 'Volver a los 5 pasos del onboarding',
    ready: true,
  },
];

export function MoreScreen() {
  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <h1 className="text-xl font-bold text-slate-800">Más</h1>

      <ul className="flex flex-col gap-2">
        {ITEMS.map((item) =>
          item.ready ? (
            <li key={item.to}>
              <Link
                to={item.to}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
              >
                <span>
                  <span className="block font-medium text-slate-800">{item.label}</span>
                  <span className="block text-xs text-slate-400">{item.hint}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Link>
            </li>
          ) : (
            <li
              key={item.to}
              className="flex items-center justify-between rounded-xl border border-dashed border-slate-200 p-4 opacity-60"
            >
              <span>
                <span className="block font-medium text-slate-500">{item.label}</span>
                <span className="block text-xs text-slate-400">{item.hint}</span>
              </span>
              <span className="text-xs text-slate-400">Próximamente</span>
            </li>
          ),
        )}
      </ul>

      <RecalculateBalancesButton />

      {/* Ajustes: separado del resto (margen amplio + estilo propio) para que se note aparte.
          Reúne preferencias del usuario (tema) y la sesión; a futuro, más opciones de usuario. */}
      <Link
        to="/mas/ajustes"
        className="mt-6 flex items-center gap-3 rounded-xl bg-slate-800 p-4 text-white"
      >
        <Settings className="h-5 w-5" />
        <span className="flex-1">
          <span className="block font-medium">Ajustes</span>
          <span className="block text-xs text-white/70">Tema, sesión y preferencias</span>
        </span>
        <ChevronRight className="h-4 w-4 text-white/70" />
      </Link>
    </div>
  );
}
