// Repositorio de tarjetas de crédito (CLAUDE.md §5.5, §8.4). La tarjeta es un medio de pago
// con cupo y deuda; el cupo disponible es derivado (creditLimit − cachedDebt).
import { cardsCol } from './collections';
import {
  archive,
  create,
  hardDelete,
  subscribeAll,
  unarchive,
  update,
  type CreateInput,
  type UpdateInput,
} from './crud';
import type { CreditCard } from '../domain/types';
import type { NewCard } from './NewCard';

export type { NewCard } from './NewCard';

/** Construye el documento a crear (función pura, testeable). */
export function buildCardCreateInput(input: NewCard): CreateInput<CreditCard> {
  return {
    name: input.name.trim(),
    creditLimit: input.creditLimit,
    initialDebt: input.initialDebt, // semilla persistida para el recálculo total (§9.3)
    cachedDebt: input.initialDebt, // la deuda arranca igual a la semilla
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

export const unarchiveCard = (uid: string, id: string) => unarchive(cardsCol(uid), id);

// Borrado físico: solo si la tarjeta NO tiene movimientos asociados (§8.4).
export const deleteCard = (uid: string, id: string) => hardDelete(cardsCol(uid), id);
