// Datos reales del dueño para la siembra inicial (uso temporal). Extraídos de sus extractos.
// Las "cajitas Nu" se tratan como CDT/inversión; Global66 como cuenta foránea (en ahorros).
// Nota: Global66 = 9.918 (pendiente confirmar si es COP o USD).
import type { AccountType, FixedPayKind } from '../domain/types';

export type SeedAccount = { name: string; type: AccountType; balance: number };
export type SeedCard = { name: string; creditLimit: number; debt: number };
export type SeedLoan = {
  name: string;
  original: number;
  balance: number;
  payment: number;
  annualRate: number;
};
// sourceKey: nombre de la cuenta/tarjeta de donde sale. targetKey: tarjeta/crédito destino (abonos).
export type SeedFixed = {
  name: string;
  amount: number;
  payKind: FixedPayKind;
  category?: string; // nombre de categoría (gastos)
  sourceKey: string;
  targetKey?: string;
};

export const SEED_ACCOUNTS: SeedAccount[] = [
  { name: 'Bancolombia', type: 'savings', balance: 1_475_049 },
  { name: 'Nu', type: 'savings', balance: 1_708 },
  { name: 'Cajitas Nu', type: 'term_deposit', balance: 5_650_428 },
  { name: 'Davivienda', type: 'savings', balance: 19_020 },
  { name: 'AV Villas', type: 'savings', balance: 40_967 },
  { name: 'Global66', type: 'savings', balance: 9_918 },
  { name: 'Efectivo', type: 'cash', balance: 150_000 },
  { name: 'Ahorros billetes 2mil', type: 'cash', balance: 200_000 },
];

export const SEED_CARDS: SeedCard[] = [
  { name: 'TC Bancolombia', creditLimit: 64_400_000, debt: 14_578_737 },
  { name: 'TC Nu', creditLimit: 3_000_000, debt: 2_459_907 },
  { name: 'TC Davivienda', creditLimit: 19_000_000, debt: 512_625 },
];

export const SEED_LOANS: SeedLoan[] = [
  {
    name: 'Préstamo AV Villas',
    original: 95_505_492,
    balance: 61_884_141,
    payment: 1_493_848,
    annualRate: 0.1467,
  },
  {
    name: 'Crédito vehicular',
    original: 125_990_000,
    balance: 118_759_907,
    payment: 2_618_131,
    annualRate: 0.1846,
  },
];

const BANCO = 'Bancolombia';

export const SEED_FIXED: SeedFixed[] = [
  // --- Gastos fijos de la lista del dueño ---
  {
    name: 'Arriendo',
    amount: 1_650_000,
    payKind: 'expense',
    category: 'Vivienda',
    sourceKey: BANCO,
  },
  {
    name: 'Combustible',
    amount: 200_000,
    payKind: 'expense',
    category: 'Transporte',
    sourceKey: BANCO,
  },
  { name: 'Luz', amount: 230_000, payKind: 'expense', category: 'Servicios', sourceKey: BANCO },
  { name: 'Agua', amount: 45_000, payKind: 'expense', category: 'Servicios', sourceKey: BANCO },
  { name: 'Gas', amount: 80_000, payKind: 'expense', category: 'Servicios', sourceKey: BANCO },
  {
    name: 'Internet hogar',
    amount: 120_000,
    payKind: 'expense',
    category: 'Servicios',
    sourceKey: BANCO,
  },
  {
    name: 'Celular (tu línea)',
    amount: 64_000,
    payKind: 'expense',
    category: 'Servicios',
    sourceKey: BANCO,
  },
  {
    name: 'Celular (Yulieth)',
    amount: 41_000,
    payKind: 'expense',
    category: 'Servicios',
    sourceKey: BANCO,
  },
  {
    name: 'Mercado hogar',
    amount: 1_600_000,
    payKind: 'expense',
    category: 'Mercado',
    sourceKey: BANCO,
  },
  {
    name: 'Cuota mercado Yulieth',
    amount: 120_000,
    payKind: 'expense',
    category: 'Familia',
    sourceKey: BANCO,
  },
  {
    name: 'Comidas en casa',
    amount: 400_000,
    payKind: 'expense',
    category: 'Mercado',
    sourceKey: BANCO,
  },
  {
    name: 'Salidas planificadas (tope)',
    amount: 400_000,
    payKind: 'expense',
    category: 'Ocio',
    sourceKey: BANCO,
  },
  {
    name: 'Colegio Luciana',
    amount: 500_000,
    payKind: 'expense',
    category: 'Educación',
    sourceKey: BANCO,
  },
  {
    name: 'Teatro Luciana',
    amount: 160_000,
    payKind: 'expense',
    category: 'Educación',
    sourceKey: BANCO,
  },
  {
    name: 'Teatro Me',
    amount: 200_000,
    payKind: 'expense',
    category: 'Educación',
    sourceKey: BANCO,
  },
  {
    name: 'Apoyo mensual a mamá',
    amount: 650_000,
    payKind: 'expense',
    category: 'Familia',
    sourceKey: BANCO,
  },
  {
    name: 'Apoyo mensual a Yulieth',
    amount: 120_000,
    payKind: 'expense',
    category: 'Familia',
    sourceKey: BANCO,
  },
  {
    name: 'Vehículo (impuestos/seguro/mtto)',
    amount: 400_000,
    payKind: 'expense',
    category: 'Vehículo',
    sourceKey: BANCO,
  },
  {
    name: 'Netflix',
    amount: 50_000,
    payKind: 'expense',
    category: 'Suscripciones',
    sourceKey: BANCO,
  },
  {
    name: 'Amazon Music',
    amount: 20_000,
    payKind: 'expense',
    category: 'Suscripciones',
    sourceKey: BANCO,
  },
  {
    name: 'HBO Max',
    amount: 15_000,
    payKind: 'expense',
    category: 'Suscripciones',
    sourceKey: BANCO,
  },
  {
    name: 'YouTube Premium',
    amount: 21_000,
    payKind: 'expense',
    category: 'Suscripciones',
    sourceKey: BANCO,
  },
  {
    name: 'Google Drive (100 GB)',
    amount: 79_000,
    payKind: 'expense',
    category: 'Suscripciones',
    sourceKey: BANCO,
  },
  {
    name: 'ChatGPT Plus',
    amount: 0,
    payKind: 'expense',
    category: 'Suscripciones',
    sourceKey: BANCO,
  },
  {
    name: 'Claude',
    amount: 400_000,
    payKind: 'expense',
    category: 'Suscripciones',
    sourceKey: BANCO,
  },
  {
    name: 'Cursor (IDE)',
    amount: 80_000,
    payKind: 'expense',
    category: 'Suscripciones',
    sourceKey: BANCO,
  },
  {
    name: 'CapCut',
    amount: 40_000,
    payKind: 'expense',
    category: 'Suscripciones',
    sourceKey: BANCO,
  },
  {
    name: 'Apple Music',
    amount: 14_000,
    payKind: 'expense',
    category: 'Suscripciones',
    sourceKey: BANCO,
  },
  { name: 'Kumon', amount: 370_000, payKind: 'expense', category: 'Educación', sourceKey: BANCO },
  { name: 'Baile', amount: 100_000, payKind: 'expense', category: 'Educación', sourceKey: BANCO },
  {
    name: 'Platzi',
    amount: 250_000,
    payKind: 'expense',
    category: 'Suscripciones',
    sourceKey: BANCO,
  },
  {
    name: 'Seguridad social',
    amount: 900_000,
    payKind: 'expense',
    category: 'Seguridad social',
    sourceKey: BANCO,
  },
  // --- Recurrentes nuevos detectados en los extractos (cuotas de manejo/seguros) ---
  {
    name: 'Manejo débito Bancolombia',
    amount: 11_175,
    payKind: 'expense',
    category: 'Otros',
    sourceKey: BANCO,
  },
  {
    name: 'Plan Protege tu Vida (seguro)',
    amount: 55_602,
    payKind: 'expense',
    category: 'Salud',
    sourceKey: BANCO,
  },
  {
    name: 'Cuota manejo TC Davivienda',
    amount: 37_000,
    payKind: 'expense',
    category: 'Otros',
    sourceKey: 'TC Davivienda',
  },
  {
    name: 'Cuota seguro TC Davivienda',
    amount: 2_990,
    payKind: 'expense',
    category: 'Salud',
    sourceKey: 'TC Davivienda',
  },
  // --- Abonos a deuda (debt_payment) ---
  {
    name: 'Pago fijo TC Davivienda',
    amount: 350_000,
    payKind: 'debt_payment',
    sourceKey: BANCO,
    targetKey: 'TC Davivienda',
  },
  {
    name: 'Préstamos AV Villas',
    amount: 1_400_000,
    payKind: 'debt_payment',
    sourceKey: BANCO,
    targetKey: 'Préstamo AV Villas',
  },
  {
    name: 'Cuota Carro',
    amount: 2_700_000,
    payKind: 'debt_payment',
    sourceKey: BANCO,
    targetKey: 'Crédito vehicular',
  },
  { name: 'Nu', amount: 500_000, payKind: 'debt_payment', sourceKey: BANCO, targetKey: 'TC Nu' },
];
