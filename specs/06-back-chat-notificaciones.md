# 06 — Back: chat por compra (REST + socket.io) y notificaciones in-app

## Objetivo
Casos de uso 5 y 6 (chat comprador ↔ organizador por compra, en cualquier momento) y notificaciones in-app generadas con templates, entregadas en tiempo real.

## Leer antes
`REPO_REF/packages/backend/templates/notificacionTemplates.js`, `services/TemplatesService.js`, `services/NotificacionesService.js`, `controllers/NotificacionesController.js`, `routes/notificacionesRoutes.js`, `tests/template.Service.test.js`, `tests/notificacion.Service.test.js`.

## Diseño del chat
**El envío es por REST y el socket solo empuja.** Así cada mensaje pasa por zod, auth, service y dominio como cualquier otra operación, y el chat funciona aunque el socket se caiga (el front hace polling como fallback).

### REST (`/api/compras/:id/mensajes`, comprador dueño u organizador del evento)
- `GET ?desde=<ISO>` → mensajes ordenados (con `desde`, solo los nuevos, para el polling).
- `POST { mensaje }` → 201 con el mensaje creado. Permitido **en cualquier estado** de la compra.
- `POST /leidos` → marca como leídos los mensajes del otro participante (guardar `ultimaLecturaComprador` / `ultimaLecturaOrganizador` en la compra) para calcular `mensajesNoLeidos`.

### Socket.io (`sockets/`)
- `sockets/index.js`: `inicializarSockets(httpServer)`, con CORS igual que express.
- **Auth en el handshake**: `socket.handshake.auth.token` verificado con el mismo `JWT_SECRET`; si es inválido, `next(new Error("No autorizado"))`.
- Al conectar, el socket entra a la sala `usuario:<id>`.
- `compra:unirse { compraId }` → el server verifica que sea participante (reusando el service) y lo une a `compra:<id>`; responde con ack `{ ok }` o `{ error }`. `compra:salir { compraId }`.
- Eventos emitidos por el server: `mensaje:nuevo` (a `compra:<id>`), `compra:estado` (a `usuario:<comprador>` y `usuario:<organizador>` en cada transición) y `notificacion:nueva` (a `usuario:<destinatario>`).
- `adapter/EmisorSocketAdapter.js` con interfaz `emitirACompra(compraId, evento, payload)` y `emitirAUsuario(usuarioId, evento, payload)`. Los services dependen de esta interfaz. En los tests se inyecta un emisor nulo o espía.

## Notificaciones in-app
- `templates/notificacionTemplates.js` con la misma forma que REPO_REF (`{ titulo, mensaje: (vars) => string }`):

| Tipo | Destinatario | Cuándo |
|---|---|---|
| `NUEVA_COMPRA` | organizador | se crea una compra |
| `COMPRA_CONFIRMADA` | comprador y organizador | pago |
| `COMPRA_CANCELADA` | organizador | el comprador cancela (indicar si debe reembolsar y la fecha límite) |
| `COMPRA_VENCIDA` | comprador | vence por falta de pago |
| `REEMBOLSO_REALIZADO` | comprador | reembolso manual o automático |
| `ENTRADA_UTILIZADA` | comprador | pasa a UTILIZADA (invita a reseñar) |
| `NUEVO_MENSAJE` | el otro participante | mensaje de chat (**no** se notifica si ese usuario ya está en la sala `compra:<id>`) |
| `NUEVA_RESENIA` | organizador | reseña recibida |
| `RECORDATORIO_EVENTO` | comprador con compra CONFIRMADA | 24 h antes del evento (tarea programada nueva, sin repetir: guardar un flag en la compra) |

- `TemplatesService.generarContenidoNotificacion(tipo, variables)` igual que REPO_REF.
- `NotificacionesService.notificar(tipo, destinatarioId, variables, datos)` → persiste y emite `notificacion:nueva`.
- Conectar el hook de cambio de estado de la iteración 05 para notificar y emitir `compra:estado`.

### REST (`/api/notificaciones`, auth)
`GET ?soloNoLeidas&pagina`, `GET /no-leidas/cantidad`, `PATCH /:id/leida` (solo el destinatario, 403 si no), `PATCH /leidas`.

## Tests
- Templates: cada tipo genera título y mensaje con sus variables; un tipo inexistente → NotFoundError.
- Chat REST: un participante envía y lee; un tercero → 403; mensaje vacío o >1000 caracteres → 400; envío en una compra CANCELADA permitido.
- Socket (con `socket.io-client` en el test): sin token se rechaza; unirse a una compra ajena devuelve error; `mensaje:nuevo` llega al otro participante tras un POST REST.
- Cada transición de la iteración 05 crea la notificación correcta.

## Criterios de aceptación
- [ ] `index.js` monta socket.io sobre el mismo `http.Server` que express.
- [ ] Ningún service importa socket.io directamente (solo el adapter).
- [ ] Swagger documenta los endpoints REST y, en la descripción del tag "Chat", los eventos de socket.
