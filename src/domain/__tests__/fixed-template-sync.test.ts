import { describe, expect, it } from 'vitest';
import {
  computeFixedSyncDiff,
  fixedSyncChangeCount,
  hasFixedSyncChanges,
} from '../fixedTemplateSync';
import { accountRef, cardRef, makeFixed, makeTemplate } from './fixtures';

// Diff entre la plantilla y los fijos ya generados de un mes (CLAUDE.md §5.2, §5.10).
describe('computeFixedSyncDiff', () => {
  it('detecta plantillas nuevas sin instancia este mes (toAdd)', () => {
    const templates = [makeTemplate({ id: 'a' }), makeTemplate({ id: 'b', name: 'Agua' })];
    const fijos = [makeFixed({ id: 'fx-a', templateId: 'a' })];
    const diff = computeFixedSyncDiff(templates, fijos);
    expect(diff.toAdd.map((t) => t.id)).toEqual(['b']);
    expect(diff.toUpdate).toHaveLength(0);
    expect(diff.toRemove).toHaveLength(0);
  });

  it('no propone agregar plantillas archivadas o inactivas', () => {
    const templates = [
      makeTemplate({ id: 'arch', archived: true }),
      makeTemplate({ id: 'inact', active: false }),
    ];
    const diff = computeFixedSyncDiff(templates, []);
    expect(diff.toAdd).toHaveLength(0);
  });

  it('detecta cambios de monto/nombre/categoría (toUpdate) con los campos exactos', () => {
    const templates = [
      makeTemplate({ id: 'a', name: 'Luz nueva', budgetedAmount: 250_000, categoryId: 'cat-x' }),
    ];
    const fijos = [
      makeFixed({
        id: 'fx-a',
        templateId: 'a',
        name: 'Luz',
        budgetedAmount: 230_000,
        categoryId: 'cat-servicios',
      }),
    ];
    const diff = computeFixedSyncDiff(templates, fijos);
    expect(diff.toUpdate).toHaveLength(1);
    expect(diff.toUpdate[0]?.changedFields.sort()).toEqual(
      ['budgetedAmount', 'categoryId', 'name'].sort(),
    );
  });

  it('NO marca update cuando solo difiere el medio de pago (por defecto)', () => {
    const templates = [makeTemplate({ id: 'a', defaultPaymentMethod: cardRef('tc-1') })];
    const fijos = [makeFixed({ id: 'fx-a', templateId: 'a', paymentMethod: accountRef('acc-1') })];
    expect(computeFixedSyncDiff(templates, fijos).toUpdate).toHaveLength(0);
  });

  it('marca el medio de pago como cambio si comparePaymentMethod=true', () => {
    const templates = [makeTemplate({ id: 'a', defaultPaymentMethod: cardRef('tc-1') })];
    const fijos = [makeFixed({ id: 'fx-a', templateId: 'a', paymentMethod: accountRef('acc-1') })];
    const diff = computeFixedSyncDiff(templates, fijos, { comparePaymentMethod: true });
    expect(diff.toUpdate[0]?.changedFields).toEqual(['paymentMethod']);
  });

  it('NO marca update en fijos PAGADos (son histórico)', () => {
    const templates = [makeTemplate({ id: 'a', budgetedAmount: 999 })];
    const fijos = [
      makeFixed({ id: 'fx-a', templateId: 'a', budgetedAmount: 230_000, status: 'paid' }),
    ];
    expect(computeFixedSyncDiff(templates, fijos).toUpdate).toHaveLength(0);
  });

  it('detecta fijos cuya plantilla fue borrada, archivada o inactivada (toRemove)', () => {
    const templates = [makeTemplate({ id: 'arch', archived: true })];
    const fijos = [
      makeFixed({ id: 'fx-huerfano', templateId: 'no-existe' }),
      makeFixed({ id: 'fx-arch', templateId: 'arch' }),
    ];
    const diff = computeFixedSyncDiff(templates, fijos);
    expect(diff.toRemove.map((f) => f.id).sort()).toEqual(['fx-arch', 'fx-huerfano']);
  });

  it('hasFixedSyncChanges / count reflejan el total', () => {
    const templates = [makeTemplate({ id: 'a', budgetedAmount: 1 }), makeTemplate({ id: 'b' })];
    const fijos = [makeFixed({ id: 'fx-a', templateId: 'a', budgetedAmount: 2 })];
    const diff = computeFixedSyncDiff(templates, fijos);
    expect(hasFixedSyncChanges(diff)).toBe(true);
    expect(fixedSyncChangeCount(diff)).toBe(2); // 1 add (b) + 1 update (a)
    expect(hasFixedSyncChanges(computeFixedSyncDiff([makeTemplate({ id: 'a' })], [makeFixed({ templateId: 'a' })]))).toBe(
      false,
    );
  });
});
