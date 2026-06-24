import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthSync } from './ui/hooks/useAuthSync';
import { useSessionStore } from './store/sessionStore';
import { LoginScreen } from './ui/screens/LoginScreen';
import { AppLayout } from './ui/AppLayout';
import { MoreScreen } from './ui/screens/MoreScreen';
import { AccountsScreen } from './ui/screens/AccountsScreen';
import { CardsScreen } from './ui/screens/CardsScreen';
import { AddTransactionScreen } from './ui/screens/AddTransactionScreen';
import { RegistroScreen } from './ui/screens/RegistroScreen';
import { DashboardScreen } from './ui/screens/dashboard/DashboardScreen';
import { Placeholder } from './ui/screens/Placeholder';

// Raíz: decide qué mostrar según el estado de la sesión (CLAUDE.md §3).
//   loading         → splash mientras Firebase resuelve si hay sesión
//   unauthenticated → pantalla de login
//   authenticated   → la app (router + barra inferior)
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

  if (status !== 'authenticated') {
    return <LoginScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardScreen />} />
          <Route path="/registro" element={<RegistroScreen />} />
          <Route path="/agregar" element={<AddTransactionScreen />} />
          <Route path="/fijos" element={<Placeholder title="Fijos" step="Paso 9" />} />
          <Route path="/mas" element={<MoreScreen />} />
          <Route path="/mas/cuentas" element={<AccountsScreen />} />
          <Route path="/mas/tarjetas" element={<CardsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
