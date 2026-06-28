import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardScreen } from './DashboardScreen';
import { useSessionStore } from '../../../store/sessionStore';

// Estado vacío del Inicio (§7): sin cuentas/tarjetas/créditos, se muestra SOLO el acceso al
// onboarding y se oculta el resto del dashboard (resumen, dona…). Cada factory de vi.mock se
// hoistea al tope, así que define su suscripción "vacía" inline (no puede referenciar variables
// externas, quedarían en el TDZ).
vi.mock('../../../data/accountRepository', () => ({
  subscribeAccounts: (_uid: string, cb: (i: unknown[]) => void) => (cb([]), () => {}),
}));
vi.mock('../../../data/cardRepository', () => ({
  subscribeCards: (_uid: string, cb: (i: unknown[]) => void) => (cb([]), () => {}),
}));
vi.mock('../../../data/loanRepository', () => ({
  subscribeLoans: (_uid: string, cb: (i: unknown[]) => void) => (cb([]), () => {}),
}));
vi.mock('../../../data/categoryRepository', () => ({
  subscribeCategories: (_uid: string, cb: (i: unknown[]) => void) => (cb([]), () => {}),
}));
vi.mock('../../../data/transactionRepository', () => ({
  subscribeTransactions: (_uid: string, cb: (i: unknown[]) => void) => (cb([]), () => {}),
}));
vi.mock('../../../data/fixedMonthlyRepository', () => ({
  subscribeFixedMonthly: (_uid: string, _month: string, cb: (i: unknown[]) => void) =>
    (cb([]), () => {}),
  subscribeAllocatedFixeds: (_uid: string, cb: (i: unknown[]) => void) => (cb([]), () => {}),
}));

beforeEach(() => {
  useSessionStore.setState({
    user: { uid: 'u1', email: 'a@b.co', displayName: null },
    status: 'authenticated',
  });
});

describe('DashboardScreen (estado vacío)', () => {
  it('muestra el acceso al onboarding y oculta el resto del dashboard', () => {
    render(
      <MemoryRouter>
        <DashboardScreen />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Configurar mis datos/)).toBeInTheDocument();
    expect(screen.getByText(/Aún no tienes nada registrado/)).toBeInTheDocument();
    // El resto del dashboard NO se renderiza en el estado vacío.
    expect(screen.queryByText('¿En qué se me va?')).not.toBeInTheDocument();
    expect(screen.queryByText('Ver todo el registro')).not.toBeInTheDocument();
  });
});
