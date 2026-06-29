import { useState } from 'react';
import { logout } from '../../data/authRepository';
import { cleanupBackedFixed, restoreBackedFixed } from '../../data/backedCleanup';
import { useSessionStore } from '../../store/sessionStore';
import { BackButton } from '../components/BackButton';
import { ThemePicker } from '../components/ThemePicker';
import { VersionTag } from '../components/VersionTag';

// Ajustes (CLAUDE.md §8.4): preferencias del usuario (tema) y cuenta (sesión). Se separó de "Más"
// para no saturar ese menú; a futuro aquí van más opciones de usuario.
export function SettingsScreen() {
  const user = useSessionStore((s) => s.user);
  const uid = user?.uid;
  const [busy, setBusy] = useState(false);
  const [maintMsg, setMaintMsg] = useState<string | null>(null);

  // Limpieza de "fijos respaldados" antiguos (Opción C, PR2): borra los dormidos PERO con respaldo en
  // Firestore para poder revertir con "Restaurar". No toca presupuestos ni fijos normales.
  async function handleCleanupBacked() {
    if (!uid || busy) return;
    if (
      !confirm(
        '¿Limpiar los fijos respaldados antiguos? Se respaldan primero (puedes restaurar) y luego se borran. No toca presupuestos.',
      )
    ) {
      return;
    }
    setBusy(true);
    setMaintMsg(null);
    try {
      const r = await cleanupBackedFixed(uid);
      setMaintMsg(`Listo: respaldados y borrados ${r.templates} plantillas y ${r.monthly} instancias.`);
    } catch (e) {
      setMaintMsg(`Error: ${e instanceof Error ? e.message : 'no se pudo limpiar'}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleRestoreBacked() {
    if (!uid || busy) return;
    if (!confirm('¿Restaurar los fijos respaldados desde el respaldo? (rollback)')) return;
    setBusy(true);
    setMaintMsg(null);
    try {
      const r = await restoreBackedFixed(uid);
      setMaintMsg(`Restaurados ${r.templates} plantillas y ${r.monthly} instancias desde el respaldo.`);
    } catch (e) {
      setMaintMsg(`Error: ${e instanceof Error ? e.message : 'no se pudo restaurar'}`);
    } finally {
      setBusy(false);
    }
  }

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

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-700">Mantenimiento</p>
        <p className="mt-1 text-xs text-slate-400">
          Limpia los “fijos respaldados” antiguos (ya migrados a presupuestos). Se respaldan antes de
          borrar; usa “Restaurar” si algo falla.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleCleanupBacked()}
            disabled={busy}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
          >
            Limpiar respaldados antiguos
          </button>
          <button
            type="button"
            onClick={() => void handleRestoreBacked()}
            disabled={busy}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-500 disabled:opacity-50"
          >
            Restaurar
          </button>
        </div>
        {maintMsg && <p className="mt-2 text-xs text-slate-500">{maintMsg}</p>}
      </div>

      <VersionTag />
    </div>
  );
}
