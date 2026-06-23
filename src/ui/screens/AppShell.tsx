import { logout } from '../../data/authRepository';
import { useSessionStore } from '../../store/sessionStore';

// Placeholder de la app autenticada. La navegación real (barra inferior, pantallas
// Inicio/Registro/Fijos/Más — CLAUDE.md §8) llega en pasos posteriores. Por ahora
// confirma que la sesión funciona y permite cerrarla.
export function AppShell() {
  const user = useSessionStore((s) => s.user);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
      <h1 className="text-2xl font-bold text-slate-800">Finanzas</h1>
      <p className="text-slate-500">
        Sesión iniciada como{' '}
        <span className="font-medium text-slate-700">{user?.email ?? user?.displayName}</span>
      </p>
      <button
        type="button"
        onClick={() => void logout()}
        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
      >
        Cerrar sesión
      </button>
    </main>
  );
}
