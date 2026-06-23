# MEMORY.md — Bitácora del proyecto (App Personal de Finanzas)

> **Propósito:** memoria viva del proyecto. Registra **qué se ha hecho**, **qué falta** y
> **decisiones tomadas**. Claude debe leer este archivo al iniciar y actualizarlo al
> terminar cada paso. Sirve también de bitácora para el dueño.
>
> La fuente de verdad de **qué** se construye y **bajo qué reglas** sigue siendo
> `CLAUDE.md`. Este archivo solo lleva el **estado de avance**.

**Última actualización:** 2026-06-23
**Estado general:** 🟡 Solo existe la especificación (`CLAUDE.md`). Sin código aún.

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
| 1 | Scaffold: Vite + React + TS + Tailwind + Firebase + ESLint/Prettier + setup tests | ⬜ | — |
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

- (sin decisiones registradas todavía)

---

## Pendientes / dudas abiertas
*(Preguntas para el dueño o cosas a resolver antes de avanzar.)*

- (ninguna por ahora)

---

## Cómo retomar (para Claude)
1. Leer `CLAUDE.md` (reglas) y este `MEMORY.md` (estado).
2. Identificar el primer paso en estado ⬜ o 🟡 de la tabla de arriba.
3. Respetar: lógica de negocio aislada de UI y Firestore; tests en verde antes de seguir;
   commits granulares sin atribución automática (§13.1).
4. Al terminar un paso: marcarlo ✅, anotar notas/decisiones y actualizar la fecha.
