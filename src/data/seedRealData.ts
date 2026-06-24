// Siembra los datos reales del dueño a través de la capa de datos (repositorios), de modo que
// los saldos nacen correctos. Uso temporal: se ejecuta una vez con la cuenta vacía.
import { categoriesCol } from './collections';
import { listAll } from './crud';
import { createAccount } from './accountRepository';
import { createCard } from './cardRepository';
import { createLoan } from './loanRepository';
import { createFixedTemplate } from './fixedTemplateRepository';
import { SEED_ACCOUNTS, SEED_CARDS, SEED_FIXED, SEED_LOANS } from './realSeedData';
import type { SeedResult } from './SeedResult';
import type { EntityRef } from '../domain/types';

export type { SeedResult } from './SeedResult';

/** Siembra todo. Lanza si ya hay datos (hay que limpiar primero con clearUserData). */
export async function seedRealData(uid: string): Promise<SeedResult> {
  const existing = await listAll(categoriesCol(uid));
  const categoryIdByName = new Map(existing.map((c) => [c.name, c.id]));
  if (categoryIdByName.size === 0) {
    throw new Error('No hay categorías base. Inicia sesión primero para sembrarlas.');
  }

  const refByName = new Map<string, EntityRef>();

  for (const a of SEED_ACCOUNTS) {
    const id = await createAccount(uid, { name: a.name, type: a.type, initialBalance: a.balance });
    refByName.set(a.name, { kind: 'account', id });
  }
  for (const c of SEED_CARDS) {
    const id = await createCard(uid, {
      name: c.name,
      creditLimit: c.creditLimit,
      initialDebt: c.debt,
    });
    refByName.set(c.name, { kind: 'card', id });
  }
  for (const l of SEED_LOANS) {
    const id = await createLoan(uid, {
      name: l.name,
      originalAmount: l.original,
      currentBalance: l.balance,
      monthlyPayment: l.payment,
      annualRate: l.annualRate,
    });
    refByName.set(l.name, { kind: 'loan', id });
  }

  let index = 0;
  for (const f of SEED_FIXED) {
    const source = refByName.get(f.sourceKey);
    if (!source) throw new Error(`Fijo "${f.name}": no existe el origen "${f.sourceKey}".`);

    const categoryId =
      f.payKind === 'expense' ? (categoryIdByName.get(f.category ?? '') ?? '') : '';
    if (f.payKind === 'expense' && !categoryId) {
      throw new Error(`Fijo "${f.name}": no existe la categoría "${f.category}".`);
    }
    const debtTargetId = f.targetKey ? (refByName.get(f.targetKey)?.id ?? null) : null;
    if (f.targetKey && !debtTargetId) {
      throw new Error(`Fijo "${f.name}": no existe el destino "${f.targetKey}".`);
    }

    await createFixedTemplate(uid, {
      name: f.name,
      budgetedAmount: f.amount,
      categoryId,
      defaultPaymentMethod: source,
      payKind: f.payKind,
      debtTargetId,
      sortOrder: index++,
    });
  }

  return {
    accounts: SEED_ACCOUNTS.length,
    cards: SEED_CARDS.length,
    loans: SEED_LOANS.length,
    fixedTemplates: SEED_FIXED.length,
  };
}
