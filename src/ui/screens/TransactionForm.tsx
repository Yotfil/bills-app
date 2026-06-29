import { useMemo, useState, type FormEvent } from 'react';
import { SelectField } from '../components/SelectField';
import { MoneyInput } from '../components/MoneyInput';
import type { TransactionFormProps } from './TransactionFormProps';
import { useUserCollection } from '../hooks/useUserCollection';
import { useSessionStore } from '../../store/sessionStore';
import { useEntryPrefsStore } from '../../store/entryPrefsStore';
import { subscribeAccounts } from '../../data/accountRepository';
import { subscribeCards } from '../../data/cardRepository';
import { subscribeCategories } from '../../data/categoryRepository';
import { subscribeLoans } from '../../data/loanRepository';
import { createTransaction, editTransaction } from '../../data/transactionService';
import { buildManualTransactionDraft, type ManualEntryInput } from '../../domain/transactionDraft';
import { validateTransaction } from '../../domain/validation';
import { fromDateInputValue, nowTimestamp, toDateInputValue } from '../../lib/date';
import type {
  Account,
  Category,
  CreditCard,
  EntityRef,
  LedgerEntityKind,
  Loan,
  TransactionDraft,
} from '../../domain/types';

type EntryType = ManualEntryInput['type'];

const TYPE_LABELS: Record<EntryType, string> = {
  expense: 'Gasto',
  income: 'Ingreso',
  transfer: 'Transferencia',
  debt_payment: 'Abono',
};

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Opciones de medio de pago según el tipo (§11).
  const sourceOptions = useMemo(() => {
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
    return accountOpts; // income/transfer/debt_payment salen/entran a cuentas
  }, [type, isAdjustment, activeAccounts, activeCards, activeLoans]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!uid) return;
    setError(null);

    // El ajuste conserva su tipo, su categoría de sistema y su dirección; solo cambian monto, cuenta,
    // nota y fecha. No pasa por el builder manual (no contempla 'adjustment').
    const built: TransactionDraft =
      isAdjustment && existing
        ? {
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
          }
        : buildManualTransactionDraft({
            type,
            amount: Math.round(Number(amount) || 0),
            date: fromDateInputValue(dateValue),
            concept: concept || conceptFallback(type, spendCategories, categoryId),
            categoryId: type === 'expense' ? categoryId : null,
            source: type === 'income' ? null : source,
            destination:
              type === 'income' || type === 'transfer' || type === 'debt_payment'
                ? destination
                : null,
            hormiga,
            note,
          });

    // Al EDITAR se conserva el mes contable original: un movimiento de un fijo pagado por adelantado
    // sigue perteneciendo a su mes de presupuesto aunque se edite (el builder manual lo pondría null).
    const draft: TransactionDraft = existing
      ? { ...built, periodMonth: existing.periodMonth ?? null }
      : built;

    const errors = validateTransaction(draft);
    if (errors.length > 0) {
      setError(errorMessage(errors[0]!));
      return;
    }

    setBusy(true);
    try {
      if (isEdit && existing) {
        await editTransaction(uid, existing.id, draft);
      } else {
        await createTransaction(uid, draft);
      }
      if (!isAdjustment) rememberPrefs(type, draft.source);
      onDone();
    } catch {
      setError('No se pudo guardar. Intenta de nuevo.');
    } finally {
      setBusy(false);
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
          {(Object.keys(TYPE_LABELS) as EntryType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-full px-4 py-1.5 text-sm whitespace-nowrap ${
                type === t ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      )}

      {/* Monto: lo primero y con teclado numérico (§5.4). */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Monto (COP)</span>
        <MoneyInput
          autoFocus
          placeholder="0"
          value={amount}
          onChange={setAmount}
          className="rounded-xl border border-slate-300 px-4 py-3 text-2xl font-semibold outline-none focus:border-slate-500"
        />
      </label>

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
          onChange={(v) => setSource(valueToRef(v))}
          options={sourceOptions}
          placeholder="Selecciona…"
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
      {type === 'transfer' && (
        <SelectField
          label="Hacia"
          value={refToValue(destination)}
          onChange={(v) => setDestination(valueToRef(v))}
          options={activeAccounts.map((a) => ({
            value: refToValue({ kind: 'account', id: a.id }),
            label: a.name,
          }))}
          placeholder="Selecciona cuenta…"
        />
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
        disabled={busy}
        className="rounded-xl bg-slate-800 py-3 font-medium text-white disabled:opacity-50"
      >
        {isEdit ? 'Guardar cambios' : 'Guardar'}
      </button>
    </form>
  );
}

/** Concepto por defecto cuando el usuario lo deja en blanco. */
function conceptFallback(
  type: EntryType,
  categories: Category[],
  categoryId: string | null,
): string {
  if (type === 'expense' && categoryId) {
    return categories.find((c) => c.id === categoryId)?.name ?? TYPE_LABELS[type];
  }
  return TYPE_LABELS[type];
}

function errorMessage(error: string): string {
  if (error === 'amount_must_be_positive_integer') return 'Ingresa un monto válido mayor a 0.';
  if (error === 'expense_requires_category') return 'Elige una categoría.';
  if (error.includes('source')) return 'Elige el medio de pago.';
  if (error.includes('destination')) return 'Elige el destino.';
  return 'Revisa los datos del movimiento.';
}
