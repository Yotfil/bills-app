import { useState, type FormEvent } from 'react';
import { SelectField } from '../components/SelectField';
import { MoneyInput } from '../components/MoneyInput';
import { DecimalInput } from '../components/DecimalInput';
import type { TransactionFormProps } from './TransactionFormProps';
import { useUserCollection } from '../hooks/useUserCollection';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useUsdRateTable } from '../hooks/useUsdRateTable';
import { useSessionStore } from '../../store/sessionStore';
import { useEntryPrefsStore } from '../../store/entryPrefsStore';
import { subscribeAccounts } from '../../data/accountRepository';
import { subscribeCards } from '../../data/cardRepository';
import { subscribeCategories } from '../../data/categoryRepository';
import { subscribeLoans } from '../../data/loanRepository';
import { subscribeBudgets } from '../../data/budgetRepository';
import { createTransaction, editTransaction } from '../../data/transactionService';
import {
  buildManualTransactionDraft,
  defaultConcept,
  ENTRY_TYPE_LABELS,
  type ManualEntryInput,
} from '../../domain/transactionDraft';
import { validateTransaction, validationErrorMessage } from '../../domain/validation';
import { fromDateInputValue, nowTimestamp, toDateInputValue } from '../../lib/date';
import { formatCop, formatForeignAmount, parseDecimal } from '../../lib/currency';
import { copPerUnit, foreignToCop, listCurrencyCodes } from '../../domain/currencyConversion';
import type { BoostRow } from './BoostRow';
import type {
  Account,
  Budget,
  Category,
  CreditCard,
  EntityRef,
  LedgerEntityKind,
  Loan,
  TransactionDraft,
} from '../../domain/types';

type EntryType = ManualEntryInput['type'];

const refToValue = (ref: EntityRef | null): string => (ref ? `${ref.kind}:${ref.id}` : '');
function valueToRef(value: string): EntityRef | null {
  if (!value) return null;
  const [kind, id] = value.split(':');
  return { kind: kind as LedgerEntityKind, id: id ?? '' };
}

export function TransactionForm({ existing, onDone }: TransactionFormProps) {
  const uid = useSessionStore((s) => s.user?.uid);
  const { items: accounts } = useUserCollection<Account>(subscribeAccounts);
  const { items: cards } = useUserCollection<CreditCard>(subscribeCards);
  const { items: loans } = useUserCollection<Loan>(subscribeLoans);
  const { items: categories } = useUserCollection<Category>(subscribeCategories);
  const { items: budgets } = useUserCollection<Budget>(subscribeBudgets);
  const rememberPrefs = useEntryPrefsStore((s) => s.remember);
  const lastSource = useEntryPrefsStore((s) => s.lastSource);
  const lastType = useEntryPrefsStore((s) => s.lastType);

  const activeAccounts = accounts.filter((a) => !a.archived);
  const activeCards = cards.filter((c) => !c.archived);
  const activeLoans = loans.filter((l) => !l.archived);
  const spendCategories = categories.filter((c) => !c.archived && !c.isSystem);

  const isEdit = !!existing;
  // Los ajustes (reconciliación, §5.7) no se capturan a mano; pero un ajuste creado por accidente en
  // la entidad equivocada sí debe poder corregirse: se edita conservando su tipo, su categoría de
  // sistema y su dirección, dejando cambiar monto, cuenta/medio (cuenta, tarjeta o crédito), nota y
  // fecha. No pasa por el builder manual (que no contempla 'adjustment').
  const isAdjustment = existing?.type === 'adjustment';
  const [type, setType] = useState<EntryType>(
    (existing?.type as EntryType) ?? (lastType === 'adjustment' ? 'expense' : lastType),
  );
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [categoryId, setCategoryId] = useState<string | null>(existing?.categoryId ?? null);
  const [source, setSource] = useState<EntityRef | null>(existing?.source ?? lastSource);
  const [destination, setDestination] = useState<EntityRef | null>(existing?.destination ?? null);
  const [concept, setConcept] = useState(existing?.concept ?? '');
  const [dateValue, setDateValue] = useState(toDateInputValue(existing?.date ?? nowTimestamp()));
  const [hormiga, setHormiga] = useState(existing?.tags.includes('hormiga') ?? false);
  const [note, setNote] = useState(existing?.note ?? '');
  // Aumentos de presupuesto desde un ingreso (§5.9). Prellena desde el ingreso al editar.
  const [boosts, setBoosts] = useState<BoostRow[]>(
    existing?.budgetBoosts?.map((b) => ({
      budgetId: b.budgetId,
      month: b.month,
      amount: String(b.amount),
    })) ?? [],
  );
  // Movimiento EN DIVISA (decisión 2026-07-09): si la cuenta del movimiento vive en otra
  // moneda, el monto se captura en ESA moneda y el COP guardado es la conversión del día.
  // La cuenta "del movimiento" es el destino en un ingreso y el origen en un gasto o una
  // transferencia (las cuentas en divisa son monomoneda; con tarjeta nunca hay modo divisa).
  const [foreignText, setForeignText] = useState(
    existing?.foreignAmount != null ? String(existing.foreignAmount) : '',
  );
  // Transferencia CROSS-MONEDA (cuentas en distinta moneda): montos manuales por lado. Se prellenan
  // desde el movimiento (independiente de la carga async de cuentas): la pata de origen usa su
  // divisa o su COP, y la de destino igual.
  const isCrossExisting = existing?.destinationAmount != null;
  const [outText, setOutText] = useState(
    isCrossExisting ? String(existing!.foreignAmount ?? existing!.amount) : '',
  );
  const [inText, setInText] = useState(
    isCrossExisting
      ? String(existing!.destinationForeignAmount ?? existing!.destinationAmount)
      : '',
  );
  // Gasto con tarjeta que cobra en divisa (tarjeta mixta, 2026-07-07): el usuario elige si ESTE
  // Moneda elegida para un gasto con TARJETA (tarjeta multimoneda, 2026-07-07): '' = COP, o el código
  // de la divisa (USD, EUR…). Cualquier tarjeta puede cobrar en cualquier moneda. Se prellena con la
  // moneda del gasto editado.
  const [expenseCurrency, setExpenseCurrency] = useState(
    existing?.type === 'expense' && existing.source?.kind === 'card'
      ? (existing.foreignCurrency ?? '')
      : '',
  );
  const { busy, error, setError, run } = useAsyncAction();
  const { table } = useUsdRateTable();

  const entryAccountRef =
    type === 'income'
      ? destination
      : type === 'expense' || type === 'transfer'
        ? source
        : null;
  const entryAccount =
    entryAccountRef?.kind === 'account'
      ? (activeAccounts.find((a) => a.id === entryAccountRef.id) ?? null)
      : null;
  // ¿El gasto usa una tarjeta? (entonces se ofrece elegir la moneda).
  const isCardExpense = type === 'expense' && source?.kind === 'card';
  // La divisa de captura: forzada por una cuenta en divisa (monomoneda), o la moneda elegida para un
  // gasto con tarjeta. `null` = COP. Toda la maquinaria de abajo (DecimalInput, conversión, patch) la usa.
  const entryCurrency =
    entryAccount?.foreignCurrency ?? (isCardExpense && expenseCurrency ? expenseCurrency : null);
  // Opciones de moneda del gasto (sin COP: COP = placeholder). Conserva la moneda ya elegida si la
  // tabla no está (offline), para no perderla al editar.
  const currencyCodes = table ? listCurrencyCodes(table).filter((c) => c !== 'COP') : [];
  const expenseCurrencyOptions = (
    expenseCurrency && !currencyCodes.includes(expenseCurrency)
      ? [expenseCurrency, ...currencyCodes]
      : currencyCodes
  ).map((c) => ({ value: c, label: c }));
  const entryRate = entryCurrency && table ? copPerUnit(table, entryCurrency) : null;
  const parsedForeign = entryCurrency ? parseDecimal(foreignText) : null;
  // COP derivado del monto en divisa (es el `amount` que se guarda).
  const foreignCop =
    entryRate !== null && parsedForeign !== null ? foreignToCop(parsedForeign, entryRate) : null;
  // El monto de un ajuste en divisa no se edita a mano (nace de reconciliar): se re-reconcilia.
  const foreignAdjustment = isAdjustment && existing?.foreignAmount != null;

  const activeBudgets = budgets.filter((b) => !b.archived && b.active);
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Categoría';

  // El total asignado a presupuestos no puede exceder el monto del ingreso (§5.9).
  const boostsTotal = boosts.reduce((sum, r) => sum + (Math.round(Number(r.amount)) || 0), 0);
  const incomeAmount = entryCurrency ? (foreignCop ?? 0) : Math.round(Number(amount)) || 0;
  const boostsExceedIncome = type === 'income' && boostsTotal > incomeAmount;

  // Moneda de una cuenta por su ref (null = COP o no es cuenta).
  const currencyOf = (ref: EntityRef | null): string | null =>
    ref?.kind === 'account'
      ? (activeAccounts.find((a) => a.id === ref.id)?.foreignCurrency ?? null)
      : null;
  const accountOf = (ref: EntityRef | null): Account | null =>
    ref?.kind === 'account' ? (activeAccounts.find((a) => a.id === ref.id) ?? null) : null;

  // Transferencia entre cuentas de DISTINTA moneda: se capturan dos montos manuales (lo que sale
  // del origen y lo que entra al destino), cada uno en la moneda de su cuenta. El cambio real (la
  // tasa) lo define la operación del usuario, no la tasa del día.
  const sourceCurrency = currencyOf(source);
  const destCurrency = currencyOf(destination);
  const sourceAccount = accountOf(source);
  const destAccount = accountOf(destination);
  const crossCurrency =
    type === 'transfer' && !!source && !!destination && sourceCurrency !== destCurrency;

  // Montos por lado según su moneda (divisa → decimal; COP → entero).
  const outForeign = crossCurrency && sourceCurrency ? parseDecimal(outText) : null;
  const inForeign = crossCurrency && destCurrency ? parseDecimal(inText) : null;
  const outCopRaw = crossCurrency && !sourceCurrency ? Math.round(Number(outText) || 0) : null;
  const inCopRaw = crossCurrency && !destCurrency ? Math.round(Number(inText) || 0) : null;
  const crossSourceRate = sourceCurrency && table ? copPerUnit(table, sourceCurrency) : null;
  const crossDestRate = destCurrency && table ? copPerUnit(table, destCurrency) : null;

  // Tasa implícita (solo cuando un lado es COP): ayuda al usuario a ver a cuánto le quedó el cambio.
  const impliedRateLabel = (() => {
    if (!crossCurrency) return null;
    if (!destCurrency && sourceCurrency && outForeign && inCopRaw) {
      return `≈ ${formatCop(Math.round(inCopRaw / outForeign))} por ${sourceCurrency}`;
    }
    if (!sourceCurrency && destCurrency && inForeign && outCopRaw) {
      return `≈ ${formatCop(Math.round(outCopRaw / inForeign))} por ${destCurrency}`;
    }
    return null;
  })();

  // Las transferencias pueden ser entre cuentas de la misma moneda (monto único) o de distinta
  // moneda (montos manuales por lado). Al cambiar el origen, solo se limpia el destino si quedó
  // siendo la MISMA cuenta (no se transfiere a sí misma).
  function handleSourceChange(value: string) {
    const ref = valueToRef(value);
    setSource(ref);
    if (
      type === 'transfer' &&
      ref?.kind === 'account' &&
      destination?.kind === 'account' &&
      ref.id === destination.id
    ) {
      setDestination(null);
    }
  }

  const addBoost = () =>
    setBoosts((prev) => [...prev, { budgetId: '', month: dateValue.slice(0, 7), amount: '' }]);
  const updateBoost = (i: number, patch: Partial<BoostRow>) =>
    setBoosts((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeBoost = (i: number) => setBoosts((prev) => prev.filter((_, idx) => idx !== i));

  // Opciones de medio de pago según el tipo (§11). Cálculo plano y barato (listas cortas):
  // el React Compiler memoiza solo, sin useMemo manual.
  const sourceOptions = (() => {
    const accountOpts = activeAccounts.map((a) => ({
      value: refToValue({ kind: 'account', id: a.id }),
      label: a.name,
    }));
    const cardOpts = activeCards.map((c) => ({
      value: refToValue({ kind: 'card', id: c.id }),
      label: `${c.name} (TC)`,
    }));
    // Un ajuste reconcilia una cuenta, una tarjeta o un crédito (§5.7): se puede mover a cualquiera.
    if (isAdjustment) {
      const loanOpts = activeLoans.map((l) => ({
        value: refToValue({ kind: 'loan', id: l.id }),
        label: `${l.name} (crédito)`,
      }));
      return [...accountOpts, ...cardOpts, ...loanOpts];
    }
    if (type === 'expense') {
      return [...accountOpts, ...cardOpts];
    }
    // Abono a deuda: solo cuentas COP (las deudas son COP; una cuenta en divisa tendría que
    // pasar por un cambio de moneda, que por ahora es manual, fuera de la app).
    if (type === 'debt_payment') {
      return activeAccounts
        .filter((a) => !a.foreignCurrency)
        .map((a) => ({ value: refToValue({ kind: 'account', id: a.id }), label: a.name }));
    }
    return accountOpts; // income/transfer salen/entran a cuentas
  })();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!uid) return;
    setError(null);
    if (boostsExceedIncome) return; // los aumentos no pueden exceder el ingreso (mensaje inline)

    let draft: TransactionDraft;

    if (isAdjustment && existing) {
      // El ajuste conserva su tipo, su categoría de sistema y su dirección; solo cambian monto,
      // cuenta, nota y fecha. No pasa por el builder manual (no contempla 'adjustment').
      draft = {
        date: fromDateInputValue(dateValue),
        concept: concept.trim() || existing.concept,
        type: 'adjustment',
        amount: Math.round(Number(amount) || 0),
        categoryId: existing.categoryId,
        source,
        destination: null,
        adjustmentDirection: existing.adjustmentDirection,
        tags: [],
        note: note.trim() ? note.trim() : null,
        fixedMonthlyId: null,
        periodMonth: null,
        // Un ajuste en divisa CONSERVA su monto original: si se perdiera aquí, editar la
        // nota/fecha revertiría el foreignAmount de la cuenta sin reaplicarlo.
        foreignCurrency: existing.foreignCurrency ?? null,
        foreignAmount: existing.foreignAmount ?? null,
      };
    } else if (crossCurrency) {
      // Transferencia entre cuentas de DISTINTA moneda: dos montos manuales. Cada pata mueve la
      // fuente de verdad de SU cuenta (divisa → foreignAmount; COP → cachedBalance).
      const outVal = sourceCurrency ? outForeign : outCopRaw;
      const inVal = destCurrency ? inForeign : inCopRaw;
      if (outVal === null || outVal <= 0) {
        setError(
          `Ingresa cuánto sale de ${sourceAccount?.name ?? 'la cuenta origen'} en ${sourceCurrency ?? 'COP'}.`,
        );
        return;
      }
      if (inVal === null || inVal <= 0) {
        setError(
          `Ingresa cuánto entra a ${destAccount?.name ?? 'la cuenta destino'} en ${destCurrency ?? 'COP'}.`,
        );
        return;
      }
      // COP de cada pata: si un lado es COP, su monto es el valor REAL de la operación y ancla a
      // ambas patas (el ledger COP queda en neto cero). Si ambas son divisa, se usa la tasa del día.
      let sourceLegCop: number;
      let destLegCop: number;
      if (!destCurrency) {
        sourceLegCop = inCopRaw!;
        destLegCop = inCopRaw!;
      } else if (!sourceCurrency) {
        sourceLegCop = outCopRaw!;
        destLegCop = outCopRaw!;
      } else {
        if (crossSourceRate === null || crossDestRate === null) {
          setError('No hay tasa del día para convertir ambas monedas. Revisa tu conexión.');
          return;
        }
        sourceLegCop = foreignToCop(outForeign!, crossSourceRate);
        destLegCop = foreignToCop(inForeign!, crossDestRate);
      }
      const built = buildManualTransactionDraft({
        type: 'transfer',
        amount: sourceLegCop,
        date: fromDateInputValue(dateValue),
        concept: concept || defaultConcept('transfer'),
        categoryId: null,
        source,
        destination,
        hormiga: false,
        note,
      });
      draft = {
        ...built,
        periodMonth: existing?.periodMonth ?? null,
        foreignCurrency: sourceCurrency,
        foreignAmount: sourceCurrency ? outForeign : null,
        destinationAmount: destLegCop,
        destinationForeignCurrency: destCurrency,
        destinationForeignAmount: destCurrency ? inForeign : null,
      };
    } else {
      // Movimiento en divisa (monto único): exige monto en la moneda de la cuenta y tasa del día.
      if (entryCurrency) {
        if (parsedForeign === null || parsedForeign <= 0) {
          setError(`Ingresa el monto en ${entryCurrency}.`);
          return;
        }
        if (foreignCop === null) {
          setError(
            `No hay tasa disponible para ${entryCurrency}. Revisa tu conexión e intenta de nuevo.`,
          );
          return;
        }
      }
      const built = buildManualTransactionDraft({
        type,
        amount: entryCurrency ? (foreignCop ?? 0) : Math.round(Number(amount) || 0),
        date: fromDateInputValue(dateValue),
        concept:
          concept ||
          defaultConcept(
            type,
            categoryId ? spendCategories.find((c) => c.id === categoryId)?.name : undefined,
          ),
        categoryId: type === 'expense' ? categoryId : null,
        source: type === 'income' ? null : source,
        destination:
          type === 'income' || type === 'transfer' || type === 'debt_payment' ? destination : null,
        hormiga,
        note,
      });
      // Al EDITAR se conserva el mes contable original (un fijo pagado por adelantado sigue en su mes).
      draft = existing ? { ...built, periodMonth: existing.periodMonth ?? null } : built;
      // Aumentos de presupuesto: solo en ingresos (array vacío limpia al editar a 0).
      if (type === 'income') {
        draft.budgetBoosts = boosts
          .filter((r) => r.budgetId && r.month && Number(r.amount) > 0)
          .map((r) => ({
            budgetId: r.budgetId,
            month: r.month,
            amount: Math.round(Number(r.amount)),
          }));
      }
      // Movimiento en divisa: guarda el monto original; el servicio aplica el delta sobre la
      // fuente de verdad de la cuenta (Account.foreignAmount). `null` limpia el campo al editar.
      draft.foreignCurrency = entryCurrency;
      draft.foreignAmount = entryCurrency ? parsedForeign : null;
    }

    const errors = validateTransaction(draft);
    if (errors.length > 0) {
      setError(validationErrorMessage(errors[0]!));
      return;
    }

    const ok = await run(async () => {
      if (isEdit && existing) {
        await editTransaction(uid, existing.id, draft);
      } else {
        await createTransaction(uid, draft);
      }
    });
    if (ok) {
      if (!isAdjustment) rememberPrefs(type, draft.source);
      onDone();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Selector de tipo: gasto primero (§5.4). En un ajuste no se ofrece (no se cambia de tipo). */}
      {isAdjustment ? (
        <span className="w-fit rounded-full bg-slate-100 px-4 py-1.5 text-sm text-slate-600">
          Ajuste por reconciliación
        </span>
      ) : (
        <div className="flex gap-2 overflow-x-auto">
          {(Object.keys(ENTRY_TYPE_LABELS) as EntryType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-full px-4 py-1.5 text-sm whitespace-nowrap ${
                type === t ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {ENTRY_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      )}

      {/* Monto único: se oculta en transferencias cross-moneda (que capturan los dos montos por
          lado más abajo). Si la cuenta es en divisa, se captura en ESA moneda (COP = reflejo). */}
      {!crossCurrency && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Monto ({entryCurrency ?? 'COP'})</span>
            {entryCurrency ? (
              <DecimalInput
                autoFocus
                placeholder="0"
                value={foreignText}
                onChange={setForeignText}
                className="rounded-xl border border-slate-300 px-4 py-3 text-2xl font-semibold outline-none focus:border-slate-500"
              />
            ) : (
              <MoneyInput
                autoFocus
                placeholder="0"
                value={amount}
                onChange={setAmount}
                disabled={foreignAdjustment}
                className="rounded-xl border border-slate-300 px-4 py-3 text-2xl font-semibold outline-none focus:border-slate-500 disabled:bg-slate-100 disabled:text-slate-500"
              />
            )}
          </label>
          {foreignAdjustment && existing && (
            <p className="-mt-2 text-xs text-slate-400">
              Este ajuste es en divisa ({formatForeignAmount(existing.foreignAmount ?? 0)}{' '}
              {existing.foreignCurrency}): su monto no se edita aquí; re-reconcilia la cuenta.
            </p>
          )}
          {entryCurrency &&
            (foreignCop !== null ? (
              <p className="-mt-2 text-xs text-slate-400">
                ≈ {formatCop(foreignCop)} con la tasa del día
              </p>
            ) : entryRate === null ? (
              <p className="-mt-2 text-xs text-amber-600">
                Sin tasa del día para {entryCurrency}: revisa tu conexión para registrar el
                movimiento.
              </p>
            ) : null)}
        </>
      )}

      {/* Categoría: solo en gasto, justo después del monto (§5.4). */}
      {type === 'expense' && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Categoría</span>
          <div className="grid grid-cols-4 gap-2">
            {spendCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={`flex flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 text-[10px] ${
                  categoryId === cat.id ? 'border-slate-800 bg-slate-50' : 'border-slate-200'
                }`}
              >
                <span className="text-sm">{cat.icon}</span>
                <span className="text-center leading-tight text-slate-600">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Origen (de dónde sale): expense/transfer/debt_payment. */}
      {type !== 'income' && (
        <SelectField
          label={
            isAdjustment
              ? 'Cuenta / medio del ajuste'
              : type === 'transfer'
                ? 'Desde'
                : 'Medio de pago'
          }
          value={refToValue(source)}
          onChange={(v) => handleSourceChange(v)}
          options={sourceOptions}
          placeholder="Selecciona…"
        />
      )}
      {type === 'debt_payment' && activeAccounts.some((a) => a.foreignCurrency) && (
        <p className="-mt-2 text-xs text-slate-400">
          Las cuentas en otra moneda no aparecen: las deudas se pagan en pesos (el cambio de
          moneda es manual por ahora).
        </p>
      )}

      {/* Gasto con TARJETA: elegir la moneda de ESTE gasto (COP o cualquier divisa; las compras
          internacionales pueden ser en USD, EUR…). El Monto de arriba se captura en la moneda elegida. */}
      {isCardExpense && (
        <SelectField
          label="Moneda del gasto"
          value={expenseCurrency}
          onChange={setExpenseCurrency}
          options={expenseCurrencyOptions}
          placeholder="COP (pesos)"
        />
      )}

      {/* Destino: income (cuenta), transfer (cuenta), debt_payment (tarjeta). */}
      {type === 'income' && (
        <SelectField
          label="Entra a"
          value={refToValue(destination)}
          onChange={(v) => setDestination(valueToRef(v))}
          options={activeAccounts.map((a) => ({
            value: refToValue({ kind: 'account', id: a.id }),
            label: a.name,
          }))}
          placeholder="Selecciona cuenta…"
        />
      )}
      {/* Aumentar presupuestos con parte del ingreso (§5.9): ligado al ingreso (se revierte al
          borrarlo). Cada fila sube el tope del presupuesto en el mes elegido. */}
      {type === 'income' && activeBudgets.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3">
          <span className="text-xs font-medium text-slate-600">Aumentar presupuestos (opcional)</span>
          {boosts.map((row, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-2">
              <select
                value={row.budgetId}
                onChange={(e) => updateBoost(i, { budgetId: e.target.value })}
                aria-label="Presupuesto a aumentar"
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-slate-500"
              >
                <option value="">Presupuesto…</option>
                {activeBudgets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {categoryName(b.categoryId)}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <MoneyInput
                  placeholder="Monto"
                  value={row.amount}
                  onChange={(v) => updateBoost(i, { amount: v })}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
                />
                <input
                  type="month"
                  value={row.month}
                  onChange={(e) => updateBoost(i, { month: e.target.value })}
                  aria-label="Mes del presupuesto"
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-slate-500"
                />
                <button
                  type="button"
                  onClick={() => removeBoost(i)}
                  aria-label="Quitar"
                  className="shrink-0 px-1 text-slate-400"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addBoost}
            className="self-start text-xs font-medium text-slate-600 underline"
          >
            + Agregar presupuesto
          </button>
          {boostsExceedIncome && (
            <p className="text-xs font-medium text-red-600">
              Los aumentos suman {formatCop(boostsTotal)} y superan el ingreso (
              {formatCop(incomeAmount)}). Reduce los montos.
            </p>
          )}
        </div>
      )}

      {type === 'transfer' && (
        <>
          <SelectField
            label="Hacia"
            value={refToValue(destination)}
            onChange={(v) => setDestination(valueToRef(v))}
            // Cualquier cuenta distinta del origen. Si es de otra moneda, se activa el modo
            // cross-moneda (dos montos manuales por lado).
            options={activeAccounts
              .filter((a) => !(source?.kind === 'account' && source.id === a.id))
              .map((a) => ({
                value: refToValue({ kind: 'account', id: a.id }),
                label: a.name,
              }))}
            placeholder="Selecciona cuenta…"
          />
          {crossCurrency ? (
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">
                Cuentas en distinta moneda: ingresa manualmente cuánto sale y cuánto entra (la tasa
                la define tu operación, no la del día).
              </p>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">
                  Sale de {sourceAccount?.name ?? 'origen'} ({sourceCurrency ?? 'COP'})
                </span>
                {sourceCurrency ? (
                  <DecimalInput
                    placeholder="0"
                    value={outText}
                    onChange={setOutText}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-lg font-semibold outline-none focus:border-slate-500"
                  />
                ) : (
                  <MoneyInput
                    placeholder="0"
                    value={outText}
                    onChange={setOutText}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-lg font-semibold outline-none focus:border-slate-500"
                  />
                )}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">
                  Entra a {destAccount?.name ?? 'destino'} ({destCurrency ?? 'COP'})
                </span>
                {destCurrency ? (
                  <DecimalInput
                    placeholder="0"
                    value={inText}
                    onChange={setInText}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-lg font-semibold outline-none focus:border-slate-500"
                  />
                ) : (
                  <MoneyInput
                    placeholder="0"
                    value={inText}
                    onChange={setInText}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-lg font-semibold outline-none focus:border-slate-500"
                  />
                )}
              </label>
              {impliedRateLabel && <p className="text-xs text-slate-400">{impliedRateLabel}</p>}
            </div>
          ) : (
            entryCurrency && (
              <p className="-mt-2 text-xs text-slate-400">
                Entre cuentas en {entryCurrency}. Para cambiar de moneda (p.ej. {entryCurrency}→COP),
                elige como destino una cuenta en otra moneda.
              </p>
            )
          )}
        </>
      )}
      {type === 'debt_payment' && (
        <SelectField
          label="Abonar a"
          value={refToValue(destination)}
          onChange={(v) => setDestination(valueToRef(v))}
          options={[
            ...activeCards.map((c) => ({
              value: refToValue({ kind: 'card', id: c.id }),
              label: `${c.name} (TC)`,
            })),
            ...activeLoans.map((l) => ({
              value: refToValue({ kind: 'loan', id: l.id }),
              label: `${l.name} (crédito)`,
            })),
          ]}
          placeholder="Selecciona tarjeta o crédito…"
        />
      )}

      {type === 'expense' && (
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={hormiga} onChange={(e) => setHormiga(e.target.checked)} />
          Marcar como gasto hormiga 🐜
        </label>
      )}

      <input
        placeholder="Concepto (opcional)"
        value={concept}
        onChange={(e) => setConcept(e.target.value)}
        className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
      />
      <input
        type="date"
        value={dateValue}
        onChange={(e) => setDateValue(e.target.value)}
        className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
      />
      <input
        placeholder="Nota (opcional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
      />

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || boostsExceedIncome}
        className="rounded-xl bg-slate-800 py-3 font-medium text-white disabled:opacity-50"
      >
        {isEdit ? 'Guardar cambios' : 'Guardar'}
      </button>
    </form>
  );
}
