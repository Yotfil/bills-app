import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TransactionForm } from './TransactionForm';
import { useSessionStore } from '../../store/sessionStore';
import { useEntryPrefsStore } from '../../store/entryPrefsStore';
import { createTransaction } from '../../data/transactionService';
import type { Account, Category, TransactionDraft } from '../../domain/types';

// Mockeamos repos y servicio: el form no debe tocar Firestore en tests (§13.2).
const sampleAccount = {
  id: 'acc-1',
  name: 'Bancolombia',
  archived: false,
} as unknown as Account;

const sampleCategory = {
  id: 'cat-1',
  name: 'Comidas',
  icon: '🍔',
  archived: false,
  isSystem: false,
} as unknown as Category;

vi.mock('../../data/accountRepository', () => ({
  subscribeAccounts: (_uid: string, cb: (items: Account[]) => void) => {
    cb([sampleAccount]);
    return () => {};
  },
}));
vi.mock('../../data/cardRepository', () => ({
  subscribeCards: (_uid: string, cb: (items: unknown[]) => void) => {
    cb([]);
    return () => {};
  },
}));
vi.mock('../../data/loanRepository', () => ({
  subscribeLoans: (_uid: string, cb: (items: unknown[]) => void) => {
    cb([]);
    return () => {};
  },
}));
vi.mock('../../data/categoryRepository', () => ({
  subscribeCategories: (_uid: string, cb: (items: Category[]) => void) => {
    cb([sampleCategory]);
    return () => {};
  },
}));
vi.mock('../../data/budgetRepository', () => ({
  subscribeBudgets: (_uid: string, cb: (items: unknown[]) => void) => {
    cb([]);
    return () => {};
  },
}));
vi.mock('../../data/transactionService', () => ({
  createTransaction: vi.fn(async () => 'txn-1'),
  editTransaction: vi.fn(async () => undefined),
}));

const mockedCreate = vi.mocked(createTransaction);

beforeEach(() => {
  mockedCreate.mockClear();
  mockedCreate.mockResolvedValue('txn-1');
  useSessionStore.setState({
    user: { uid: 'u1', email: 'a@b.co', displayName: null },
    status: 'authenticated',
  });
  useEntryPrefsStore.setState({ lastType: 'expense', lastSource: null });
});

const fillAmount = (value: string) =>
  fireEvent.change(screen.getByPlaceholderText('0'), { target: { value } });

describe('TransactionForm', () => {
  it('abre en gasto y guarda con monto + categoría + medio (flujo cero fricción, §5.4)', async () => {
    render(<TransactionForm onDone={vi.fn()} />);

    fillAmount('25000');
    fireEvent.click(screen.getByRole('button', { name: /Comidas/ }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'account:acc-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await vi.waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    const draft = mockedCreate.mock.calls[0]![1] as TransactionDraft;
    expect(draft.type).toBe('expense');
    expect(draft.amount).toBe(25_000);
    expect(draft.categoryId).toBe('cat-1');
    expect(draft.source).toEqual({ kind: 'account', id: 'acc-1' });
    expect(draft.concept).toBe('Comidas'); // concepto por defecto = la categoría (§5.4)
  });

  it('rechaza un gasto sin categoría con mensaje visible y NO guarda (§11)', async () => {
    render(<TransactionForm onDone={vi.fn()} />);

    fillAmount('10000');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'account:acc-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Elige una categoría.')).toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('prellena el medio de pago con el último usado (§5.4)', () => {
    useEntryPrefsStore.setState({ lastSource: { kind: 'account', id: 'acc-1' } });
    render(<TransactionForm onDone={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveValue('account:acc-1');
  });

  it('si el guardado falla, muestra el error y no cierra el form', async () => {
    mockedCreate.mockRejectedValueOnce(new Error('sin red'));
    const onDone = vi.fn();
    render(<TransactionForm onDone={onDone} />);

    fillAmount('10000');
    fireEvent.click(screen.getByRole('button', { name: /Comidas/ }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'account:acc-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    // No fijamos el texto exacto (cambia con el manejo de errores): basta el rol de alerta.
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });
});
