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

## Iteración 05 — Compras, estados automáticos y reseñas

- `/api/compras`: crear (reserva atómica de cupo), `GET /mias`, `GET /:id`, `POST /:id/pagar`, `/cancelar`,
  `/reembolsar` y `/resenia`. `GET /api/eventos/:eventoId/compras` con resumen de ocupación, conteo por estado,
  recaudación confirmada y reembolsos pendientes.
- `ComprasService` con evaluación perezosa de transiciones automáticas y hook `alCambiarEstado` para la iteración 06.
- `jobs/ProgramadorTareas.js` con las tareas `vencerComprasPendientes`, `marcarComprasUtilizadas`,
  `reembolsosAutomaticos` y `finalizarEventosPasados` (cada `INTERVALO_JOBS_MS`; no corre con `NODE_ENV=test`).
- Guardado condicional (`guardarTransicion` / `guardarSi`) en compras y usuarios para evitar dobles transiciones y
  dobles liberaciones de cupo con procesos concurrentes.
- `Compra.mensajesNoLeidosPara(usuarioId, ultimaLectura)` en el dominio.
- Swagger: endpoints de compras y diagrama de estados en la descripción del tag "Compras".
- Tests de integración del ciclo completo, permisos, resumen, compras concurrentes y tareas programadas.

## Iteración 06 — Chat por compra y notificaciones in-app

- Chat REST en `/api/compras/:id/mensajes` (`GET ?desde`, `POST`, `POST /leidos`), permitido en cualquier estado.
  `Compra` guarda `ultimaLecturaComprador` / `ultimaLecturaOrganizador` y `mensajesNoLeidos` las usa.
- Socket.io sobre el mismo `http.Server` (`sockets/index.js`): auth por JWT en el handshake, salas `usuario:<id>` y
  `compra:<id>` (`compra:unirse` / `compra:salir` con ack), eventos `mensaje:nuevo`, `compra:estado` y
  `notificacion:nueva`. `adapter/EmisorSocketAdapter.js` es lo único que conoce socket.io.
- Notificaciones in-app: 9 templates (`templates/notificacionTemplates.js`), `TemplatesService`,
  `NotificacionesService` y `AvisosComprasService` conectado a los hooks de compras (cambios de estado, reseña y
  recordatorio). Tarea programada nueva `recordarEventosProximos` (24 h antes, sin repetir).
- REST `/api/notificaciones`: listar, cantidad de no leídas, marcar una (solo el destinatario) y marcar todas.
- La semilla genera las notificaciones de las compras de demo con los mismos services, en orden cronológico.
- Swagger: tags "Chat" (con los eventos de socket) y "Notificaciones".
- Tests de templates, chat REST, socket.io (con `socket.io-client`), notificaciones por transición y recordatorio.

## Iteración 07 — Front base

- Back: `GET /api/resumen-publico` (estadísticas y reseñas destacadas para la landing), con test y Swagger.
- Front:
  - `styles/theme.js` con la paleta "Telón de terciopelo" (claro y oscuro) y `utils/contraste.js`; un test verifica
    el contraste AA de todos los pares texto/fondo, rellenos, estados y bordes en ambos temas.
  - Fuentes Playfair Display e Inter con `@expo-google-fonts` + `expo-font`.
  - `service/`: `api.js` (Bearer desde un getter, callback de 401), `apiCaller` (+ `postForm`), `authApi`,
    `authService`, `publicoService`, `notificacionesService` y `socket.js` (listo para la iteración 10).
  - Contexts: `ThemeContext` (Sistema / Claro / Oscuro, persistido), `ToastContext` (animado, anunciado, con
    acción "Deshacer") y `AuthContext` (restaura la sesión con `/auth/me`; 401 → cierra sesión con un aviso).
  - `components/ui/`: TicketCard, TituloEscena, EtiquetaSeccion, Button, Input, Textarea, Select, Card, Badge,
    EstadoCompraBadge, Modal y ModalConfirmacion, Skeleton (+ presets), Spinner, EmptyState, ErrorState, Rating,
    Chip, ImagenEvento, Carrusel (con visor a pantalla completa) y Paginacion. Todos con roles, labels, estados y
    anillo de foco.
  - `components/layout/`: Pantalla, Encabezado (top bar con contadores), Footer y EnConstruccion.
  - Navegación por rol (`AppNavigator`, `AuthStack`, `CompradorTabs`, `OrganizadorTabs`) con placeholders para las
    iteraciones 08–10.
  - Pantallas: Landing, Login, Registro (selector de rol), Perfil (tema y cerrar sesión con confirmación), error
    genérico, sin conexión y límite de errores.
  - Tests: componentes, contraste, Login, AuthContext (restaurar sesión y 401) y AppNavigator por rol.
