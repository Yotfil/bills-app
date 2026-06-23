# MEMORY.md — Bitácora del proyecto (App Personal de Finanzas)

> **Propósito:** memoria viva del proyecto. Registra **qué se ha hecho**, **qué falta** y
> **decisiones tomadas**. Claude debe leer este archivo al iniciar y actualizarlo al
> terminar cada paso. Sirve también de bitácora para el dueño.
>
> La fuente de verdad de **qué** se construye y **bajo qué reglas** sigue siendo
> `CLAUDE.md`. Este archivo solo lleva el **estado de avance**.

**Última actualización:** 2026-06-23
**Estado general:** 🟢 Paso 1 (scaffold) completo y verificado. Siguiente: Paso 2 (catálogo de tests).

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
| 2 | Catálogo de tests (§12) escrito primero (TDD) | ⬜ | — |
| 3 | Login (Google + correo/contraseña) + estructura `users/{uid}` + reglas seguridad | ⬜ | — |
| 4 | Capa de dominio: tipos (§9.1), validación (§11), funciones puras de saldos/estados | ⬜ | — |
| 5 | Capa de datos: repositorios + converters Firestore (§9.2) | ⬜ | — |
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

---

## Pendientes / dudas abiertas
*(Preguntas para el dueño o cosas a resolver antes de avanzar.)*

- **Firebase real:** crear el proyecto en Firebase Console (Auth con Google +
  correo/contraseña, Firestore, Hosting) y poner las claves en `.env.local`. Hasta
  entonces, la app corre pero no conecta con Firebase.

---

## Cómo retomar (para Claude)
1. Leer `CLAUDE.md` (reglas) y este `MEMORY.md` (estado).
2. Identificar el primer paso en estado ⬜ o 🟡 de la tabla de arriba.
3. Respetar: lógica de negocio aislada de UI y Firestore; tests en verde antes de seguir;
   commits granulares sin atribución automática (§13.1).
4. Al terminar un paso: marcarlo ✅, anotar notas/decisiones y actualizar la fecha.
