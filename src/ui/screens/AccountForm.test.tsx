import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AccountForm } from './AccountForm';
import { useSessionStore } from '../../store/sessionStore';
import { createAccount } from '../../data/accountRepository';
import type { ExchangeRateTable } from '../../domain/ExchangeRateTable';

// Mockeamos repos y la tabla de tasas: el form no debe tocar Firestore ni la red (§13.2).
vi.mock('../../data/accountRepository', () => ({
  createAccount: vi.fn(async () => 'acc-1'),
  updateAccount: vi.fn(async () => undefined),
}));

const table: ExchangeRateTable = {
  rates: { USD: 1, COP: 4000, EUR: 0.8 },
  date: '2026-07-03',
  source: 'exchangerate-api',
};
vi.mock('../hooks/useUsdRateTable', () => ({
  useUsdRateTable: () => ({ table, loading: false }),
}));

const mockedCreate = vi.mocked(createAccount);

beforeEach(() => {
  mockedCreate.mockClear();
  useSessionStore.setState({
    user: { uid: 'u1', email: 'a@b.co', displayName: null },
    status: 'authenticated',
  });
});

const renderForm = () => render(<AccountForm open onClose={() => {}} />);

describe('AccountForm — moneda extranjera', () => {
  it('ofrece las monedas de la tabla (sin COP: COP es el default "sin divisa")', () => {
    renderForm();
    const select = screen.getByLabelText('Moneda de la cuenta') as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toEqual(['', 'EUR', 'USD']); // '' = COP (pesos)
  });

  it('al elegir divisa, el saldo COP se deshabilita y se autollena con la conversión', () => {
    renderForm();
    fireEvent.change(screen.getByLabelText('Moneda de la cuenta'), { target: { value: 'USD' } });
    fireEvent.change(screen.getByPlaceholderText('p.ej. 12.782,50'), {
      target: { value: '100' },
    });
    const cop = screen.getByPlaceholderText('Saldo inicial (COP)') as HTMLInputElement;
    expect(cop).toBeDisabled();
    expect(cop.value).toBe('400.000'); // 100 USD × 4.000
  });

  it('crea la cuenta con el COP convertido y el monto decimal en divisa', async () => {
    renderForm();
    fireEvent.change(screen.getByPlaceholderText('Nombre (p.ej. Bancolombia)'), {
      target: { value: 'Global66' },
    });
    fireEvent.change(screen.getByLabelText('Moneda de la cuenta'), { target: { value: 'USD' } });
    fireEvent.change(screen.getByPlaceholderText('p.ej. 12.782,50'), {
      target: { value: '100,5' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedCreate).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        initialBalance: 402_000, // 100.5 × 4.000
        foreignCurrency: 'USD',
        foreignAmount: 100.5,
      }),
    );
  });

  it('sin divisa (default COP) crea la cuenta con el saldo escrito y sin campos foreign', async () => {
    renderForm();
    fireEvent.change(screen.getByPlaceholderText('Nombre (p.ej. Bancolombia)'), {
      target: { value: 'Nu' },
    });
    fireEvent.change(screen.getByPlaceholderText('Saldo inicial (COP)'), {
      target: { value: '250000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedCreate).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        initialBalance: 250_000,
        foreignCurrency: null,
        foreignAmount: null,
      }),
    );
  });

  it('con divisa elegida pero sin monto, muestra error y no crea', async () => {
    renderForm();
    fireEvent.change(screen.getByPlaceholderText('Nombre (p.ej. Bancolombia)'), {
      target: { value: 'Global66' },
    });
    fireEvent.change(screen.getByLabelText('Moneda de la cuenta'), { target: { value: 'USD' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ingresa el monto en USD');
    expect(mockedCreate).not.toHaveBeenCalled();
  });
});
