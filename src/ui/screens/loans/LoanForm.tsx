import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { SelectField } from '../../components/SelectField';
import { useSessionStore } from '../../../store/sessionStore';
import { createLoan, updateLoan } from '../../../data/loanRepository';
import { syncCuotaFromLoan } from '../../../data/loanCuotaService';
import { currentMonthKey } from '../../../lib/date';
import type { LoanFormProps } from './LoanFormProps';

// Crear/editar un crédito grande (CLAUDE.md §5.6). El saldo solo se siembra al crear; luego
// baja con abonos (debt_payment). La tasa anual es opcional (mejora la fecha estimada). Se puede
// ligar la cuota a un fijo "abono a deuda" que ya apunte a este crédito (§5.6): comparten valor.
export function LoanForm({ open, loan, templates, onClose }: LoanFormProps) {
  const uid = useSessionStore((s) => s.user?.uid);
  const isEdit = !!loan;
  const [name, setName] = useState(loan?.name ?? '');
  const [originalAmount, setOriginalAmount] = useState(String(loan?.originalAmount ?? ''));
  const [currentBalance, setCurrentBalance] = useState(String(loan?.cachedBalance ?? ''));
  const [monthlyPayment, setMonthlyPayment] = useState(String(loan?.monthlyPayment ?? ''));
  // La tasa se muestra/ingresa como porcentaje anual; se guarda como fracción (24 → 0.24).
  const [ratePct, setRatePct] = useState(
    loan?.annualRate != null ? String(loan.annualRate * 100) : '',
  );
  const [linkedFixedTemplateId, setLinkedFixedTemplateId] = useState(
    loan?.linkedFixedTemplateId ?? '',
  );
  const [busy, setBusy] = useState(false);
  const formKey = loan?.id ?? 'new';

  // Solo se pueden ligar fijos de tipo "abono a deuda" que ya apunten a ESTE crédito (para que
  // el pago baje el saldo correcto). El vínculo se elige al editar (un crédito nuevo no tiene id).
  const eligibleTemplates = loan
    ? templates.filter(
        (t) => !t.archived && t.payKind === 'debt_payment' && t.debtTargetId === loan.id,
      )
    : [];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!uid || !name.trim()) return;
    const annualRate = ratePct.trim() === '' ? null : Number(ratePct) / 100;
    const payment = Math.round(Number(monthlyPayment) || 0);
    setBusy(true);
    try {
      if (isEdit && loan) {
        const linkedId = linkedFixedTemplateId || null;
        await updateLoan(uid, loan.id, {
          name: name.trim(),
          originalAmount: Math.round(Number(originalAmount) || 0),
          monthlyPayment: payment,
          annualRate,
          linkedFixedTemplateId: linkedId,
        });
        // La cuota del crédito manda: al ligar/editar, su valor se propaga al fijo (§5.6).
        if (linkedId) {
          await syncCuotaFromLoan(uid, linkedId, payment, currentMonthKey());
        }
      } else {
        await createLoan(uid, {
          name,
          originalAmount: Math.round(Number(originalAmount) || 0),
          currentBalance: Math.round(Number(currentBalance) || 0),
          monthlyPayment: payment,
          annualRate,
        });
      }
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title={isEdit ? 'Editar crédito' : 'Nuevo crédito'} onClose={onClose}>
      <form key={formKey} onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          autoFocus
          placeholder="Nombre (p.ej. Crédito carro)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
        />
        <input
          type="number"
          inputMode="numeric"
          placeholder="Monto original (COP)"
          value={originalAmount}
          onChange={(e) => setOriginalAmount(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
        />
        {!isEdit && (
          <input
            type="number"
            inputMode="numeric"
            placeholder="Saldo actual (COP)"
            value={currentBalance}
            onChange={(e) => setCurrentBalance(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
          />
        )}
        <input
          type="number"
          inputMode="numeric"
          placeholder="Cuota mensual (COP)"
          value={monthlyPayment}
          onChange={(e) => setMonthlyPayment(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
        />
        <input
          type="number"
          inputMode="decimal"
          placeholder="Tasa anual % (opcional)"
          value={ratePct}
          onChange={(e) => setRatePct(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
        />
        {isEdit && eligibleTemplates.length > 0 && (
          <label className="flex flex-col gap-1">
            <SelectField
              label="Ligar la cuota a un fijo"
              value={linkedFixedTemplateId}
              onChange={setLinkedFixedTemplateId}
              options={eligibleTemplates.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="Sin vincular"
            />
            <span className="text-xs text-slate-400">
              Ligados, comparten el valor de la cuota y el pago del mes se refleja en ambos.
            </span>
          </label>
        )}
        {isEdit && eligibleTemplates.length === 0 && (
          <p className="text-xs text-slate-400">
            Para ligar la cuota, crea un fijo de tipo “abono a deuda” que apunte a este crédito.
          </p>
        )}
        {isEdit && (
          <p className="text-xs text-slate-400">
            El saldo no se edita aquí: baja con cada abono a la cuota (§5.6).
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-slate-800 py-3 font-medium text-white disabled:opacity-50"
        >
          {isEdit ? 'Guardar' : 'Crear crédito'}
        </button>
      </form>
    </Modal>
  );
}
