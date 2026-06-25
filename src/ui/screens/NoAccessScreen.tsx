import { logout } from '../../data/authRepository';
import { useSessionStore } from '../../store/sessionStore';
import { Brand } from '../components/Brand';

// Pantalla para usuarios autenticados que NO están en la allowlist (early access). La cuenta
// existe en Firebase Auth, pero las reglas le niegan todo dato hasta que el dueño apruebe su
// correo. Se le explica y se le ofrece cerrar sesión.
export function NoAccessScreen() {
  const email = useSessionStore((s) => s.user?.email);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-6 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <Brand size="lg" />

        <div className="flex flex-col gap-2">
          <h1 className="text-lg font-semibold text-slate-800">Acceso por invitación</h1>
          <p className="text-sm text-slate-500">
            Por ahora Mis Luks está en acceso anticipado. Tu cuenta se creó, pero aún no tiene
            acceso a la app.
          </p>
          {email && (
            <p className="text-sm text-slate-500">
              Pide que habiliten tu correo:{' '}
              <span className="font-medium text-slate-700">{email}</span>
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
        >
          Cerrar sesión
        </button>
      </div>
    </main>
  );
}
