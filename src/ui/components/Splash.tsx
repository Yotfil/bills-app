// Pantalla de carga mientras se resuelve la sesión o los ajustes del usuario.
export function Splash() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50">
      <p className="animate-pulse text-slate-400">Cargando…</p>
    </main>
  );
}
