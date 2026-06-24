import { useState } from 'react';
import { useSessionStore } from '../../../store/sessionStore';
import { Button } from '../../components/Button';
import { clearUserData } from '../../../data/clearUserData';
import { seedRealData } from '../../../data/seedRealData';

// Pantalla TEMPORAL para sembrar los datos reales del dueño (CLAUDE.md §7, carga inicial).
// Se elimina después de usarla. Pasos: 1) Borrar todo  2) Sembrar datos reales.
export function SeedDataScreen() {
  const uid = useSessionStore((s) => s.user?.uid);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleClear() {
    if (!uid) return;
    if (
      !confirm(
        '¿Borrar TODOS tus datos (cuentas, tarjetas, créditos, fijos, movimientos)? Las categorías base se conservan.',
      )
    ) {
      return;
    }
    setBusy(true);
    setStatus('Borrando…');
    try {
      const n = await clearUserData(uid);
      setStatus(`✅ Borrado: ${n} documentos eliminados. Ahora puedes sembrar.`);
    } catch (e) {
      setStatus(`❌ Error al borrar: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleSeed() {
    if (!uid) return;
    setBusy(true);
    setStatus('Sembrando datos reales…');
    try {
      const r = await seedRealData(uid);
      setStatus(
        `✅ Sembrado: ${r.accounts} cuentas, ${r.cards} tarjetas, ${r.loans} créditos, ${r.fixedTemplates} fijos.`,
      );
    } catch (e) {
      setStatus(`❌ Error al sembrar: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <h1 className="text-xl font-bold text-slate-800">Sembrar mis datos (temporal)</h1>
      <p className="text-sm text-slate-500">
        Carga inicial de tus datos reales. Primero borra lo de prueba, luego siembra. Esta pantalla
        se eliminará después de usarla.
      </p>

      <div className="flex flex-col gap-3">
        <Button variant="secondary" onClick={handleClear} disabled={busy}>
          1. Borrar todo
        </Button>
        <Button onClick={handleSeed} disabled={busy}>
          2. Sembrar datos reales
        </Button>
      </div>

      {status && (
        <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
          {status}
        </p>
      )}

      <p className="text-xs text-slate-400">
        Tras sembrar, ve a <strong>Fijos</strong> y genera los fijos del mes. Global66 se guarda en
        COP (9.918 USD × ~3.433 ≈ $34.051.370).
      </p>
    </div>
  );
}
