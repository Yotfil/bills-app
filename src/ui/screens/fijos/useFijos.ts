import { useState } from 'react';
import { useSessionStore } from '../../../store/sessionStore';
import {
  markFixedPaidWithoutTransaction,
  markFixedPending,
} from '../../../data/fixedMonthlyRepository';
import { currentMonthKey } from '../../../lib/date';
import { useFijosData } from './useFijosData';
import { useFijosFilters } from './useFijosFilters';
import { useFijosActions } from './useFijosActions';
import type { FixedObligationMonthly } from '../../../domain/types';

export type { FixedSort, FixedTab } from './useFijosFilters';

/**
 * Toda la lógica de la pantalla de Fijos (§8.3), compuesta en tres capas con una responsabilidad
 * cada una: `useFijosData` (suscripciones + derivados), `useFijosFilters` (tab, búsqueda, orden,
 * filtros, selección, "apagar") y `useFijosActions` (modales + handlers que escriben). La pantalla
 * y sus sub-componentes solo consumen lo que esto devuelve; `FijosScreen` sigue siendo orquestador.
 */
export function useFijos() {
  const uid = useSessionStore((s) => s.user?.uid);
  const [month, setMonth] = useState(currentMonthKey());

  const data = useFijosData(month);
  const filters = useFijosFilters(data);
  const actions = useFijosActions({ uid, month, ...data, ...filters });

  // El "apagar" es temporal: al cambiar de mes se resetea (cada mes empieza sin apagados).
  const changeMonth = (m: string) => {
    setMonth(m);
    filters.resetMuted();
  };

  // Props de una fila de fijo (§8.3). `nested` = ítem del checklist de una bolsa (indentado y sin
  // checkbox/ojo de selección masiva: se paga desde su presupuesto). Evita drillear 8 callbacks.
  const rowProps = (fixed: FixedObligationMonthly, opts?: { nested?: boolean }) => ({
    fixed,
    nested: opts?.nested,
    selected: opts?.nested ? undefined : filters.selected.has(fixed.id),
    onToggleSelect: opts?.nested ? undefined : () => filters.toggleOne(fixed.id),
    muted: opts?.nested ? undefined : filters.mutedIds.has(fixed.id),
    onToggleMute: opts?.nested ? undefined : () => filters.toggleMute(fixed.id),
    onAllocate: () => actions.setAllocating(fixed),
    onUnallocate: () => uid && markFixedPending(uid, fixed.id),
    onPay: () => actions.setPaying(fixed),
    onMarkPaid: () => uid && markFixedPaidWithoutTransaction(uid, fixed.id),
    onRevert: () => actions.handleRevert(fixed),
  });

  return {
    month,
    changeMonth,
    ...data,
    ...filters,
    ...actions,
    rowProps,
  };
}
