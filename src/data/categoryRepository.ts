// Repositorio de categorías (CLAUDE.md §6). Incluye el SET BASE de 14 categorías más la
// categoría de sistema "Ajuste / Reconciliación", y la función para sembrarlas la primera
// vez (las categorías "vienen con el set base", §7). El CRUD completo llega en el Paso 11.
import { categoriesCol } from './collections';
import { create, listAll, subscribeAll, type CreateInput } from './crud';
import type { Category } from '../domain/types';

/** Id estable de la categoría de sistema de ajustes, útil para la reconciliación (§5.7). */
export const ADJUSTMENT_CATEGORY_NAME = 'Ajuste / Reconciliación';

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
