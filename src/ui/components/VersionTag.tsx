import { APP_VERSION, APP_COMMIT, APP_BUILD_TIME } from '../../lib/appVersion';

// Etiqueta de versión para el footer de "Más". Muestra la versión semántica + el commit y la
// fecha del build (estos dos cambian en cada deploy), así de un vistazo se sabe qué build está
// en vivo: útil para confirmar si Netlify ya publicó la versión nueva.
export function VersionTag() {
  const built = new Date(APP_BUILD_TIME);
  const builtLabel = Number.isNaN(built.getTime())
    ? APP_BUILD_TIME
    : built.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <p className="text-center text-xs text-slate-400">
      v{APP_VERSION} · {APP_COMMIT} · {builtLabel}
    </p>
  );
}
