import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { SelectField } from '../../components/SelectField';
import { useSessionStore } from '../../../store/sessionStore';
import { refToValue, valueToRef } from '../../../lib/entityRef';
import { createFixedTemplate, updateFixedTemplate } from '../../../data/fixedTemplateRepository';
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
  const [busy, setBusy] = useState(false);
  const formKey = template?.id ?? 'new';

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
    const method = valueToRef(paymentMethod);
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
    };

    setBusy(true);
    try {
      if (isEdit && template) {
        await updateFixedTemplate(uid, template.id, data);
      } else {
        await createFixedTemplate(uid, data);
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
        <input
          type="number"
          inputMode="numeric"
          placeholder="Monto mensual (COP)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
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

        <SelectField
          label={payKind === 'expense' ? 'Medio por defecto' : 'Abonar desde'}
          value={paymentMethod}
          onChange={setPaymentMethod}
          options={paymentOptions}
          placeholder="Selecciona…"
        />

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
