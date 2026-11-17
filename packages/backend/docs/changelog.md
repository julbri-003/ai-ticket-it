# Changelog

## Iteración 01 — Setup del repositorio

- Monorepo con npm workspaces (`packages/backend`, `packages/frontend`), ESLint flat config, Prettier 3.
- Back: esqueleto de carpetas, `app.js` separado de `index.js`, `db.js` con `conectarDB`/`desconectarDB`
  (MongoDB en memoria salvo que exista `MONGO_URI`), `AppError` y subclases, los 5 middlewares,
  Swagger en `/api-docs`, `/uploads` estático, `utils/reloj.js`.
- Endpoint `GET /api/health` → `{ status: "ok" }`.
- Tests: Jest (ESM) + supertest, helper `tests/helpers/dbMemoria.js`, test de humo de health, 404 y Swagger.
- Front: app Expo (SDK 58, template blank) con la estructura de carpetas del contexto común,
  `api.js` + `apiCaller` + `healthApi` + `healthService`, `App.jsx` placeholder que muestra el health.
  Tests con jest-expo + @testing-library/react-native.
- Docker del back sobre `node:20-bookworm-slim`, `docker-compose.yml` solo con el back.
- CI en GitHub Actions: lint, tests del back y tests del front.

## Iteración 02 — Dominio

- Clases de dominio puras en `domain/`: `Persistible`, `Roles`, `Usuario`, `Categoria`, `TipoEntrada`,
  `Evento`, `EstadoCompra`/`MotivoCancelacion`/`ACTOR_SISTEMA`, `CambioEstadoCompra`, `Mensaje`,
  `Compra`, `Resenia`, `Notificacion`, más `recomendacionDominio.js` (categorías preferidas y puntaje).
- `Compra`: máquina de estados con tabla de transiciones por disparador y un único `actualizarEstado`;
  plazos de 48 h para pagar y 24 h para reembolsar; chat y reseña única por compra.
- `Evento`: edición restringida a través de `editar(cambios, reloj)` (multimedia, nuevos tipos de entrada y
  ampliaciones de la descripción); cualquier otro campo lanza `BadRequestError`.
- Utilidades: `utils/id.js` (`idDe`, `mismoId`) y `utils/montos.js` (`redondearMonto`, `formatearMonto`).
- Tests unitarios `tests/*.Dominio.test.js` con reloj fijo, más un test que verifica que `domain/` no importe
  infraestructura. Script `test:coverage` con umbral del 90 % sobre `domain/`.
- Diagrama de clases en `docs/diagrama-clases.puml`.
