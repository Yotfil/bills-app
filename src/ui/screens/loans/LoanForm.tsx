import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { useSessionStore } from '../../../store/sessionStore';
import { createLoan, updateLoan } from '../../../data/loanRepository';
import { syncCuotaFromLoan } from '../../../data/cuotaService';
import { currentMonthKey } from '../../../lib/date';
import type { LoanFormProps } from './LoanFormProps';

// Crear/editar un crédito grande (CLAUDE.md §5.6). El saldo solo se siembra al crear; luego
// baja con abonos (debt_payment). La tasa anual es opcional (mejora la fecha estimada). El
// vínculo con la cuota es implícito (un fijo "abono a deuda" que apunte a este crédito): aquí
// solo, si cambia la cuota, su valor se propaga a ese fijo (§5.6).
export function LoanForm({ open, loan, onClose }: LoanFormProps) {
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
  const [busy, setBusy] = useState(false);
  const formKey = loan?.id ?? 'new';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!uid || !name.trim()) return;
    const annualRate = ratePct.trim() === '' ? null : Number(ratePct) / 100;
    const payment = Math.round(Number(monthlyPayment) || 0);
    setBusy(true);
    try {
      if (isEdit && loan) {
        await updateLoan(uid, loan.id, {
          name: name.trim(),
          originalAmount: Math.round(Number(originalAmount) || 0),
          monthlyPayment: payment,
          annualRate,
        });
        // Sync bidireccional (§5.6): si cambió la cuota, su valor se propaga al fijo ligado.
        if (payment !== loan.monthlyPayment) {
          await syncCuotaFromLoan(uid, loan.id, payment, currentMonthKey());
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
        {isEdit && (
          <p className="text-xs text-slate-400">
            El saldo no se edita aquí: baja con cada abono a la cuota (§5.6). Para ligar la cuota a
            un fijo, hazlo desde el fijo (campo “Deuda a abonar”).
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
