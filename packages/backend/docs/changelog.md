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

## Iteración 03 — Persistencia

- `schemas/`: `persistiblePlugin` (copiado de REPO_REF) aplicado a todos los schemas raíz (`Usuario`, `Categoria`,
  `Evento` con `TipoEntrada` embebido, `Compra` con historial y mensajes embebidos, `Resenia`, `Notificacion`),
  `timestamps: true` y los índices de la spec.
- `repositories/`: `RepositorioPersistible` y `RepositorioMongoPersistible` (devuelven entidades de dominio) y los
  repos de Mongo de usuarios, categorías, eventos (búsqueda con aggregation, `reservarCupo`/`liberarCupo` atómicos),
  compras, reseñas y notificaciones.
- `dependencias.js` como composition root (sin modo mock).
- Seeds idempotentes que se ejecutan al arrancar: 8 categorías, 3 organizadores, 4 compradores, 16 eventos (3 pasados,
  uno en menos de 48 h, uno agotado), 15 compras en todos los estados con historial, chat y 3 reseñas. Afiches de
  relleno en `seeds/assets/` generados por `scripts/generarImagenesSemilla.js` y copiados a `UPLOADS_DIR`.
- Tests: plugin, cada repositorio, reservas concurrentes, buscador y seeds.

## Iteración 04 — Auth, categorías, eventos, búsqueda, multimedia y favoritos

- Auth: `POST /api/auth/registro`, `POST /api/auth/login`, `GET /api/auth/me` (JWT con `{ id, rol, nombre }`).
- `GET /api/categorias`.
- Eventos: buscador con filtros combinables (`q`, `categoriaIds`, precio, fechas, `conDisponibilidad`, `puntajeMin`,
  `paraVos`, `orden=fecha|precio|puntaje|relevancia`, paginación, `anteriores`), `GET /recomendados`, detalle,
  reseñas del organizador, `GET /mios`, alta y edición restringida (`/multimedia`, `/tipos-entrada`, `/ampliaciones`).
- Favoritos: `GET /api/favoritos`, `PUT` y `DELETE /api/favoritos/:eventoId` (idempotentes).
- `authOpcionalMiddleware`, `uploadMiddleware` (multer en memoria), `AlmacenamientoLocalAdapter` y traducción de
  errores de zod y multer a 400 en `errorHandler`.
- Services: `AuthService`, `CategoriasService`, `EventosService`, `FavoritosService`, `RecomendacionesService`,
  `ReseniasService` y `VistasEventos`. DTOs sin `passwordHash` ni campos internos, con URLs absolutas de multimedia.
- Swagger con ejemplos para todos los endpoints (`docs/swaggerEsquemas.js` + JSDoc en `routes/`).
- Afiches de la semilla regenerados con la paleta "Telón de terciopelo".
- Tests de integración (supertest) sobre los datos de la semilla.
