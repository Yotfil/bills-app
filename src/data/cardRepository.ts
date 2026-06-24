// Repositorio de tarjetas de crédito (CLAUDE.md §5.5, §8.4). La tarjeta es un medio de pago
// con cupo y deuda; el cupo disponible es derivado (creditLimit − cachedDebt).
import { cardsCol } from './collections';
import { archive, create, subscribeAll, update, type CreateInput, type UpdateInput } from './crud';
import type { CreditCard } from '../domain/types';

export interface NewCard {
  name: string;
  creditLimit: number; // cupo total
  initialDebt: number; // deuda actual al registrarla (semilla)
  color?: string;
  icon?: string;
  sortOrder?: number;
}

/** Construye el documento a crear (función pura, testeable). */
export function buildCardCreateInput(input: NewCard): CreateInput<CreditCard> {
  return {
    name: input.name.trim(),
    creditLimit: input.creditLimit,
    cachedDebt: input.initialDebt,
    color: input.color ?? '#64748b',
    icon: input.icon ?? 'credit-card',
    sortOrder: input.sortOrder ?? 0,
    archived: false,
    archivedAt: null,
  };
}

export const subscribeCards = (uid: string, onChange: (items: CreditCard[]) => void) =>
  subscribeAll(cardsCol(uid), onChange);

export const createCard = (uid: string, input: NewCard) =>
  create(cardsCol(uid), buildCardCreateInput(input));

// La deuda no se edita a mano (se mueve con gastos/abonos). Aquí solo cupo y metadatos.
export type EditableCardFields = Pick<
  UpdateInput<CreditCard>,
  'name' | 'creditLimit' | 'color' | 'icon' | 'sortOrder'
>;

export const updateCard = (uid: string, id: string, data: EditableCardFields) =>
  update(cardsCol(uid), id, data);

export const archiveCard = (uid: string, id: string) => archive(cardsCol(uid), id);
