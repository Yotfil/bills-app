import { useState, type FormEvent } from 'react';
import { loginWithEmail, loginWithGoogle, registerWithEmail } from '../../data/authRepository';

// Pantalla de inicio de sesión (CLAUDE.md §7, paso 1 del onboarding).
// Soporta Google y correo/contraseña (ambos, §3). El listener de sesión
// (useAuthSync) se encarga de redirigir cuando el login tiene éxito.

type Mode = 'login' | 'register';

/** Traduce los códigos de error de Firebase Auth a mensajes claros en español. */
function messageForError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'El correo no es válido.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Correo o contraseña incorrectos.';
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta con ese correo.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/popup-closed-by-user':
      return 'Se cerró la ventana de Google antes de terminar.';
    default:
      return 'No se pudo completar. Intenta de nuevo.';
  }
}

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
    } catch (err) {
      setError(messageForError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(messageForError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center gap-6 bg-slate-50 px-6 py-10">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-slate-800">Finanzas</h1>
        <p className="mt-1 text-sm text-slate-500">
          {mode === 'login' ? 'Inicia sesión para continuar' : 'Crea tu cuenta'}
        </p>
      </header>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={busy}
        className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 font-medium text-slate-700 shadow-sm disabled:opacity-50"
      >
        Continuar con Google
      </button>

      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />o<span className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-slate-500"
        />
        <input
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-slate-500"
        />

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-slate-800 py-3 font-medium text-white shadow-sm disabled:opacity-50"
        >
          {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500">
        {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
          className="font-medium text-slate-800 underline"
        >
          {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
        </button>
      </p>
    </main>
  );
}
