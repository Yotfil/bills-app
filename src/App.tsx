import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthSync } from './ui/hooks/useAuthSync';
import { useUserSettings } from './ui/hooks/useUserSettings';
import { useSessionStore } from './store/sessionStore';
import { LoginScreen } from './ui/screens/LoginScreen';
import { OnboardingScreen } from './ui/screens/onboarding/OnboardingScreen';
import { Splash } from './ui/components/Splash';
import { AppLayout } from './ui/AppLayout';
import { MoreScreen } from './ui/screens/MoreScreen';
import { AccountsScreen } from './ui/screens/AccountsScreen';
import { CardsScreen } from './ui/screens/CardsScreen';
import { AddTransactionScreen } from './ui/screens/AddTransactionScreen';
import { RegistroScreen } from './ui/screens/RegistroScreen';
import { DashboardScreen } from './ui/screens/dashboard/DashboardScreen';
import { FijosScreen } from './ui/screens/fijos/FijosScreen';
import { FixedTemplatesScreen } from './ui/screens/fijos/FixedTemplatesScreen';
import { BudgetsScreen } from './ui/screens/budgets/BudgetsScreen';
import { LoansScreen } from './ui/screens/loans/LoansScreen';
import { SeedDataScreen } from './ui/screens/admin/SeedDataScreen';

// Raíz: decide qué mostrar según el estado de la sesión (CLAUDE.md §3).
//   loading         → splash mientras Firebase resuelve si hay sesión
//   unauthenticated → pantalla de login
//   authenticated   → la app (router + barra inferior)
function App() {
  useAuthSync();
  const status = useSessionStore((s) => s.status);
  const { settings, loading: settingsLoading } = useUserSettings();

  if (status === 'loading') return <Splash />;

  // Sin sesión: el login dentro del Router; cualquier ruta privada cae en "/" (no se queda
  // "colgada" en la barra de direcciones tras cerrar sesión).
  if (status !== 'authenticated') {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // Autenticado: esperamos el doc de ajustes; si el onboarding no está hecho, lo mostramos (§7).
  if (settingsLoading || !settings) return <Splash />;
  if (!settings.onboardingCompleted) return <OnboardingScreen />;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardScreen />} />
          <Route path="/registro" element={<RegistroScreen />} />
          <Route path="/agregar" element={<AddTransactionScreen />} />
          <Route path="/fijos" element={<FijosScreen />} />
          <Route path="/mas" element={<MoreScreen />} />
          <Route path="/mas/cuentas" element={<AccountsScreen />} />
          <Route path="/mas/tarjetas" element={<CardsScreen />} />
          <Route path="/mas/fijos" element={<FixedTemplatesScreen />} />
          <Route path="/mas/presupuestos" element={<BudgetsScreen />} />
          <Route path="/mas/creditos" element={<LoansScreen />} />
          <Route path="/mas/datos" element={<SeedDataScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
