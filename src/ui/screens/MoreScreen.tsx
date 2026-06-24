import { Link } from 'react-router-dom';
import { logout } from '../../data/authRepository';
import { useSessionStore } from '../../store/sessionStore';
import type { MenuItem } from './MenuItem';

// Pantalla "Más": administración (CLAUDE.md §8.4). Cada enlace lleva a un CRUD. Los que
// aún no existen se irán habilitando en sus pasos del plan.
const ITEMS: MenuItem[] = [
  { to: '/mas/cuentas', label: 'Cuentas', hint: 'Saldos, reservado y disponible', ready: true },
  { to: '/mas/tarjetas', label: 'Tarjetas', hint: 'Cupo y deuda', ready: true },
  { to: '/mas/creditos', label: 'Créditos', hint: 'Amortización y progreso', ready: true },
  { to: '/mas/categorias', label: 'Categorías', hint: 'Administrar categorías', ready: false },
  { to: '/mas/fijos', label: 'Obligaciones fijas', hint: 'Plantilla mensual', ready: true },
  { to: '/mas/presupuestos', label: 'Presupuestos', hint: 'Topes por categoría', ready: true },
  { to: '/mas/datos', label: 'Sembrar mis datos', hint: 'Carga inicial (temporal)', ready: true },
];

export function MoreScreen() {
  const user = useSessionStore((s) => s.user);

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
                <span className="text-slate-300">›</span>
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

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">
          Sesión:{' '}
          <span className="font-medium text-slate-700">{user?.email ?? user?.displayName}</span>
        </p>
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
