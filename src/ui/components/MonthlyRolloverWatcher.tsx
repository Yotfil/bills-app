import { useEffect, useRef } from 'react';
import { useUserCollection } from '../hooks/useUserCollection';
import { useFixedMonthly } from '../hooks/useFixedMonthly';
import { useSessionStore } from '../../store/sessionStore';
import { subscribeFixedTemplates } from '../../data/fixedTemplateRepository';
import { generateFixedMonthly } from '../../data/fixedMonthlyRepository';
import { alignBudgetToTemplate } from '../../data/budgetFixedService';
import { currentMonthKey } from '../../lib/date';
import type { FixedObligationTemplate } from '../../domain/types';

// Rollover automático del mes (CLAUDE.md §5.10): al abrir la app, si el MES ACTUAL aún no tiene los
// fijos generados (porque el usuario no los cargó el mes anterior por algún motivo) y existe
// plantilla activa, los genera solo —así la plantilla siempre está cargada al iniciar el mes y los
// presupuestos respaldados reinician a su valor de plantilla—. Idempotente (no duplica). Se monta
// una vez en el layout para vigilar en toda la app; no renderiza nada.
export function MonthlyRolloverWatcher() {
  const uid = useSessionStore((s) => s.user?.uid);
  const month = currentMonthKey();
  const { items: fijos, loading } = useFixedMonthly(month);
  const { items: templates } =
    useUserCollection<FixedObligationTemplate>(subscribeFixedTemplates);
  // Evita disparar el rollover dos veces (la suscripción tarda en reflejar lo recién creado).
  const attempted = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!uid || loading) return;
    if (fijos.length > 0) return; // el mes ya está cargado
    const activeTemplates = templates.filter((t) => t.active && !t.archived);
    if (activeTemplates.length === 0) return; // no hay plantilla que cargar
    if (attempted.current.has(month)) return;
    attempted.current.add(month);
    void (async () => {
      await generateFixedMonthly(uid, month);
      // Alinea el tope del presupuesto al de la plantilla para los respaldados (B = T, §5.9, §5.10).
      await Promise.all(activeTemplates.map((t) => alignBudgetToTemplate(uid, t)));
    })();
  }, [uid, loading, fijos, templates, month]);

  return null;
}
