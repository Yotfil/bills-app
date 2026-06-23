import { useAuthSync } from './ui/hooks/useAuthSync';
import { useSessionStore } from './store/sessionStore';
import { LoginScreen } from './ui/screens/LoginScreen';
import { AppShell } from './ui/screens/AppShell';

// Raíz: decide qué mostrar según el estado de la sesión (CLAUDE.md §3).
//   loading         → splash mientras Firebase resuelve si hay sesión
//   unauthenticated → pantalla de login
//   authenticated   → la app
function App() {
  useAuthSync();
  const status = useSessionStore((s) => s.status);

  if (status === 'loading') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50">
        <p className="animate-pulse text-slate-400">Cargando…</p>
      </main>
    );
  }

  return status === 'authenticated' ? <AppShell /> : <LoginScreen />;
}

export default App;
