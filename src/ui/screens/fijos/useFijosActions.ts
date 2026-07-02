import { useEffect, useState } from 'react';
import { useFixedSyncStore } from '../../../store/fixedSyncStore';
import { setBudgetManualPaid, setBudgetMonthOverride } from '../../../data/budgetRepository';
import {
  addFixedMonthlyFromTemplates,
  clearFixedMonthly,
  deleteFixedMonthly,
  generateFixedMonthly,
  markFixedAllocated,
  markFixedPaidWithoutTransaction,
  payFixed,
  revertFixedPayment,
  updateMonthlyFromTemplate,
} from '../../../data/fixedMonthlyRepository';
import type { PayFixedInput } from '../../../data/PayFixedInput';
import type { FixedSyncSelection } from './FixedSyncModalProps';
import type { useFijosData } from './useFijosData';
import type { useFijosFilters } from './useFijosFilters';
import type { Budget, EntityRef, FixedObligationMonthly } from '../../../domain/types';

// Lo que este hook necesita de las otras capas (Pick para no re-declarar tipos, DRY).
type FijosActionsDeps = Pick<
  ReturnType<typeof useFijosData>,
  'fijos' | 'unpaid' | 'syncDiff' | 'hasSyncChanges'
> &
  Pick<ReturnType<typeof useFijosFilters>, 'selectedFijos' | 'clearSelection'> & {
    uid: string | undefined;
    month: string;
  };

/**
 * Capa de ACCIONES de la pantalla de Fijos (§8.3): estado de los modales (pagar/destinar/editar
 * tope), el banner de sincronización plantilla→mes y todos los handlers que escriben en Firestore.
 * Los datos y la selección llegan de `useFijosData` / `useFijosFilters`; aquí solo se orquesta.
 */
export function useFijosActions(deps: FijosActionsDeps) {
  const { uid, month, fijos, unpaid, syncDiff, hasSyncChanges, selectedFijos, clearSelection } =
    deps;

  const [paying, setPaying] = useState<FixedObligationMonthly | null>(null);
  const [allocating, setAllocating] = useState<FixedObligationMonthly | null>(null);
  // Presupuesto cuyo tope de ESTE mes se está editando (override por mes). El tope vive en el `Budget`.
  const [editingBudgetCap, setEditingBudgetCap] = useState<Budget | null>(null);
  const [generating, setGenerating] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);

  // Descarte del banner de sincronización, por mes (persistido en localStorage).
  const dismissed = useFixedSyncStore((s) => !!s.dismissedMonths[month]);
  const dismissSync = useFixedSyncStore((s) => s.dismiss);
  const undismissSync = useFixedSyncStore((s) => s.undismiss);

  // Si el mes quedó sin cambios, se "reabre" el banner para que cambios nuevos se vuelvan a mostrar.
  useEffect(() => {
    if (!hasSyncChanges && dismissed) undismissSync(month);
  }, [hasSyncChanges, dismissed, month, undismissSync]);

  async function handleBulkMarkPaid() {
    if (!uid) return;
    const targets = selectedFijos.filter((f) => f.status !== 'paid');
    if (targets.length === 0) {
      clearSelection();
      return;
    }
    if (
      !confirm(
        `¿Marcar ${targets.length} fijo(s) como pagados, sin crear movimientos ni tocar saldos?`,
      )
    ) {
      return;
    }
    await Promise.all(targets.map((f) => markFixedPaidWithoutTransaction(uid, f.id)));
    clearSelection();
  }

  async function handleBulkDelete() {
    if (!uid || selectedFijos.length === 0) return;
    const targets = selectedFijos;
    if (
      !confirm(
        `¿Eliminar ${targets.length} fijo(s) de este mes? Si alguno tenía movimiento, se revertirá (el dinero vuelve a su cuenta). No se puede deshacer.`,
      )
    ) {
      return;
    }
    await Promise.all(targets.map((f) => deleteFixedMonthly(uid, f)));
    clearSelection();
  }

  async function handleMarkAllPaid() {
    if (!uid || unpaid.length === 0) return;
    if (
      !confirm(`¿Marcar ${unpaid.length} fijos como pagados, sin crear movimientos ni tocar saldos?`)
    ) {
      return;
    }
    await Promise.all(unpaid.map((f) => markFixedPaidWithoutTransaction(uid, f.id)));
  }

  // Vaciar el mes: borra TODOS los fijos del mes (deja "Generar" como un mes nuevo). No toca presupuestos.
  async function handleClearMonth() {
    if (!uid || fijos.length === 0) return;
    if (
      !confirm(
        `¿Vaciar este mes? Se eliminan TODOS los fijos del mes (los pagados revierten su movimiento). La plantilla y los presupuestos no se tocan.`,
      )
    ) {
      return;
    }
    await clearFixedMonthly(uid, month);
  }

  async function handleGenerate() {
    if (!uid) return;
    setGenerating(true);
    try {
      await generateFixedMonthly(uid, month);
    } finally {
      setGenerating(false);
    }
  }

  async function handlePay(input: PayFixedInput) {
    if (!uid || !paying) return;
    await payFixed(uid, paying, input);
  }

  // Destinar eligiendo la cuenta de la que se reserva (§5.2): fija el medio y marca 'allocated'.
  async function handleAllocate(account: EntityRef) {
    if (!uid || !allocating) return;
    await markFixedAllocated(uid, allocating.id, account);
  }

  // Editar el tope de un presupuesto para ESTE mes (override): no toca la base ni otros meses.
  async function handleEditBudgetCap(amount: number) {
    if (!uid || !editingBudgetCap) return;
    await setBudgetMonthOverride(uid, editingBudgetCap.id, month, amount);
  }

  async function handleBudgetMarkPaid(budget: Budget) {
    if (!uid) return;
    await setBudgetManualPaid(uid, budget.id, month, true);
  }
  async function handleBudgetUndoPaid(budget: Budget) {
    if (!uid) return;
    await setBudgetManualPaid(uid, budget.id, month, false);
  }

  // Aplica solo lo que el usuario marcó en el modal de sincronización (§5.10).
  async function handleApplySync(sel: FixedSyncSelection) {
    if (!uid) return;
    const addTemplates = syncDiff.toAdd.filter((t) => sel.add.has(t.id));
    await Promise.all([
      ...(addTemplates.length ? [addFixedMonthlyFromTemplates(uid, month, addTemplates)] : []),
      ...syncDiff.toUpdate
        .filter((c) => sel.update.has(c.fixed.id))
        .map((c) => updateMonthlyFromTemplate(uid, c.fixed.id, c.template)),
      ...syncDiff.toRemove
        .filter((f) => sel.remove.has(f.id))
        .map((f) => deleteFixedMonthly(uid, f)),
    ]);
  }

  async function handleRevert(fixed: FixedObligationMonthly) {
    if (!uid) return;
    const msg = fixed.transactionId
      ? '¿Deshacer el pago? Se eliminará el movimiento y el dinero volverá a la cuenta de origen.'
      : '¿Deshacer? Volverá a pendiente (no hubo movimiento, no se devuelve dinero).';
    if (!confirm(msg)) return;
    await revertFixedPayment(uid, fixed);
  }

  return {
    paying,
    setPaying,
    handlePay,
    allocating,
    setAllocating,
    handleAllocate,
    editingBudgetCap,
    setEditingBudgetCap,
    handleEditBudgetCap,
    handleBudgetMarkPaid,
    handleBudgetUndoPaid,
    generating,
    handleGenerate,
    handleClearMonth,
    handleMarkAllPaid,
    handleBulkMarkPaid,
    handleBulkDelete,
    syncOpen,
    setSyncOpen,
    dismissed,
    dismissSync,
    handleApplySync,
    handleRevert,
  };
}
