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

## Iteración 08 — Front comprador

- Servicios: `eventosApi`, `categoriasApi`, `comprasApi`, `favoritosApi`, `reseniasApi` y `eventosService`,
  `comprasService`, `favoritosService` (DTO → modelo de UI con fechas y montos en es-AR). `utils/fechas.js`
  (`diasRestantesTexto`, formatos y atajos de fechas), `utils/montos.js` y `utils/estadosCompra.js`.
- Hooks: `useFiltrosEventos` (estado de filtros, query, conteo de filtros activos, validación de rangos y pills) y
  `useFavorito` (toggle optimista con rollback y "Deshacer").
- Componentes: `TarjetaEvento`, `Buscador` (debounce 400 ms + búsquedas recientes), `BarraFiltros` y
  `PillsFiltrosAplicados`, `PanelFiltros` (bottom sheet con conteo en vivo), `CarruselRecomendados`,
  `TarjetaCompra`, `TimelineEstados`, `SelectorCantidad`, `ModalCalificar` y `Segmentos` (ui).
- Pantallas: Explorar (recomendados, buscador, filtros fijos, Próximos/Anteriores, paginación), DetalleEvento
  (multimedia, ampliaciones, organizador, tipos de entrada, cantidad, compra y reseñas del organizador), Checkout
  (cuenta regresiva y pago con confirmación), MisCompras (segmentos con contador), DetalleCompra (timeline y acciones
  según flags) y Favoritos (quitar con swipe, corazón o acción accesible, con "Deshacer").
- `react-native-gesture-handler`, `react-native-reanimated` y `react-native-worklets`; la app se envuelve en
  `GestureHandlerRootView`.
- Tests: filtros, Explorar, recomendados, TarjetaCompra, TimelineEstados, Checkout, DetalleCompra, DetalleEvento y
  Favoritos.

## Iteración 09 — Front organizador

- Back: el texto alternativo pasa a ser obligatorio también en videos (dominio y `POST /eventos/:id/multimedia`), con un
  máximo de 300 caracteres. `GET /eventos/mios` suma `reembolsosPendientes: { cantidad, proximoVencimiento }` por
  evento (compras canceladas con reembolso todavía no vencido).
- Front: `organizadorService` (validaciones del formulario, mapeos y casos de uso) y las APIs nuevas de eventos y
  `reembolsar` de compras.
- Pantallas: **Mis eventos** (puntaje propio, Próximos/Anteriores, ocupación, conteo por estado y alerta de
  reembolsos), **Crear evento** en 4 pasos (datos, tipos de entrada, multimedia con alt, revisión) con validación
  inline y subida con progreso, **Editar evento** (multimedia libre, tipos existentes en solo lectura, agregar tipos,
  actualizaciones de la descripción y solo lectura total si ya ocurrió) y **Compras del evento** (resumen por tipo con
  "Quedan N", recaudación, filtro por estado y Reembolsar).
- `DetalleCompra` en modo organizador: Reembolsar según `acciones.puedeReembolsar` y "Chat con el comprador".
- Componentes: `BarraOcupacion`, `TarjetaEventoOrganizador`, `CampoFechaHora` (datetimepicker nativo),
  `EditorTiposEntrada`, `SelectorMultimedia` (expo-image-picker) y `ModalTipoEntrada`.
- Tests del front: validaciones, creación (sin tipos no avanza, nombres duplicados, payload), edición (tipos y
  descripción original no editables, solo lectura), compras (Quedan N, Reembolsar), alerta de reembolsos y detalle
  en modo organizador.
- **Cancelar un evento** (`POST /eventos/:id/cancelar`, motivo obligatorio, solo antes de que ocurra): todas las
  compras se resuelven en el acto. Las pendientes quedan CANCELADAS sin cargo; las pagas pasan a CANCELADA →
  REEMBOLSADA (reembolso automático del sistema); las canceladas con reembolso pendiente se reembolsan. Motivo de
  compra nuevo `EVENTO_CANCELADO` y notificación `EVENTO_CANCELADO` al comprador con el motivo. El evento sale del
  buscador, no se puede comprar ni editar, y el DTO suma `cancelado` y `cancelacion { motivo, fecha }`.
- Front: botón "Cancelar evento" en Editar con modal de motivo; pill "Cancelado" (organizador y comprador), sección
  **Cancelados** en Mis eventos y aviso "Evento cancelado" en Mis compras.
- Cupo restante: cada tipo de entrada muestra siempre lo que queda ("Quedan N", "¡Es la última!" o "Agotado").

## Iteración 10 — Front: chat, notificaciones y cierre

- Back: `GET /api/compras/conversaciones?pagina=` (bandeja: compras con mensajes por último mensaje, no leídos por
  conversación y total), con Swagger y tests de integración.
- Front: `SocketContext` (conecta con sesión, reconecta al volver a primer plano) y `NotificacionesContext` (no leídas por
  REST + `notificacion:nueva`, toast, mensajes sin leer, marcar una o todas).
- Chat por compra (`features/compras/Chat`, `hooks/useChatCompra`, `components/chat/*`): historial, tiempo real sin
  duplicados, polling cada 10 s sin socket, mensaje optimista con reintento, leídos, separadores por día, contador de
  1000 caracteres y cabecera con el estado en vivo. Disponible en cualquier estado de la compra.
- Bandeja `features/mensajes/Mensajes` y centro de notificaciones `features/notificaciones/Notificaciones` (paginados,
  no leídas resaltadas, navegación a la compra, el chat o el evento).
- Badges de no leídos en el top bar y en las tabs; `compra:estado` refresca las pantallas abiertas.
- README final (tests, arquitectura y guion del video), decisiones completas y `specs/trazabilidad.md` recorrida.
- Tests: `useChatCompra`, `NotificacionesContext`, Chat, bandeja y notificaciones.
- Notificaciones: cada una se marca leída sola deslizándola, con su check (✓) o con la acción accesible, sin abrirla.
  Botón **Limpiar** con confirmación ("ya no las vas a poder recuperar") → `DELETE /api/notificaciones`, baja lógica
  de todas las del usuario con la auditoría del plugin Persistible.
- Al abrir el chat de una compra, `POST /compras/:id/mensajes/leidos` también marca leídos los avisos `NUEVO_MENSAJE`
  de esa compra (devuelve `notificacionesLeidas`) y el front recalcula la campana.
