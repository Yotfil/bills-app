import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserCollection } from '../../hooks/useUserCollection';
import { useSessionStore } from '../../../store/sessionStore';
import { BackButton } from '../../components/BackButton';
import { SubscriptionTotalsCard } from './SubscriptionTotalsCard';
import { SubscriptionAlerts } from './SubscriptionAlerts';
import { SubscriptionItem } from './SubscriptionItem';
import { subscriptionRows, subscriptionTotals, upcomingRenewals } from '../../../domain/subscriptions';
import { subscribeFixedTemplates, setCancelCandidate } from '../../../data/fixedTemplateRepository';
import {
  subscribeCategories,
  SUBSCRIPTIONS_CATEGORY_NAME,
} from '../../../data/categoryRepository';
import { subscribeTransactions } from '../../../data/transactionRepository';
import { dayKey } from '../../../lib/date';
import type { Category, FixedObligationTemplate, Transaction } from '../../../domain/types';

// Cuántos días antes de renovar se considera "renueva pronto".
const RENEWAL_WINDOW_DAYS = 5;

// Módulo de Suscripciones (CLAUDE.md §15): vista derivada de los fijos de la categoría
// "Suscripciones". Visibilidad (total mensual y anualizado) + gestión ligera (subidas de precio,
// renovaciones próximas y marcar candidatas a cancelar). Toda la lógica es pura (domain/
// subscriptions); aquí solo se alimenta y se dibuja. No introduce movimientos ni toca saldos.
export function SubscriptionsScreen() {
  const navigate = useNavigate();
  const uid = useSessionStore((s) => s.user?.uid);
  const { items: templates } = useUserCollection<FixedObligationTemplate>(subscribeFixedTemplates);
  const { items: categories } = useUserCollection<Category>(subscribeCategories);
  const { items: transactions } = useUserCollection<Transaction>(subscribeTransactions);

  // Una suscripción es un fijo de la categoría base "Suscripciones" (§6). Se resuelve su id por
  // nombre, como el resto de la app; si el usuario la renombró/archivó, no hay nada que mostrar.
  const subscriptionsCategoryId = useMemo(
    () => categories.find((c) => c.name === SUBSCRIPTIONS_CATEGORY_NAME && !c.archived)?.id ?? null,
    [categories],
  );

  const rows = useMemo(
    () => subscriptionRows(templates, transactions, subscriptionsCategoryId, (t) => dayKey(t.date)),
    [templates, transactions, subscriptionsCategoryId],
  );
  const totals = useMemo(() => subscriptionTotals(rows), [rows]);

  // Renovaciones relativas a HOY (no a un mes seleccionado): qué día del mes cobra y cuánto falta.
  const today = new Date();
  const todayDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysUntilByTemplate = useMemo(() => {
    const soon = upcomingRenewals(rows, todayDay, daysInMonth, RENEWAL_WINDOW_DAYS);
    return new Map(soon.map((s) => [s.templateId, s.daysUntil]));
  }, [rows, todayDay, daysInMonth]);

  const priceIncreaseCount = rows.filter((r) => r.priceIncrease).length;

  const handleToggleCancel = (templateId: string, next: boolean) => {
    if (uid) void setCancelCandidate(uid, templateId, next);
  };

  const openRegistro = () => {
    if (subscriptionsCategoryId) navigate(`/registro?cat=${subscriptionsCategoryId}`);
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <BackButton />
      <header>
        <h1 className="text-xl font-bold text-slate-800">Suscripciones</h1>
        <p className="text-sm text-slate-400">Tus pagos recurrentes, de un vistazo.</p>
      </header>

      {rows.length === 0 ? (
        <p className="text-slate-500">
          No tienes suscripciones activas. Crea fijos en la categoría "Suscripciones" para verlos
          aquí.
        </p>
      ) : (
        <>
          <SubscriptionTotalsCard totals={totals} count={rows.length} />
          <SubscriptionAlerts
            priceIncreaseCount={priceIncreaseCount}
            renewalCount={daysUntilByTemplate.size}
          />
          <ul className="flex flex-col gap-2">
            {rows.map((row) => (
              <SubscriptionItem
                key={row.templateId}
                row={row}
                daysUntilRenewal={daysUntilByTemplate.get(row.templateId) ?? null}
                onToggleCancel={(next) => handleToggleCancel(row.templateId, next)}
                onOpen={openRegistro}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
