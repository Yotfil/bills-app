# MEMORY.md — Bitácora del proyecto (App Personal de Finanzas)

> **Propósito:** memoria viva del proyecto. Registra **qué se ha hecho**, **qué falta** y
> **decisiones tomadas**. Claude debe leer este archivo al iniciar y actualizarlo al
> terminar cada paso. Sirve también de bitácora para el dueño.
>
> La fuente de verdad de **qué** se construye y **bajo qué reglas** sigue siendo
> `CLAUDE.md`. Este archivo solo lleva el **estado de avance**.

**Última actualización:** 2026-06-23
**Estado general:** 🟢 Pasos 1–5 completos. Siguiente: Paso 6 (Cuentas y tarjetas: CRUD + saldos derivados en UI).

---

## Leyenda de estados
- ⬜ Pendiente — no se ha empezado
- 🟡 En progreso
- ✅ Hecho (con sus tests en verde)
- ⏭️ Diferido / fuera de alcance MVP

---

## Avance por pasos (§14 de CLAUDE.md)

| # | Paso | Estado | Notas |
|---|------|--------|-------|
| 1 | Scaffold: Vite + React + TS + Tailwind + Firebase + ESLint/Prettier + setup tests | ✅ | Vite 9 / React 19 / TS 6 estricto. Tailwind v4. Lint+unit+build+e2e en verde. Estructura por capas creada. |
| 2 | Catálogo de tests (§12) escrito primero (TDD) | ✅ | 79 casos unit como `it.todo` en `src/domain/__tests__/` + 8 flujos e2e como `test.fixme` en `e2e/catalog.spec.ts`. Se vuelven verdes en Pasos 4+. |
| 3 | Login (Google + correo/contraseña) + estructura `users/{uid}` + reglas seguridad | ✅ | Auth en `data/authRepository.ts`, doc raíz en `userRepository.ts`, sync→store en `useAuthSync`. UI: `LoginScreen` + `AppShell`. Reglas en `firestore.rules`. 5 tests de login. **Falta proyecto Firebase real.** |
| 4 | Capa de dominio: tipos (§9.1), validación (§11), funciones puras de saldos/estados | ✅ | `types.ts`, `validation.ts`, `ledger.ts`, `derived.ts`, `fixed.ts`, `reconciliation.ts`, `reports.ts`. 58 unit tests en verde (catálogo convertido). Pura, sin React/Firebase. Quedan `it.todo`: rollover (→Paso 9) y exchange-rate (→Paso 13). |
| 5 | Capa de datos: repositorios + converters Firestore (§9.2) | ✅ | `converters.ts` (genérico, quita/rehidrata `id`), `collections.ts` (refs tipadas por uid), `crud.ts` (list/subscribe/get/create/update/archive), `transactionService.ts` (create/edit/delete con `runTransaction` + `increment` + recálculo de cuentas). 3 tests de converter. Integración con emulador = pendiente. |
| 6 | Cuentas y tarjetas (CRUD) + saldos derivados | ⬜ | — |
| 7 | Registro de transacciones (captura cero fricción) + efectos en saldos | ⬜ | — |
| 8 | Dashboard (número-héroe + resumen + dona por categoría) | ⬜ | — |
| 9 | Fijos: plantilla, instancia mensual, 3 estados, reservado, fijo→registro al pagar | ⬜ | — |
| 10 | Reconciliación por cuenta | ⬜ | — |
| 11 | Presupuestos por categoría | ⬜ | — |
| 12 | Créditos con amortización y progreso | ⬜ | — |
| 13 | Tasa del dólar USD→COP (caché diaria + fallback) | ⬜ | — |
| 14 | Onboarding (siembra todo) + PWA (manifest, SW, instalable) | ⬜ | — |
| 15 | Suite e2e de flujos críticos en verde | ⬜ | — |

---

## Decisiones tomadas
*(Registrar aquí cualquier decisión técnica o de producto que se aparte o concrete el
CLAUDE.md, con fecha. Si surge una ambigüedad no cubierta, preguntar al dueño antes de
asumir y anotar la respuesta aquí.)*

- **2026-06-23 — Linter:** el scaffold de Vite 9 trae `oxlint`; se reemplazó por
  **ESLint + Prettier** para honrar CLAUDE.md §3 y §13.2 (que los nombran explícitamente).
- **2026-06-23 — Versiones:** Vite 9, React 19, TypeScript 6 (con `strict: true` y
  `noUncheckedIndexedAccess`), Tailwind **v4** (config vía `@tailwindcss/vite` + `@import
  'tailwindcss'`, sin `tailwind.config.js`).
- **2026-06-23 — Estructura por capas creada** (§13.3): `src/{ui,store,domain,data,lib,test}`.
  La lógica de negocio irá en `domain/` (pura), Firebase en `data/`.
- **2026-06-23 — Firebase:** config por variables de entorno (`.env.local`, ver
  `.env.example`); Firestore con persistencia offline multipestaña ya inicializada en
  `src/data/firebase.ts`. Falta crear el proyecto real en Firebase Console y rellenar claves.
- **2026-06-23 — Tests:** Vitest + Testing Library (unit) y Playwright (e2e, chromium +
  viewport móvil). Smoke tests en verde. Navegador chromium de Playwright ya instalado.
- **2026-06-23 — Manejo de estado: Zustand** (decidido sobre Context, §3). Convención:
  estado de cliente/UI en `src/store/` (slices por feature); datos de servidor llegan de
  Firestore vía la capa `data/`; los stores **orquestan, no contienen reglas de negocio**
  (esas viven en `domain/`). Primer store de referencia: `sessionStore.ts` (sesión/auth),
  con test. Se alimentará desde Firebase Auth en el Paso 3.
- **2026-06-23 — Capa de datos (Paso 5):** converters en UN solo lugar (`docConverter`
  genérico para todo `BaseDoc`: quita `id` al escribir, lo rehidrata desde `doc.id` al leer).
  `collections.ts` arma las refs `users/{uid}/<col>` tipadas con converter. CRUD genérico en
  `crud.ts`. **Escritura de movimientos solo por `transactionService`** (createTransaction /
  editTransaction / deleteTransaction): documento + cachés de saldo en una `runTransaction`
  atómica, usando `increment()` para evitar carreras (§9.3). `recalculateAccountBalances`
  reconstruye saldos de cuentas desde `initialBalance` + movimientos.
  - **Pendiente (seguimiento):** (a) tests de integración con el **emulador de Firestore**
    para runTransaction/reglas; (b) recálculo total de **tarjetas/créditos** requiere
    persistir su "semilla" de onboarding (hoy solo se recalc. cuentas) — agregar campo en el
    Paso 6/14.
- **2026-06-23 — Dominio (Paso 4):** lógica de negocio pura en `src/domain/`, sin React ni
  Firebase. Módulos: `validation` (§11, devuelve lista de errores), `ledger` (deltas por
  tipo de movimiento + revert/edit/recompute), `derived` (reservado, disponible, cupo,
  progreso, **disponible real**), `fixed` (máquina de estados + `buildTransactionFromFixed`),
  `reconciliation` (ajuste por desfase), `reports` (gasto/hormiga/presupuesto con la regla
  de oro §5.4). `types.ts` importa `Timestamp` SOLO como tipo (no arrastra runtime). Detalle:
  `recomputeBalances` recibe **semillas** (initialBalance de cuentas; deuda/saldo inicial de
  tarjetas/créditos) porque el modelo no guarda esas semillas como movimientos; la capa de
  datos (Paso 5) las proveerá desde el onboarding.
- **2026-06-23 — Login (Paso 3):** auth (Google + email/password) aislada en
  `data/authRepository.ts`; la UI/stores nunca importan Firebase Auth directo. El
  `useAuthSync` (montado en `App`) escucha `onAuthStateChanged` y alimenta `sessionStore`,
  y asegura `users/{uid}` vía `ensureUserSettings`. `App` enruta por estado de sesión
  (loading/login/app). Reglas de seguridad en `firestore.rules` (aislamiento total bajo
  `users/{uid}`), con `firebase.json` + `firestore.indexes.json` para deploy.
- **2026-06-23 — Firebase resiliente sin claves:** `firebase.ts` expone
  `isFirebaseConfigured`; si faltan las claves no inicializa Firebase (evita
  `auth/invalid-api-key` al import) y la app igual renderiza el login. `auth`/`db` son
  `T | null` y los repos los guardan. Esto mantiene dev/CI/e2e funcionando sin `.env.local`.
- **2026-06-23 — Bundle:** el build avisa que el chunk supera 500 kB (es Firebase). Queda
  como optimización futura (code-splitting / lazy import); no se actúa ahora (§13.2, evitar
  optimización prematura).
- **2026-06-23 — Catálogo de tests (Paso 2):** los casos de §12 se escribieron como
  `it.todo` (unit, en `src/domain/__tests__/`, 8 archivos por área: transaction-effects,
  fixed-obligations, reconciliation, reports, edit-delete-recalc, validation, rollover,
  exchange-rate) y `test.fixme` (e2e, `e2e/catalog.spec.ts`). Sirven de checklist
  ejecutable: en el Paso 4+ se reemplazan los `todo`/`fixme` por tests reales que la
  lógica debe satisfacer. NO duplican reglas: cada caso referencia su sección de CLAUDE.md.

---

## Pendientes / dudas abiertas
*(Preguntas para el dueño o cosas a resolver antes de avanzar.)*

- **Firebase real (acción del dueño, no bloquea seguir programando):** la app corre y
  muestra el login, pero el login real necesita un proyecto Firebase. Pasos:
  1. Crear proyecto en https://console.firebase.google.com
  2. **Authentication → Sign-in method:** habilitar **Google** y **Correo/contraseña**.
  3. **Firestore Database:** crear en modo producción.
  4. **Project settings → Your apps → Web (</>):** registrar app y copiar el `firebaseConfig`.
  5. `cp .env.example .env.local` y pegar los valores (apiKey, authDomain, projectId, etc.).
  6. (Deploy, luego) `firebase login` + `firebase use --add` y `firebase deploy --only firestore:rules`
     para publicar `firestore.rules`.

---

## Cómo retomar (para Claude)
1. Leer `CLAUDE.md` (reglas) y este `MEMORY.md` (estado).
2. Identificar el primer paso en estado ⬜ o 🟡 de la tabla de arriba.
3. Respetar: lógica de negocio aislada de UI y Firestore; tests en verde antes de seguir;
   commits granulares sin atribución automática (§13.1).
4. Al terminar un paso: marcarlo ✅, anotar notas/decisiones y actualizar la fecha.
