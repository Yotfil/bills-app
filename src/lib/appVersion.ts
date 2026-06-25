// Versión de la app. Estos valores los inyecta Vite en build (ver vite.config.ts → define):
// la versión semántica viene de package.json (manual, para releases con sentido) y el commit
// + la fecha son automáticos en cada deploy, para confirmar qué build está desplegado en vivo.
export const APP_VERSION = __APP_VERSION__;
export const APP_COMMIT = __APP_COMMIT__;
export const APP_BUILD_TIME = __APP_BUILD_TIME__;
