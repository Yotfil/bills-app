import { logout } from '../../data/authRepository';
import { useSessionStore } from '../../store/sessionStore';
import { BackButton } from '../components/BackButton';
import { ThemePicker } from '../components/ThemePicker';
import { VersionTag } from '../components/VersionTag';

// Ajustes (CLAUDE.md §8.4): preferencias del usuario (tema) y cuenta (sesión). Se separó de "Más"
// para no saturar ese menú; a futuro aquí van más opciones de usuario.
export function SettingsScreen() {
  const user = useSessionStore((s) => s.user);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <BackButton />
      <h1 className="text-xl font-bold text-slate-800">Ajustes</h1>

      <ThemePicker />

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">
          Sesión:{' '}
          <span className="font-medium text-slate-700">{user?.email ?? user?.displayName}</span>
        </p>
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
        >
          Cerrar sesión
        </button>
      </div>

      <VersionTag />
    </div>
  );
}
