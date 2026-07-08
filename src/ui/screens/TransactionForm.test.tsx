import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TransactionForm } from './TransactionForm';
import { useSessionStore } from '../../store/sessionStore';
import { useEntryPrefsStore } from '../../store/entryPrefsStore';
import { createTransaction } from '../../data/transactionService';
import type { Account, Category, CreditCard, TransactionDraft } from '../../domain/types';

// Mockeamos repos y servicio: el form no debe tocar Firestore en tests (§13.2).
const sampleAccount = {
  id: 'acc-1',
  name: 'Bancolombia',
  archived: false,
} as unknown as Account;

// Cuentas en divisa: sus movimientos se capturan en USD (decisión 2026-07-09).
const usdAccount = {
  id: 'acc-usd',
  name: 'Global66',
  archived: false,
  foreignCurrency: 'USD',
  foreignAmount: 12782,
} as unknown as Account;

const usdAccount2 = {
  id: 'acc-usd-2',
  name: 'Wise',
  archived: false,
  foreignCurrency: 'USD',
  foreignAmount: 500,
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
    cb([sampleAccount, usdAccount, usdAccount2]);
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
// Tarjeta que puede cobrar en USD (tarjeta mixta, 2026-07-07).
const usdCard = {
  id: 'tc-usd',
  name: 'TC Global',
  archived: false,
  creditLimit: 10_000_000,
  cachedDebt: 0,
  foreignCurrency: 'USD',
} as unknown as CreditCard;
vi.mock('../../data/cardRepository', () => ({
  subscribeCards: (_uid: string, cb: (items: unknown[]) => void) => {
    cb([usdCard]);
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

  it('con cuenta COP el monto sigue en COP (sin selector de moneda)', () => {
    render(<TransactionForm onDone={vi.fn()} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'account:acc-1' } });
    expect(screen.getByText('Monto (COP)')).toBeInTheDocument();
    expect(screen.queryByText('Moneda del gasto')).not.toBeInTheDocument();
  });

  it('gasto con tarjeta que cobra en divisa: elegir USD guarda el gasto en esa moneda', async () => {
    render(<TransactionForm onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Comidas/ })); // categoría requerida
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'card:tc-usd' } });
    // Aparece el selector de moneda; por defecto COP.
    expect(screen.getByText('Moneda del gasto')).toBeInTheDocument();
    expect(screen.getByText('Monto (COP)')).toBeInTheDocument();
    // Elegir USD → el monto se pide en esa moneda.
    fireEvent.click(screen.getByRole('button', { name: 'USD' }));
    expect(screen.getByText('Monto (USD)')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '52.1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await vi.waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    const draft = mockedCreate.mock.calls[0]![1] as TransactionDraft;
    expect(draft.type).toBe('expense');
    expect(draft.amount).toBe(208_400); // 52.1 USD × 4.000 (para el Registro/reportes)
    expect(draft.foreignCurrency).toBe('USD');
    expect(draft.foreignAmount).toBe(52.1);
    expect(draft.source).toEqual({ kind: 'card', id: 'tc-usd' });
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

  it('transferencia: el destino ofrece todas las cuentas menos el origen (permite cross-moneda)', () => {
    render(<TransactionForm onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Transferencia' }));
    const [sourceSelect, destSelect] = screen.getAllByRole('combobox') as HTMLSelectElement[];

    // Origen USD → destino ofrece la otra USD y también la COP (cambio de moneda permitido);
    // no se ofrece a sí misma.
    fireEvent.change(sourceSelect!, { target: { value: 'account:acc-usd' } });
    const destValues = Array.from(destSelect!.options).map((o) => o.value);
    expect(destValues).toContain('account:acc-usd-2');
    expect(destValues).toContain('account:acc-1');
    expect(destValues).not.toContain('account:acc-usd');
  });

  it('transferencia USD↔USD: un monto en USD, COP convertido y campos foreign', async () => {
    render(<TransactionForm onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Transferencia' }));
    const [sourceSelect, destSelect] = screen.getAllByRole('combobox') as HTMLSelectElement[];
    fireEvent.change(sourceSelect!, { target: { value: 'account:acc-usd' } });
    fireEvent.change(destSelect!, { target: { value: 'account:acc-usd-2' } });
    expect(screen.getByText('Monto (USD)')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '200' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await vi.waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    const draft = mockedCreate.mock.calls[0]![1] as TransactionDraft;
    expect(draft.type).toBe('transfer');
    expect(draft.amount).toBe(800_000); // 200 USD × 4.000
    expect(draft.foreignCurrency).toBe('USD');
    expect(draft.foreignAmount).toBe(200);
    expect(draft.source).toEqual({ kind: 'account', id: 'acc-usd' });
    expect(draft.destination).toEqual({ kind: 'account', id: 'acc-usd-2' });
  });

  it('transferencia entre monedas distintas: NO limpia el destino y pide los dos montos por lado', () => {
    render(<TransactionForm onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Transferencia' }));
    const [sourceSelect, destSelect] = screen.getAllByRole('combobox') as HTMLSelectElement[];
    fireEvent.change(sourceSelect!, { target: { value: 'account:acc-usd' } });
    fireEvent.change(destSelect!, { target: { value: 'account:acc-1' } });
    // El destino se conserva (cross-moneda permitido) y aparecen los dos campos manuales por lado.
    expect(destSelect!.value).toBe('account:acc-1');
    expect(screen.getByText(/Sale de Global66 \(USD\)/)).toBeInTheDocument();
    expect(screen.getByText(/Entra a Bancolombia \(COP\)/)).toBeInTheDocument();
  });

  it('transferencia cross-moneda USD→COP: guarda montos por lado (el COP real ancla neto cero)', async () => {
    render(<TransactionForm onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Transferencia' }));
    const [sourceSelect, destSelect] = screen.getAllByRole('combobox') as HTMLSelectElement[];
    fireEvent.change(sourceSelect!, { target: { value: 'account:acc-usd' } });
    fireEvent.change(destSelect!, { target: { value: 'account:acc-1' } });
    const [outInput, inInput] = screen.getAllByPlaceholderText('0') as HTMLInputElement[];
    fireEvent.change(outInput!, { target: { value: '2000' } }); // 2.000 USD salen de Global66
    fireEvent.change(inInput!, { target: { value: '6832900' } }); // 6.832.900 COP entran a Bancolombia
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await vi.waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    const draft = mockedCreate.mock.calls[0]![1] as TransactionDraft;
    expect(draft.type).toBe('transfer');
    // El COP real de la operación (lo que ENTRA) ancla ambas patas → ledger COP neto cero.
    expect(draft.amount).toBe(6_832_900);
    expect(draft.destinationAmount).toBe(6_832_900);
    expect(draft.foreignCurrency).toBe('USD');
    expect(draft.foreignAmount).toBe(2000);
    expect(draft.destinationForeignCurrency).toBeNull();
    expect(draft.destinationForeignAmount).toBeNull();
    expect(draft.source).toEqual({ kind: 'account', id: 'acc-usd' });
    expect(draft.destination).toEqual({ kind: 'account', id: 'acc-1' });
  });

  it('transferencia cross-moneda COP→USD: la divisa recibida se guarda en la pata de destino', async () => {
    render(<TransactionForm onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Transferencia' }));
    const [sourceSelect, destSelect] = screen.getAllByRole('combobox') as HTMLSelectElement[];
    fireEvent.change(sourceSelect!, { target: { value: 'account:acc-1' } });
    fireEvent.change(destSelect!, { target: { value: 'account:acc-usd' } });
    const [outInput, inInput] = screen.getAllByPlaceholderText('0') as HTMLInputElement[];
    fireEvent.change(outInput!, { target: { value: '7000000' } }); // 7.000.000 COP salen de Bancolombia
    fireEvent.change(inInput!, { target: { value: '1750' } }); // 1.750 USD entran a Global66
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await vi.waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    const draft = mockedCreate.mock.calls[0]![1] as TransactionDraft;
    expect(draft.amount).toBe(7_000_000);
    expect(draft.destinationAmount).toBe(7_000_000);
    expect(draft.foreignCurrency).toBeNull();
    expect(draft.foreignAmount).toBeNull();
    expect(draft.destinationForeignCurrency).toBe('USD');
    expect(draft.destinationForeignAmount).toBe(1750);
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
