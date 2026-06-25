// Plantilla de fijos sugerida del onboarding (CLAUDE.md §7, §10). Es una lista GENÉRICA de
// gastos fijos comunes a cualquier hogar, con monto en 0: el usuario ajusta montos, medios y
// agrega los suyos después. NO debe contener datos personales del dueño (nombres, montos
// reales, suscripciones propias); esto se siembra a TODO usuario nuevo en el onboarding.
// Los abonos a deuda se agregan luego, cuando existan las tarjetas/créditos destino.
import { listAll } from './crud';
import { fixedTemplatesCol } from './collections';
import { createFixedTemplate } from './fixedTemplateRepository';
import type { Category, EntityRef } from '../domain/types';

interface SuggestedItem {
  name: string;
  amount: number;
  category: string; // nombre de la categoría base (§6)
}

// Lista genérica para cualquier hogar, en 0. El usuario ajusta montos y agrega los suyos.
const SUGGESTED: SuggestedItem[] = [
  { name: 'Arriendo', amount: 0, category: 'Vivienda' },
  { name: 'Luz', amount: 0, category: 'Servicios' },
  { name: 'Agua', amount: 0, category: 'Servicios' },
  { name: 'Gas', amount: 0, category: 'Servicios' },
  { name: 'Internet', amount: 0, category: 'Servicios' },
  { name: 'Celular', amount: 0, category: 'Servicios' },
  { name: 'Mercado', amount: 0, category: 'Mercado' },
];

/**
 * Siembra la plantilla sugerida si el usuario aún no tiene ninguna (idempotente). Resuelve la
 * categoría por nombre y usa la cuenta por defecto dada. Devuelve cuántas creó.
 */
export async function seedSuggestedFixedTemplates(
  uid: string,
  defaultPaymentMethod: EntityRef,
  categories: Category[],
): Promise<number> {
  const existing = await listAll(fixedTemplatesCol(uid));
  if (existing.length > 0) return 0;

  const categoryIdByName = new Map(categories.map((c) => [c.name, c.id]));
  const toCreate = SUGGESTED.filter((item) => categoryIdByName.has(item.category));

  await Promise.all(
    toCreate.map((item, index) =>
      createFixedTemplate(uid, {
        name: item.name,
        budgetedAmount: item.amount,
        categoryId: categoryIdByName.get(item.category)!,
        defaultPaymentMethod,
        payKind: 'expense',
        debtTargetId: null,
        sortOrder: index,
      }),
    ),
  );
  return toCreate.length;
}
