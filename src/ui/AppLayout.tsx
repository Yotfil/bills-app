import { NavLink, Outlet, useNavigate } from 'react-router-dom';

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
      <main className="mx-auto max-w-md">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-md items-center">
          <NavLink to="/" end className={navItemClass}>
            <span>🏠</span>
            Inicio
          </NavLink>
          <NavLink to="/registro" className={navItemClass}>
            <span>📋</span>
            Registro
          </NavLink>

          {/* Botón central destacado para registrar (Paso 7). */}
          <button
            type="button"
            onClick={() => navigate('/agregar')}
            aria-label="Agregar movimiento"
            className="mx-1 -mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-2xl text-white shadow-lg"
          >
            +
          </button>

          <NavLink to="/fijos" className={navItemClass}>
            <span>📌</span>
            Fijos
          </NavLink>
          <NavLink to="/mas" className={navItemClass}>
            <span>⋯</span>
            Más
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
