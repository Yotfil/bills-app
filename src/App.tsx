import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthSync } from './ui/hooks/useAuthSync';
import { useUserSettings } from './ui/hooks/useUserSettings';
import { useSessionStore } from './store/sessionStore';
import { LoginScreen } from './ui/screens/LoginScreen';
import { NoAccessScreen } from './ui/screens/NoAccessScreen';
import { OnboardingScreen } from './ui/screens/onboarding/OnboardingScreen';
import { Splash } from './ui/components/Splash';
import { AppLayout } from './ui/AppLayout';
import { MoreScreen } from './ui/screens/MoreScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { AccountsScreen } from './ui/screens/AccountsScreen';
import { CardsScreen } from './ui/screens/CardsScreen';
import { AddTransactionScreen } from './ui/screens/AddTransactionScreen';
import { RegistroScreen } from './ui/screens/RegistroScreen';
import { DashboardScreen } from './ui/screens/dashboard/DashboardScreen';
import { FijosScreen } from './ui/screens/fijos/FijosScreen';
import { PlantillaScreen } from './ui/screens/plantilla/PlantillaScreen';
import { BudgetHistoryScreen } from './ui/screens/budgets/BudgetHistoryScreen';
import { LoansScreen } from './ui/screens/loans/LoansScreen';
import { CategoriesScreen } from './ui/screens/categories/CategoriesScreen';
import { ArchivedScreen } from './ui/screens/archived/ArchivedScreen';
import { ReportsScreen } from './ui/screens/reports/ReportsScreen';
import { SubscriptionsScreen } from './ui/screens/subscriptions/SubscriptionsScreen';

// Raíz: decide qué mostrar según el estado de la sesión (CLAUDE.md §3).
//   loading         → splash mientras Firebase resuelve si hay sesión
//   unauthenticated → pantalla de login
//   authenticated   → la app (router + barra inferior)
function App() {
  useAuthSync();
  const status = useSessionStore((s) => s.status);
  const access = useSessionStore((s) => s.access);
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

  // Autenticado pero aún verificando la allowlist (early access): spinner hasta resolver.
  if (access === 'checking' || access === 'unknown') return <Splash />;

  // Autenticado pero sin acceso aprobado: pantalla de "acceso por invitación" (la cuenta
  // existe en Auth, pero las reglas le niegan todo dato hasta que el dueño habilite su correo).
  if (access === 'denied') return <NoAccessScreen />;

  // Aprobado: esperamos el doc de ajustes. El onboarding NO atrapa: se puede saltar (queda
  // marcado como completado) y volver luego a `/onboarding` desde el dashboard (§7).
  if (settingsLoading || !settings) return <Splash />;

  return (
    <BrowserRouter>
      {settings.onboardingCompleted ? (
        <Routes>
          <Route path="/onboarding" element={<OnboardingScreen />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardScreen />} />
            <Route path="/registro" element={<RegistroScreen />} />
            <Route path="/agregar" element={<AddTransactionScreen />} />
            <Route path="/fijos" element={<FijosScreen />} />
            <Route path="/mas" element={<MoreScreen />} />
            <Route path="/mas/cuentas" element={<AccountsScreen />} />
            <Route path="/mas/ahorros" element={<AccountsScreen savingsBucket />} />
            <Route path="/mas/tarjetas" element={<CardsScreen />} />
            <Route path="/mas/fijos" element={<PlantillaScreen />} />
            {/* Ruta vieja: la plantilla de presupuestos ahora es un tab de Plantilla. */}
            <Route
              path="/mas/presupuestos"
              element={<Navigate to="/mas/fijos?tab=presupuestos" replace />}
            />
            <Route path="/mas/presupuestos/historico" element={<BudgetHistoryScreen />} />
            <Route path="/mas/creditos" element={<LoansScreen />} />
            <Route path="/mas/categorias" element={<CategoriesScreen />} />
            <Route path="/mas/reportes" element={<ReportsScreen />} />
            <Route path="/mas/suscripciones" element={<SubscriptionsScreen />} />
            <Route path="/mas/archivados" element={<ArchivedScreen />} />
            <Route path="/mas/ajustes" element={<SettingsScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      ) : (
        // Aún sin onboarding: cualquier ruta muestra el onboarding (sin redirecciones que atrapen).
        <Routes>
          <Route path="*" element={<OnboardingScreen />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;
