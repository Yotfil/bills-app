import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import { DashboardScreen } from './DashboardScreen';
import { useSessionStore } from '../../../store/sessionStore';
import type { Account, Category, Transaction } from '../../../domain/types';

const now = Timestamp.fromDate(new Date());

const account = {
  id: 'a',
  type: 'savings',
  cachedBalance: 1_000_000,
  archived: false,
} as unknown as Account;
const category = {
  id: 'c1',
  name: 'Comidas',
  color: '#f97316',
  isSystem: false,
  archived: false,
} as unknown as Category;
const txns = [
  { id: 't1', type: 'income', amount: 3_000_000, date: now, categoryId: null, tags: [] },
  { id: 't2', type: 'expense', amount: 200_000, date: now, categoryId: 'c1', tags: [] },
] as unknown as Transaction[];

vi.mock('../../../data/accountRepository', () => ({
  subscribeAccounts: (_uid: string, cb: (i: Account[]) => void) => {
    cb([account]);
    return () => {};
  },
}));
vi.mock('../../../data/cardRepository', () => ({
  subscribeCards: (_uid: string, cb: (i: unknown[]) => void) => {
    cb([]);
    return () => {};
  },
}));
vi.mock('../../../data/loanRepository', () => ({
  subscribeLoans: (_uid: string, cb: (i: unknown[]) => void) => {
    cb([]);
    return () => {};
  },
}));
vi.mock('../../../data/categoryRepository', () => ({
  subscribeCategories: (_uid: string, cb: (i: Category[]) => void) => {
    cb([category]);
    return () => {};
  },
}));
vi.mock('../../../data/transactionRepository', () => ({
  subscribeTransactions: (_uid: string, cb: (i: Transaction[]) => void) => {
    cb(txns);
    return () => {};
  },
}));
vi.mock('../../../data/fixedMonthlyRepository', () => ({
  subscribeFixedMonthly: (_uid: string, _month: string, cb: (i: unknown[]) => void) => {
    cb([]);
    return () => {};
  },
  subscribeAllocatedFixeds: (_uid: string, cb: (i: unknown[]) => void) => {
    cb([]);
    return () => {};
  },
}));
// Evita llamadas de red a la API de tasa durante el render del dashboard.
vi.mock('../../../data/exchangeRate/exchangeRateService', () => ({
  getUsdToCopRate: () => Promise.resolve(null),
  // Tabla del día para el COP en vivo de cuentas en divisa (decisión 2026-07-09): 1 USD = 4.000.
  getUsdRateTable: () =>
    Promise.resolve({
      rates: { USD: 1, COP: 4000 },
      date: '2026-07-09',
      source: 'exchangerate-api',
    }),
}));

beforeEach(() => {
  useSessionStore.setState({
    user: { uid: 'u1', email: 'a@b.co', displayName: null },
    status: 'authenticated',
  });
});

describe('DashboardScreen', () => {
  it('muestra el número-héroe (disponible real) con el saldo de las cuentas', () => {
    render(
      <MemoryRouter>
        <DashboardScreen />
      </MemoryRouter>,
    );
    expect(screen.getByText('Disponible real')).toBeInTheDocument();
    expect(screen.getByText(/1\.000\.000/)).toBeInTheDocument();
  });

  it('muestra el desglose por categoría del gasto del mes', () => {
    render(
      <MemoryRouter>
        <DashboardScreen />
      </MemoryRouter>,
    );
    expect(screen.getByText('¿En qué se me va?')).toBeInTheDocument();
    expect(screen.getByText('Comidas')).toBeInTheDocument();
  });

  it('oculta el acceso al onboarding cuando ya hay algo registrado (hay una cuenta)', () => {
    render(
      <MemoryRouter>
        <DashboardScreen />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/Configurar mis datos/)).not.toBeInTheDocument();
  });
});
