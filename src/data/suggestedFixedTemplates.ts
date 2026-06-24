// Plantilla de fijos sugerida del onboarding (CLAUDE.md §7, §10). Solo los ítems de GASTO;
// los abonos a deuda (TC Davivienda, AV Villas, Carro, Nu) se agregan luego, cuando existan
// las tarjetas/créditos destino. Todos quedan con la cuenta por defecto elegida; el usuario
// ajusta montos y medios después.
import { listAll } from './crud';
import { fixedTemplatesCol } from './collections';
import { createFixedTemplate } from './fixedTemplateRepository';
import type { Category, EntityRef } from '../domain/types';

interface SuggestedItem {
  name: string;
  amount: number;
  category: string; // nombre de la categoría base (§6)
}

const SUGGESTED: SuggestedItem[] = [
  { name: 'Arriendo', amount: 1_650_000, category: 'Vivienda' },
  { name: 'Combustible', amount: 200_000, category: 'Transporte' },
  { name: 'Luz', amount: 230_000, category: 'Servicios' },
  { name: 'Agua', amount: 45_000, category: 'Servicios' },
  { name: 'Gas', amount: 80_000, category: 'Servicios' },
  { name: 'Internet hogar', amount: 120_000, category: 'Servicios' },
  { name: 'Celular (tu línea)', amount: 64_000, category: 'Servicios' },
  { name: 'Celular (Yulieth)', amount: 41_000, category: 'Servicios' },
  { name: 'Mercado hogar', amount: 1_600_000, category: 'Mercado' },
  { name: 'Cuota mercado Yulieth', amount: 120_000, category: 'Familia' },
  { name: 'Comidas en casa', amount: 400_000, category: 'Mercado' },
  { name: 'Salidas planificadas', amount: 400_000, category: 'Ocio' },
  { name: 'Colegio Luciana', amount: 500_000, category: 'Educación' },
  { name: 'Teatro Luciana', amount: 160_000, category: 'Educación' },
  { name: 'Teatro Me', amount: 200_000, category: 'Educación' },
  { name: 'Apoyo mensual a mamá', amount: 650_000, category: 'Familia' },
  { name: 'Apoyo mensual a Yulieth', amount: 120_000, category: 'Familia' },
  { name: 'Vehículo (impuestos/seguro/mtto)', amount: 400_000, category: 'Vehículo' },
  { name: 'Netflix', amount: 50_000, category: 'Suscripciones' },
  { name: 'Amazon Music', amount: 20_000, category: 'Suscripciones' },
  { name: 'HBO Max', amount: 15_000, category: 'Suscripciones' },
  { name: 'YouTube Premium', amount: 21_000, category: 'Suscripciones' },
  { name: 'Google Drive (100 GB)', amount: 79_000, category: 'Suscripciones' },
  { name: 'ChatGPT Plus', amount: 0, category: 'Suscripciones' },
  { name: 'Claude', amount: 90_000, category: 'Suscripciones' },
  { name: 'Cursor (IDE)', amount: 250_000, category: 'Suscripciones' },
  { name: 'CapCut', amount: 40_000, category: 'Suscripciones' },
  { name: 'Apple Music', amount: 14_000, category: 'Suscripciones' },
  { name: 'Kumon', amount: 370_000, category: 'Educación' },
  { name: 'Baile', amount: 100_000, category: 'Educación' },
  { name: 'Platzi', amount: 250_000, category: 'Suscripciones' },
  { name: 'Seguridad social', amount: 900_000, category: 'Seguridad social' },
  { name: 'Prepagada', amount: 1_500_000, category: 'Salud' },
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
