import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserCollection } from '../../hooks/useUserCollection';
import { useSessionStore } from '../../../store/sessionStore';
import { logout } from '../../../data/authRepository';
import { AccountForm } from '../AccountForm';
import { CardForm } from '../CardForm';
import { LoanForm } from '../loans/LoanForm';
import { Button } from '../../components/Button';
import { OnboardingStep } from './OnboardingStep';
import { OnboardingItemList } from './OnboardingItemList';
import { formatCop } from '../../../lib/currency';
import { completeOnboarding } from '../../../data/userRepository';
import { seedSuggestedFixedTemplates } from '../../../data/suggestedFixedTemplates';
import { subscribeAccounts } from '../../../data/accountRepository';
import { subscribeCards } from '../../../data/cardRepository';
import { subscribeLoans } from '../../../data/loanRepository';
import { subscribeCategories } from '../../../data/categoryRepository';
import { subscribeFixedTemplates } from '../../../data/fixedTemplateRepository';
import type {
  Account,
  Category,
  CreditCard,
  FixedObligationTemplate,
  Loan,
} from '../../../domain/types';

const TOTAL_STEPS = 5;

// Onboarding de primera vez (CLAUDE.md §7): siembra cuentas (clave), tarjetas, créditos y la
// plantilla de fijos sugerida. Reusa los formularios de cada CRUD. Al terminar, marca
// onboardingCompleted para no volver a mostrarse.
export function OnboardingScreen() {
  const uid = useSessionStore((s) => s.user?.uid);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedNote, setSeedNote] = useState<string | null>(null);

  const { items: accounts } = useUserCollection<Account>(subscribeAccounts);
  const { items: cards } = useUserCollection<CreditCard>(subscribeCards);
  const { items: loans } = useUserCollection<Loan>(subscribeLoans);
  const { items: categories } = useUserCollection<Category>(subscribeCategories);
  const { items: templates } = useUserCollection<FixedObligationTemplate>(subscribeFixedTemplates);

  const activeAccounts = accounts.filter((a) => !a.archived);

  async function handleSeedSuggested() {
    const firstAccount = activeAccounts[0];
    if (!uid || !firstAccount) return;
    setSeeding(true);
    setSeedNote(null);
    try {
      const created = await seedSuggestedFixedTemplates(
        uid,
        { kind: 'account', id: firstAccount.id },
        categories,
      );
      // Si no se creó nada, decir POR QUÉ en vez de quedarse mudo (era el bug: el botón no daba
      // ninguna señal). Las dos causas silenciosas: ya hay plantilla, o las categorías base aún
      // no cargaron (el filtro las necesita por nombre).
      if (created === 0) {
        setSeedNote(
          categories.length === 0
            ? 'Tus categorías aún se están cargando. Espera un segundo y vuelve a intentar.'
            : 'Ya tienes una plantilla cargada (no se duplicó nada).',
        );
      }
    } catch (err) {
      setSeedNote(
        `No se pudo cargar la plantilla: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setSeeding(false);
    }
  }

  // Termina (o salta) el onboarding: lo marca completado para no quedar atrapado y entra a la
  // app. Se puede volver luego desde el dashboard (ruta /onboarding).
  //
  // Navegamos de INMEDIATO según la intención del usuario y persistimos el flag en segundo
  // plano. Si esperáramos el ACK del servidor antes de `navigate('/')`, ese await (lento bajo
  // mala señal) dispararía un navigate('/') TARDÍO que sacaría al usuario de donde ya navegó
  // (entró a la app vía el snapshot local optimista). La persistencia offline garantiza que
  // la escritura se sincroniza igual.
  function handleFinish() {
    if (!uid) return;
    setFinishing(true);
    void completeOnboarding(uid);
    navigate('/');
  }

  return (
    <main className="flex min-h-dvh flex-col bg-slate-50">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-6">
        {step > 0 && (
          <p className="text-center text-xs text-slate-400">
            Paso {step} de {TOTAL_STEPS}
          </p>
        )}

        {step === 0 && (
          <OnboardingStep
            title="Bienvenido a Mis Luks"
            subtitle="Vamos a sembrar tus datos para que el “Disponible real” refleje tu vida. Toma 2 minutos y puedes ajustar todo después."
          >
            <Button onClick={() => setStep(1)}>Empecemos</Button>
          </OnboardingStep>
        )}

        {step === 1 && (
          <OnboardingStep
            title="Tus cuentas"
            subtitle="Agrega tus cuentas con su saldo real (ahorros, efectivo, CDT). Es el paso más importante."
          >
            <OnboardingItemList
              items={activeAccounts.map((a) => ({
                id: a.id,
                primary: a.name,
                secondary: formatCop(a.cachedBalance),
              }))}
              empty="Aún no agregas cuentas."
            />
            <Button variant="secondary" onClick={() => setShowForm(true)}>
              + Agregar cuenta
            </Button>
            <Button onClick={() => setStep(2)} disabled={activeAccounts.length === 0}>
              {activeAccounts.length === 0 ? 'Agrega al menos una cuenta' : 'Continuar'}
            </Button>
            <AccountForm open={showForm} onClose={() => setShowForm(false)} />
          </OnboardingStep>
        )}

        {step === 2 && (
          <OnboardingStep
            title="Tarjetas de crédito"
            subtitle="Opcional. Agrega tus tarjetas con su cupo y deuda actual."
          >
            <OnboardingItemList
              items={cards
                .filter((c) => !c.archived)
                .map((c) => ({
                  id: c.id,
                  primary: c.name,
                  secondary: `deuda ${formatCop(c.cachedDebt)}`,
                }))}
              empty="Sin tarjetas (puedes omitir)."
            />
            <Button variant="secondary" onClick={() => setShowForm(true)}>
              + Agregar tarjeta
            </Button>
            <Button onClick={() => setStep(3)}>Continuar</Button>
            <CardForm open={showForm} onClose={() => setShowForm(false)} />
          </OnboardingStep>
        )}

        {step === 3 && (
          <OnboardingStep
            title="Créditos grandes"
            subtitle="Opcional. Créditos como el del carro o vivienda, con su saldo y cuota."
          >
            <OnboardingItemList
              items={loans
                .filter((l) => !l.archived)
                .map((l) => ({
                  id: l.id,
                  primary: l.name,
                  secondary: `saldo ${formatCop(l.cachedBalance)}`,
                }))}
              empty="Sin créditos (puedes omitir)."
            />
            <Button variant="secondary" onClick={() => setShowForm(true)}>
              + Agregar crédito
            </Button>
            <Button onClick={() => setStep(4)}>Continuar</Button>
            <LoanForm open={showForm} onClose={() => setShowForm(false)} />
          </OnboardingStep>
        )}

        {step === 4 && (
          <OnboardingStep
            title="Obligaciones fijas"
            subtitle="Carga una plantilla sugerida de gastos fijos mensuales. Luego ajustas montos, medios y agregas los abonos a deuda."
          >
            {templates.length === 0 ? (
              <>
                <Button
                  variant="secondary"
                  onClick={handleSeedSuggested}
                  disabled={seeding || activeAccounts.length === 0}
                >
                  {seeding ? 'Cargando…' : 'Cargar plantilla sugerida'}
                </Button>
                {activeAccounts.length === 0 && (
                  <p className="text-center text-xs text-slate-400">
                    Primero agrega una cuenta (paso 1) para poder asignar el medio de pago.
                  </p>
                )}
                {seedNote && (
                  <p className="rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-700">
                    {seedNote}
                  </p>
                )}
              </>
            ) : (
              <p className="rounded-xl bg-emerald-50 p-3 text-center text-sm text-emerald-700">
                Tienes {templates.length} fijos en tu plantilla. ✅
              </p>
            )}
            <Button onClick={() => setStep(5)}>Continuar</Button>
          </OnboardingStep>
        )}

        {step === 5 && (
          <OnboardingStep
            title="¡Todo listo!"
            subtitle="Ya puedes registrar movimientos y ver tu disponible real. Recuerda generar tus fijos del mes en la pestaña Fijos."
          >
            <Button onClick={handleFinish} disabled={finishing}>
              {finishing ? 'Entrando…' : 'Entrar a la app'}
            </Button>
          </OnboardingStep>
        )}

        {step > 0 && step < 5 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="text-center text-sm text-slate-400 underline"
          >
            Atrás
          </button>
        )}

        {/* Salir del flujo sin quedar atrapado: se puede volver luego desde el dashboard. */}
        <div className="mt-2 flex items-center justify-center gap-4 text-xs text-slate-400">
          <button type="button" onClick={handleFinish} disabled={finishing} className="underline">
            Saltar por ahora
          </button>
          <span>·</span>
          <button type="button" onClick={() => void logout()} className="underline">
            Cerrar sesión
          </button>
        </div>
      </div>
    </main>
  );
}
