import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { SelectField } from '../../components/SelectField';
import { MoneyInput } from '../../components/MoneyInput';
import { useSessionStore } from '../../../store/sessionStore';
import { refToValue, valueToRef } from '../../../lib/entityRef';
import { currentMonthKey } from '../../../lib/date';
import { createFixedTemplate, updateFixedTemplate } from '../../../data/fixedTemplateRepository';
import { syncMonthlyToTemplate } from '../../../data/fixedMonthlyRepository';
import { syncCuotaFromTemplate } from '../../../data/cuotaService';
import { alignBudgetToTemplate } from '../../../data/budgetFixedService';
import { budgetForCategory } from '../../../domain/budgetBackedFixed';
import type { FixedTemplateFormProps } from './FixedTemplateFormProps';
import type { FixedPayKind } from '../../../domain/types';

// Crear/editar una plantilla de obligación fija (CLAUDE.md §5.2, §8.4, §10). El tipo de pago
// (gasto vs abono a deuda) cambia los campos: el gasto lleva categoría; el abono, tarjeta destino.
export function FixedTemplateForm({
  open,
  template,
  accounts,
  cards,
  loans,
  categories,
  budgets,
  onClose,
}: FixedTemplateFormProps) {
  const uid = useSessionStore((s) => s.user?.uid);
  const isEdit = !!template;
  const [name, setName] = useState(template?.name ?? '');
  const [amount, setAmount] = useState(String(template?.budgetedAmount ?? ''));
  const [payKind, setPayKind] = useState<FixedPayKind>(template?.payKind ?? 'expense');
  const [categoryId, setCategoryId] = useState(template?.categoryId ?? '');
  const [paymentMethod, setPaymentMethod] = useState(
    template ? refToValue(template.defaultPaymentMethod) : '',
  );
  const [debtTargetId, setDebtTargetId] = useState(template?.debtTargetId ?? '');
  const [budgetBacked, setBudgetBacked] = useState(template?.budgetBacked ?? false);
  // "Consume de un presupuesto" (§5.9 ext.): el fijo es un ítem del checklist de una bolsa; descuenta
  // ese presupuesto al pagarse y no suma aparte al total. Excluyente con "Respaldar con presupuesto".
  const [consumesBudget, setConsumesBudget] = useState(template?.consumesBudget ?? false);
  const [busy, setBusy] = useState(false);
  const formKey = template?.id ?? 'new';

  // "Respaldar con presupuesto" solo aplica a gastos cuya categoría YA tiene presupuesto (§5.9): no
  // se crean presupuestos automáticamente. Si la categoría no tiene, la opción no se muestra.
  const categoryBudget =
    payKind === 'expense' && categoryId ? budgetForCategory(categoryId, budgets) : null;
  const canBudgetBack = !!categoryBudget;
  // Un fijo respaldado no se paga con un único medio (su tope se llena con gastos variables de la
  // categoría), así que se oculta "Medio por defecto" mientras el check esté activo.
  const hidePaymentMethod = payKind === 'expense' && canBudgetBack && budgetBacked;

  const spendCategories = categories.filter((c) => !c.archived && !c.isSystem);
  const accountOptions = accounts
    .filter((a) => !a.archived)
    .map((a) => ({ value: refToValue({ kind: 'account', id: a.id }), label: a.name }));
  const cardOptions = cards
    .filter((c) => !c.archived)
    .map((c) => ({ value: refToValue({ kind: 'card', id: c.id }), label: `${c.name} (TC)` }));
  // Origen: gasto puede salir de cuenta o tarjeta; abono sale de una cuenta.
  const paymentOptions =
    payKind === 'expense' ? [...accountOptions, ...cardOptions] : accountOptions;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // Solo un gasto con presupuesto en su categoría puede quedar respaldado (§5.9).
    const isBudgetBacked = payKind === 'expense' && canBudgetBack && budgetBacked;
    // "Consume de un presupuesto": gasto de una categoría con presupuesto, NO respaldado (excluyente).
    const isConsumesBudget = payKind === 'expense' && canBudgetBack && consumesBudget && !budgetBacked;

    // El modelo exige un medio (EntityRef no-nulo). Para un respaldado el campo se oculta y el medio
    // no se usa (no se paga): si no hay uno elegido, se rellena con la primera cuenta como placeholder.
    let method = valueToRef(paymentMethod);
    if (isBudgetBacked && !method) {
      const firstAccount = accounts.find((a) => !a.archived);
      method = firstAccount ? { kind: 'account', id: firstAccount.id } : null;
    }
    if (!uid || !name.trim() || !method) return;
    if (payKind === 'expense' && !categoryId) return;
    if (payKind === 'debt_payment' && !debtTargetId) return;
    const data = {
      name: name.trim(),
      budgetedAmount: Math.round(Number(amount) || 0),
      categoryId: payKind === 'expense' ? categoryId : '',
      defaultPaymentMethod: method,
      payKind,
      debtTargetId: payKind === 'debt_payment' ? debtTargetId : null,
      budgetBacked: isBudgetBacked,
      consumesBudget: isConsumesBudget,
    };

    setBusy(true);
    try {
      if (isEdit && template) {
        await updateFixedTemplate(uid, template.id, data);
        // Propaga el cambio a los fijos NO pagados de este mes (los pagados se conservan).
        await syncMonthlyToTemplate(uid, template.id, currentMonthKey(), {
          name: data.name,
          budgetedAmount: data.budgetedAmount,
          categoryId: data.categoryId,
          payKind: data.payKind,
          debtTargetId: data.debtTargetId,
          budgetBacked: data.budgetBacked,
          consumesBudget: data.consumesBudget,
          paymentMethod: method,
        });
        // Sync bidireccional crédito↔cuota (§5.6): si cambió el monto y el destino es un crédito,
        // su cuota mensual se actualiza al nuevo valor.
        if (data.budgetedAmount !== template.budgetedAmount) {
          await syncCuotaFromTemplate(uid, template, data.budgetedAmount, loans);
        }
        // Espejo fijo→presupuesto (§5.9): si es respaldado, el tope del presupuesto = monto (T→B).
        if (isBudgetBacked) {
          await alignBudgetToTemplate(uid, data);
        }
      } else {
        await createFixedTemplate(uid, data);
        if (isBudgetBacked) await alignBudgetToTemplate(uid, data);
      }
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title={isEdit ? 'Editar fijo' : 'Nuevo fijo'} onClose={onClose}>
      <form key={formKey} onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          autoFocus
          placeholder="Concepto (p.ej. Arriendo)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
        />
        <MoneyInput
          placeholder="Monto mensual (COP)"
          value={amount}
          onChange={setAmount}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
        />

        <div className="flex gap-2">
          {(['expense', 'debt_payment'] as FixedPayKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setPayKind(k)}
              className={`flex-1 rounded-lg py-2 text-sm ${
                payKind === k ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {k === 'expense' ? 'Gasto' : 'Abono a deuda'}
            </button>
          ))}
        </div>

        {payKind === 'expense' && (
          <SelectField
            label="Categoría"
            value={categoryId}
            onChange={setCategoryId}
            options={spendCategories.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Selecciona categoría…"
          />
        )}

        {/* Respaldar con presupuesto (§5.9): solo si la categoría YA tiene presupuesto. No se paga;
            se llena solo cuando el gasto de la categoría alcanza el tope. */}
        {canBudgetBack && (
          <label className="flex items-start gap-2 rounded-xl bg-slate-50 p-3">
            <input
              type="checkbox"
              checked={budgetBacked}
              onChange={(e) => {
                setBudgetBacked(e.target.checked);
                if (e.target.checked) setConsumesBudget(false); // excluyente
              }}
              className="mt-0.5 h-5 w-5 shrink-0 accent-slate-800"
            />
            <span className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">Respaldar con presupuesto</span>
              <br />
              No se paga: se marca lleno cuando el gasto de esta categoría alcanza el tope. El monto
              va en espejo con el presupuesto.
            </span>
          </label>
        )}

        {/* Consume de un presupuesto (§5.9 ext.): el fijo es un ítem del checklist de la bolsa de su
            categoría. Se paga normal, descuenta esa bolsa y NO suma aparte al total de fijos. */}
        {canBudgetBack && (
          <label className="flex items-start gap-2 rounded-xl bg-slate-50 p-3">
            <input
              type="checkbox"
              checked={consumesBudget}
              onChange={(e) => {
                setConsumesBudget(e.target.checked);
                if (e.target.checked) setBudgetBacked(false); // excluyente
              }}
              className="mt-0.5 h-5 w-5 shrink-0 accent-slate-800"
            />
            <span className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">Consume de un presupuesto</span>
              <br />
              Se paga normal y descuenta el presupuesto de esta categoría. Aparece como ítem del
              checklist de esa bolsa y no se suma aparte a los fijos del mes.
            </span>
          </label>
        )}

        {!hidePaymentMethod && (
          <SelectField
            label={payKind === 'expense' ? 'Medio por defecto' : 'Abonar desde'}
            value={paymentMethod}
            onChange={setPaymentMethod}
            options={paymentOptions}
            placeholder="Selecciona…"
          />
        )}

        {payKind === 'debt_payment' && (
          <SelectField
            label="Deuda a abonar"
            value={debtTargetId}
            onChange={setDebtTargetId}
            options={[
              ...cards
                .filter((c) => !c.archived)
                .map((c) => ({ value: c.id, label: `${c.name} (TC)` })),
              ...loans
                .filter((l) => !l.archived)
                .map((l) => ({ value: l.id, label: `${l.name} (crédito)` })),
            ]}
            placeholder="Selecciona tarjeta o crédito…"
          />
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-slate-800 py-3 font-medium text-white disabled:opacity-50"
        >
          {isEdit ? 'Guardar' : 'Crear fijo'}
        </button>
      </form>
    </Modal>
  );
}
