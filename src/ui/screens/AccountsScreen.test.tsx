import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AccountsScreen } from './AccountsScreen';
import { useSessionStore } from '../../store/sessionStore';
import type { Account } from '../../domain/types';

const renderScreen = () =>
  render(
    <MemoryRouter>
      <AccountsScreen />
    </MemoryRouter>,
  );

// Mockeamos el repositorio: la pantalla no debe tocar Firestore directamente.
const sampleAccount = {
  id: 'acc-1',
  name: 'Bancolombia',
  type: 'savings',
  cachedBalance: 1_000_000,
  initialBalance: 1_000_000,
  archived: false,
  sortOrder: 0,
} as unknown as Account;

// Cuenta en divisa: su saldo COP se muestra EN VIVO (foreignAmount × tasa del día).
const usdAccount = {
  id: 'acc-usd',
  name: 'Global66',
  type: 'savings',
  cachedBalance: 99, // ledger interno: NO debe mostrarse habiendo tasa
  initialBalance: 0,
  archived: false,
  sortOrder: 1,
  foreignCurrency: 'USD',
  foreignAmount: 100,
} as unknown as Account;

// Tabla del día fija: 1 USD = 4.000 COP (sin red en tests).
vi.mock('../hooks/useUsdRateTable', () => ({
  useUsdRateTable: () => ({
    table: { rates: { USD: 1, COP: 4000 }, date: '2026-07-09', source: 'exchangerate-api' },
    loading: false,
  }),
}));

vi.mock('../../data/accountRepository', () => ({
  subscribeAccounts: (_uid: string, cb: (items: Account[]) => void) => {
    cb([sampleAccount, usdAccount]);
    return () => {};
  },
  archiveAccount: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
}));

vi.mock('../../data/fixedMonthlyRepository', () => ({
  subscribeFixedMonthly: (_uid: string, _month: string, cb: (items: unknown[]) => void) => {
    cb([]);
    return () => {};
  },
  subscribeAllocatedFixeds: (_uid: string, cb: (items: unknown[]) => void) => {
    cb([]);
    return () => {};
  },
}));

beforeEach(() => {
  useSessionStore.setState({
    user: { uid: 'u1', email: 'a@b.co', displayName: null },
    status: 'authenticated',
  });
});

describe('AccountsScreen', () => {
  it('lista las cuentas activas con su nombre', () => {
    renderScreen();
    expect(screen.getByText('Bancolombia')).toBeInTheDocument();
    expect(screen.getAllByText('Ahorros').length).toBeGreaterThanOrEqual(1);
  });

  it('muestra el saldo y el disponible (reservado 0 sin fijos)', () => {
    renderScreen();
    // Saldo y disponible son ambos 1.000.000 cuando no hay reservado.
    expect(screen.getAllByText(/1\.000\.000/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Disponible').length).toBeGreaterThanOrEqual(1);
  });

  it('cuenta en divisa: el saldo COP es la conversión EN VIVO, no el cachedBalance', () => {
    renderScreen();
    expect(screen.getByText('Global66')).toBeInTheDocument();
    // 100 USD × 4.000 = 400.000 (saldo y disponible); el cachedBalance interno (99) no aparece.
    expect(screen.getAllByText(/400\.000/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/100 USD/)).toBeInTheDocument();
  });
});
