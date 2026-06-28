// Repositorio de categorías (CLAUDE.md §6, §8.4). Incluye el SET BASE de 14 categorías más la
// categoría de sistema "Ajuste / Reconciliación", la siembra inicial y el CRUD del usuario.
import { categoriesCol } from './collections';
import {
  archive,
  create,
  hardDelete,
  listAll,
  subscribeAll,
  unarchive,
  update,
  type CreateInput,
  type UpdateInput,
} from './crud';
import type { Category } from '../domain/types';
import type { NewCategory } from './NewCategory';

export type { NewCategory } from './NewCategory';

/** Id estable de la categoría de sistema de ajustes, útil para la reconciliación (§5.7). */
export const ADJUSTMENT_CATEGORY_NAME = 'Ajuste / Reconciliación';

/** Nombre de la categoría base que agrupa las suscripciones (§6), usado por el módulo §15. */
export const SUBSCRIPTIONS_CATEGORY_NAME = 'Suscripciones';

type SeedCategory = CreateInput<Category>;

// Set base (§6). `includeInSpendReports` = true salvo la de sistema. Orden = el del doc.
const BASE_CATEGORIES: Array<Omit<SeedCategory, 'archived' | 'archivedAt' | 'sortOrder'>> = [
  { name: 'Comidas', icon: '🍔', color: '#f97316', isSystem: false, includeInSpendReports: true },
  { name: 'Mercado', icon: '🛒', color: '#22c55e', isSystem: false, includeInSpendReports: true },
  {
    name: 'Transporte',
    icon: '🚗',
    color: '#3b82f6',
    isSystem: false,
    includeInSpendReports: true,
  },
  { name: 'Ocio', icon: '🎭', color: '#a855f7', isSystem: false, includeInSpendReports: true },
  { name: 'Salud', icon: '🩺', color: '#ef4444', isSystem: false, includeInSpendReports: true },
  { name: 'Hogar', icon: '🏠', color: '#14b8a6', isSystem: false, includeInSpendReports: true },
  { name: 'Familia', icon: '👨‍👩‍👧', color: '#ec4899', isSystem: false, includeInSpendReports: true },
  { name: 'Educación', icon: '📚', color: '#6366f1', isSystem: false, includeInSpendReports: true },
  { name: 'Vivienda', icon: '🔑', color: '#0ea5e9', isSystem: false, includeInSpendReports: true },
  { name: 'Servicios', icon: '💡', color: '#eab308', isSystem: false, includeInSpendReports: true },
  {
    name: 'Suscripciones',
    icon: '📺',
    color: '#8b5cf6',
    isSystem: false,
    includeInSpendReports: true,
  },
  { name: 'Vehículo', icon: '🚙', color: '#64748b', isSystem: false, includeInSpendReports: true },
  {
    name: 'Seguridad social',
    icon: '🛡️',
    color: '#0d9488',
    isSystem: false,
    includeInSpendReports: true,
  },
  { name: 'Otros', icon: '📦', color: '#94a3b8', isSystem: false, includeInSpendReports: true },
];

const SYSTEM_CATEGORIES: Array<Omit<SeedCategory, 'archived' | 'archivedAt' | 'sortOrder'>> = [
  // No entra en reportes de gasto (§5.7), para no contaminar "¿en qué se me va?".
  {
    name: ADJUSTMENT_CATEGORY_NAME,
    icon: '⚖️',
    color: '#94a3b8',
    isSystem: true,
    includeInSpendReports: false,
  },
];

export const subscribeCategories = (uid: string, onChange: (items: Category[]) => void) =>
  subscribeAll(categoriesCol(uid), onChange);

/**
 * Siembra el set base + la categoría de sistema, solo si el usuario aún no tiene ninguna.
 * Idempotente: pensado para llamarse en el primer login (bootstrap del usuario).
 */
export async function seedBaseCategories(uid: string): Promise<void> {
  const existing = await listAll(categoriesCol(uid));
  if (existing.length > 0) return;

  const all = [...BASE_CATEGORIES, ...SYSTEM_CATEGORIES];
  await Promise.all(
    all.map((cat, index) =>
      create(categoriesCol(uid), { ...cat, sortOrder: index, archived: false, archivedAt: null }),
    ),
  );
}

/** Construye el documento a crear (función pura). Las del usuario sí cuentan en reportes (§6). */
export function buildCategoryCreateInput(input: NewCategory): CreateInput<Category> {
  return {
    name: input.name.trim(),
    icon: input.icon.trim() || '🏷️',
    color: input.color || '#64748b',
    isSystem: false,
    includeInSpendReports: true,
    sortOrder: input.sortOrder ?? 0,
    archived: false,
    archivedAt: null,
  };
}

export const createCategory = (uid: string, input: NewCategory) =>
  create(categoriesCol(uid), buildCategoryCreateInput(input));

// Solo metadatos editables; isSystem / includeInSpendReports no se tocan desde la UI.
export type EditableCategoryFields = Pick<UpdateInput<Category>, 'name' | 'icon' | 'color'>;

export const updateCategory = (uid: string, id: string, data: EditableCategoryFields) =>
  update(categoriesCol(uid), id, data);

export const archiveCategory = (uid: string, id: string) => archive(categoriesCol(uid), id);

export const unarchiveCategory = (uid: string, id: string) => unarchive(categoriesCol(uid), id);

// Borrado físico: solo si la categoría NO tiene movimientos asociados (§8.4).
export const deleteCategory = (uid: string, id: string) => hardDelete(categoriesCol(uid), id);
