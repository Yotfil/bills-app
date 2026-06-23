# Finanzas — App personal de finanzas (PWA)

App web personal (un solo usuario) para finanzas con mínima fricción. La especificación
completa (qué se construye y bajo qué reglas) está en [`CLAUDE.md`](./CLAUDE.md); el
estado de avance, en [`MEMORY.md`](./MEMORY.md).

## Stack

- **Frontend:** React 19 + TypeScript (estricto) + Vite
- **Estilos:** Tailwind CSS v4
- **Datos/Auth:** Firebase (Firestore + Authentication + Hosting)
- **Estado:** Zustand · **Charts:** Recharts · **Router:** React Router
- **Tests:** Vitest + Testing Library (unit) · Playwright (e2e)
- **Calidad:** ESLint + Prettier

## Arquitectura por capas (CLAUDE.md §13.3)

```
src/
  ui/        # React: pantallas y componentes (solo presentación)
  store/     # estado de UI (Zustand)
  domain/    # lógica de negocio pura y testeable (reglas §5, §11). Sin React ni Firebase
  data/      # Firebase: repositorios + converters (persistencia)
  lib/       # utilidades (formato de moneda, etc.)
  test/      # setup de tests
```

La lógica de negocio (`domain/`) no depende de React ni de Firebase. La UI la invoca; la
capa de datos la alimenta.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # rellenar con las claves de Firebase
npm run dev                  # http://localhost:5173
```

## Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Type-check + build de producción |
| `npm run preview` | Sirve el build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (escribe) |
| `npm test` | Unit tests (Vitest, una vez) |
| `npm run test:watch` | Unit tests en watch |
| `npm run test:coverage` | Cobertura |
| `npm run e2e` | Tests e2e (Playwright) |
