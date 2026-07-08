import { useMemo } from 'react';
import { formatCop, formatForeignAmount } from '../../lib/currency';
import { dayKey, formatDayLabel, formatMonthLabel, formatTime, monthKey } from '../../lib/date';
import { totalSpend } from '../../domain/reports';
import type { Category, EntityRef, Transaction, TransactionType } from '../../domain/types';
import type { TransactionListProps } from './TransactionListProps';

// Color del monto según el tipo (§8.2): gasto baja (rojo), ingreso entra (verde), el resto
// es movimiento neutro.
const AMOUNT_CLASS: Record<TransactionType, string> = {
  expense: 'text-red-600',
  income: 'text-emerald-600',
  transfer: 'text-slate-500',
  debt_payment: 'text-slate-500',
  adjustment: 'text-slate-500',
};

const SIGN: Record<TransactionType, string> = {
  expense: '−',
  income: '+',
  transfer: '',
  debt_payment: '−',
  adjustment: '',
};

// Etiqueta del tipo de movimiento, para mostrarla junto al medio de pago en cada card (§8.2).
const TYPE_LABEL: Record<TransactionType, string> = {
  expense: 'Gasto',
  income: 'Ingreso',
  transfer: 'Transferencia',
  debt_payment: 'Abono',
  adjustment: 'Ajuste',
};

// Lista de movimientos agrupada por día con subtotal de gasto (§8.2). Es la vista compartida
// entre el Registro (libro completo) y la pantalla de movimientos de una cuenta/tarjeta: recibe
// los movimientos YA filtrados y solo se encarga de agruparlos y pintarlos.
export function TransactionList({
  transactions,
  categories,
  accounts,
  cards,
  loans,
  onSelect,
}: TransactionListProps) {
  const entityName = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((a) => map.set(`account:${a.id}`, a.name));
    cards.forEach((c) => map.set(`card:${c.id}`, c.name));
    loans.forEach((l) => map.set(`loan:${l.id}`, l.name));
    return (ref: EntityRef | null) => (ref ? (map.get(`${ref.kind}:${ref.id}`) ?? '—') : '—');
  }, [accounts, cards, loans]);

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Agrupar por día conservando el orden cronológico inverso de la entrada.
  const groups = useMemo(() => {
    const byDay = new Map<string, Transaction[]>();
    for (const txn of transactions) {
      const key = dayKey(txn.date);
      const list = byDay.get(key) ?? [];
      list.push(txn);
      byDay.set(key, list);
    }
    return [...byDay.entries()];
  }, [transactions]);

  return (
    <>
      {groups.map(([key, dayTxns]) => (
        <section key={key} className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold text-slate-400 uppercase">
              {formatDayLabel(dayTxns[0]!.date)}
            </h2>
            <span className="text-xs text-slate-400">Gastos: {formatCop(totalSpend(dayTxns))}</span>
          </div>
          <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {dayTxns.map((txn) => {
              const cat = txn.categoryId ? categoryById.get(txn.categoryId) : undefined;
              const method = entityName(txn.source ?? txn.destination);
              const time = formatTime(txn.createdAt);
              // Si el movimiento pertenece a un mes distinto al de su fecha (p.ej. un fijo pagado por
              // adelantado), se muestra ese mes en un chip junto al nombre para saber a cuál aplica.
              const periodLabel =
                txn.periodMonth && txn.periodMonth !== monthKey(txn.date)
                  ? formatMonthLabel(txn.periodMonth)
                  : null;
              return (
                <li key={txn.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(txn)}
                    className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left last:border-0"
                  >
                    <span className="text-xl">{cat?.icon ?? '↔️'}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium text-slate-800">
                          {txn.concept}
                          {txn.tags.includes('hormiga') && ' 🐜'}
                        </span>
                        {periodLabel && (
                          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 capitalize">
                            {periodLabel}
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-slate-400">
                        {TYPE_LABEL[txn.type]} · {method}
                      </span>
                    </span>
                    <span className="flex flex-col items-end">
                      <span className={`font-semibold ${AMOUNT_CLASS[txn.type]}`}>
                        {SIGN[txn.type]}
                        {formatCop(txn.amount)}
                      </span>
                      {/* Movimiento en divisa: el COP es la conversión; el monto original va con
                          su signo (en un ajuste, el de la dirección de la reconciliación). */}
                      {txn.foreignAmount != null && txn.foreignCurrency && (
                        <span className="text-[11px] text-slate-400">
                          {txn.type === 'adjustment'
                            ? txn.adjustmentDirection === 'decrease'
                              ? '−'
                              : '+'
                            : SIGN[txn.type]}
                          {formatForeignAmount(txn.foreignAmount)} {txn.foreignCurrency}
                        </span>
                      )}
                      {time && <span className="text-xs text-slate-400">{time}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
