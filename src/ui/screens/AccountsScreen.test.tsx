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

vi.mock('../../data/accountRepository', () => ({
  subscribeAccounts: (_uid: string, cb: (items: Account[]) => void) => {
    cb([sampleAccount]);
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
    expect(screen.getByText('Ahorros')).toBeInTheDocument();
  });

  it('muestra el saldo y el disponible (reservado 0 sin fijos)', () => {
    renderScreen();
    // Saldo y disponible son ambos 1.000.000 cuando no hay reservado.
    expect(screen.getAllByText(/1\.000\.000/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Disponible')).toBeInTheDocument();
  });
});
