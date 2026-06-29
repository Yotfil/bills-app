import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Receipt, Pin, MoreHorizontal, Plus } from 'lucide-react';
import { Brand } from './components/Brand';
import { BudgetAlertWatcher } from './components/BudgetAlertWatcher';
import { BudgetCapMigrationWatcher } from './components/BudgetCapMigrationWatcher';
import { BackedToBudgetMigrationWatcher } from './components/BackedToBudgetMigrationWatcher';
import { MonthlyRolloverWatcher } from './components/MonthlyRolloverWatcher';

// Esqueleto de la app autenticada: contenido + barra inferior con 5 destinos (CLAUDE.md §8).
// Las pantallas de cada destino se van completando en sus pasos del plan. El botón central
// "+" (registrar movimiento) es el corazón de la app y se implementa en el Paso 7.

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
    isActive ? 'text-slate-900 font-semibold' : 'text-slate-400'
  }`;

export function AppLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* Header de marca: visible en toda la app una vez logueado (logo + "Mis Luks"). */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-md items-center justify-center px-4 py-3">
          <Brand size="sm" />
        </div>
      </header>

      <main className="mx-auto max-w-md">
        <Outlet />
      </main>

      {/* Carga automática de los fijos del mes si faltan (§5.10) + aviso de topes (§5.9). */}
      <MonthlyRolloverWatcher />
      <BudgetAlertWatcher />
      {/* Migración única: topes respaldados → su Budget (§5.9, Opción B). */}
      <BudgetCapMigrationWatcher />
      {/* Migración única: fijos respaldados → Budget de checklist (§5.9, Opción C, no destructiva). */}
      <BackedToBudgetMigrationWatcher />

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-md items-center">
          <NavLink to="/" end className={navItemClass}>
            <Home className="h-5 w-5" />
            Inicio
          </NavLink>
          <NavLink to="/registro" className={navItemClass}>
            <Receipt className="h-5 w-5" />
            Registro
          </NavLink>

          {/* Botón central destacado para registrar (Paso 7). */}
          <button
            type="button"
            onClick={() => navigate('/agregar')}
            aria-label="Agregar movimiento"
            className="mx-1 -mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-white shadow-lg"
          >
            <Plus className="h-7 w-7" />
          </button>

          <NavLink to="/fijos" className={navItemClass}>
            <Pin className="h-5 w-5" />
            Fijos
          </NavLink>
          <NavLink to="/mas" className={navItemClass}>
            <MoreHorizontal className="h-5 w-5" />
            Más
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
