// Repositorio de cuentas (CLAUDE.md §5.1, §8.4). Ata el CRUD genérico a la colección de
// cuentas y arma los valores por defecto al crear. La lógica de saldos NO vive aquí.
import { accountsCol } from './collections';
import { archive, create, subscribeAll, update, type CreateInput, type UpdateInput } from './crud';
import type { Account } from '../domain/types';
import type { NewAccount } from './NewAccount';

export type { NewAccount } from './NewAccount';

/**
 * Construye el documento a crear (función pura, testeable). El saldo arranca IGUAL a la
 * semilla: a partir de ahí solo se mueve con movimientos (§2, saldos derivados).
 */
export function buildAccountCreateInput(input: NewAccount): CreateInput<Account> {
  return {
    name: input.name.trim(),
    type: input.type,
    initialBalance: input.initialBalance,
    cachedBalance: input.initialBalance,
    savingsBucket: input.savingsBucket ?? false,
    foreignCurrency: input.foreignCurrency ?? null,
    foreignAmount: input.foreignAmount ?? null,
    color: input.color ?? '#64748b',
    icon: input.icon ?? 'wallet',
    sortOrder: input.sortOrder ?? 0,
    archived: false,
    archivedAt: null,
  };
}

export const subscribeAccounts = (uid: string, onChange: (items: Account[]) => void) =>
  subscribeAll(accountsCol(uid), onChange);

export const createAccount = (uid: string, input: NewAccount) =>
  create(accountsCol(uid), buildAccountCreateInput(input));

// El saldo no se edita a mano (se corrige reconciliando, §5.7). Aquí solo metadatos.
export type EditableAccountFields = Pick<
  UpdateInput<Account>,
  | 'name'
  | 'type'
  | 'savingsBucket'
  | 'foreignCurrency'
  | 'foreignAmount'
  | 'color'
  | 'icon'
  | 'sortOrder'
>;

export const updateAccount = (uid: string, id: string, data: EditableAccountFields) =>
  update(accountsCol(uid), id, data);

export const archiveAccount = (uid: string, id: string) => archive(accountsCol(uid), id);
