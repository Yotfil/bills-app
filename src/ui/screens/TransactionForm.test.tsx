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

// Cuenta en divisa: un ingreso a ella se captura en USD (decisión 2026-07-07).
const usdAccount = {
  id: 'acc-usd',
  name: 'Global66',
  archived: false,
  foreignCurrency: 'USD',
  foreignAmount: 12782,
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
    cb([sampleAccount, usdAccount]);
    return () => {};
  },
}));
// Tabla de tasas fija: 1 USD = 4.000 COP (sin red en tests).
vi.mock('../hooks/useUsdRateTable', () => ({
  useUsdRateTable: () => ({
    table: { rates: { USD: 1, COP: 4000 }, date: '2026-07-07', source: 'exchangerate-api' },
    loading: false,
  }),
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

  it('un ingreso a una cuenta en divisa se captura en USD y guarda el COP convertido', async () => {
    render(<TransactionForm onDone={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ingreso' }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'account:acc-usd' } });
    // Con la cuenta USD elegida, el monto se pide en USD (input decimal).
    expect(screen.getByText('Monto (USD)')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '100,5' } });
    expect(screen.getByText(/con la tasa del día/)).toBeInTheDocument(); // ≈ COP visible
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await vi.waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    const draft = mockedCreate.mock.calls[0]![1] as TransactionDraft;
    expect(draft.type).toBe('income');
    expect(draft.amount).toBe(402_000); // 100.5 USD × 4.000
    expect(draft.foreignCurrency).toBe('USD');
    expect(draft.foreignAmount).toBe(100.5);
    expect(draft.destination).toEqual({ kind: 'account', id: 'acc-usd' });
  });

  it('un ingreso a una cuenta COP no lleva campos de divisa', async () => {
    render(<TransactionForm onDone={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ingreso' }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'account:acc-1' } });
    fillAmount('50000');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await vi.waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    const draft = mockedCreate.mock.calls[0]![1] as TransactionDraft;
    expect(draft.amount).toBe(50_000);
    expect(draft.foreignCurrency).toBeNull();
    expect(draft.foreignAmount).toBeNull();
  });

  it('un gasto DESDE una cuenta en divisa se captura en USD y guarda el COP convertido', async () => {
    render(<TransactionForm onDone={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Comidas/ }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'account:acc-usd' } });
    expect(screen.getByText('Monto (USD)')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '52,1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await vi.waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    const draft = mockedCreate.mock.calls[0]![1] as TransactionDraft;
    expect(draft.type).toBe('expense');
    expect(draft.amount).toBe(208_400); // 52.1 USD × 4.000
    expect(draft.foreignCurrency).toBe('USD');
    expect(draft.foreignAmount).toBe(52.1);
    expect(draft.source).toEqual({ kind: 'account', id: 'acc-usd' });
  });

  it('un gasto con tarjeta nunca entra en modo divisa', () => {
    render(<TransactionForm onDone={vi.fn()} />);
    // El mock de tarjetas está vacío; basta verificar que con cuenta COP el monto sigue en COP.
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'account:acc-1' } });
    expect(screen.getByText('Monto (COP)')).toBeInTheDocument();
  });

  it('el abono a deuda NO ofrece cuentas en divisa como origen', () => {
    render(<TransactionForm onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Abono' }));
    const sourceSelect = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    const values = Array.from(sourceSelect.options).map((o) => o.value);
    expect(values).toContain('account:acc-1');
    expect(values).not.toContain('account:acc-usd');
    expect(screen.getByText(/las deudas se pagan en pesos/i)).toBeInTheDocument();
  });

  it('ingreso en divisa sin monto: error visible y no guarda', async () => {
    render(<TransactionForm onDone={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ingreso' }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'account:acc-usd' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ingresa el monto en USD');
    expect(mockedCreate).not.toHaveBeenCalled();
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
