# 10 — Front: chat, notificaciones y cierre

## Objetivo
Chat en tiempo real por compra (casos de uso 5 y 6), centro de notificaciones in-app y pulido final para grabar el video.

## Leer antes
`06-back-chat-notificaciones.md` (contrato de REST y de socket), `REPO_REF/packages/frontend/src/components/notifications/NotificationDropdown.jsx`, `service/notificacionesService.js`.
Si existen: `design/stitch/{chat,notificaciones}/`.

## Socket
- `context/SocketContext`: conecta cuando hay sesión (usando `service/socket.js` con el token), desconecta al cerrar sesión y reconecta al volver la app a primer plano (`AppState`). Expone `socket` y `conectado`.

## Chat (`features/compras/Chat` + `components/chat/*`)
- Hook `useChatCompra(compraId)`:
  1. Carga el historial por REST.
  2. Emite `compra:unirse` y escucha `mensaje:nuevo` (deduplicando por id).
  3. **Fallback**: si `!conectado`, hace polling cada 10 s con `GET ?desde=`.
  4. Enviar = `POST` REST con un mensaje optimista "enviando…" que se reemplaza con la respuesta o queda marcado con error + reintentar.
  5. Al montar y al recibir mensajes, llama a `/leidos`. Al desmontar, `compra:salir`.
- UI: burbujas propias y ajenas (nombre y rol del otro, hora), separadores por día, `KeyboardAvoidingView`, input con contador (máx 1000) y botón enviar deshabilitado si está vacío. Cabecera con el evento y el EstadoCompraBadge (se actualiza con `compra:estado`).
- Disponible en **cualquier estado** de la compra, desde DetalleCompra (comprador y organizador).

## Bandeja de mensajes (`features/mensajes/Mensajes`, tab "Mensajes" de ambos roles)
Lista paginada de las compras con conversación: imagen del evento, último mensaje, hora, contador de no leídos y estado de la compra. Requiere en el back `GET /api/compras/conversaciones?pagina=` (agregarlo en esta iteración: compras del usuario, como comprador u organizador, con al menos un mensaje, ordenadas por último mensaje). El ícono de mensajería del top app bar muestra el total de no leídos.

## Notificaciones
- `context/NotificacionesContext`: cantidad de no leídas (carga inicial por REST y actualización con `notificacion:nueva`), con un **toast** al llegar una nueva.
- Badge con la cantidad en la tab Notificaciones.
- `features/notificaciones/Notificaciones`: lista paginada (Skeleton, EmptyState), no leídas resaltadas, "Marcar todas como leídas" y al tocar una se marca leída y navega a la compra o evento de `datos`.
- `compra:estado` refresca las pantallas abiertas de esa compra (Mis compras, Detalle, Compras del evento).

## Pulido y cierre
- Revisar todas las pantallas en modo claro y oscuro, en un celular chico y uno grande, y con textos largos.
- Accesibilidad: `accessibilityLabel` en botones con ícono y tamaños táctiles ≥ 44.
- README final: requisitos, cómo correr back y app en el celular (IP LAN), usuarios de prueba, cómo correr los tests, decisiones de arquitectura y un **guion sugerido para el video**: un flujo completo comprador → organizador (buscar → comprar → pagar → chat → cancelar → reembolso), señalando qué archivos del back y del front intervienen en cada paso.
- `docs/decisiones.md` completo: mongodb-memory-server, REST + socket para el chat, edición restringida, reserva de cupo, tareas programadas + evaluación perezosa, adapters.

## Tests
`useChatCompra` (deduplica, cae a polling sin socket, reintento ante error), NotificacionesContext (incrementa al recibir y resetea al marcar todas), pantalla Chat (enviar vacío deshabilitado).

## Chequeo final de cobertura
Recorrer `specs/trazabilidad.md` fila por fila. En la columna Estado, poner ✅ con la evidencia (nombre del test o pasos manuales) o ❌ con lo que falta. Las filas ❌ se resuelven antes de dar la spec por terminada. Entregar un resumen: cuántas filas ✅, cuáles ❌ y por qué.

## Criterios de aceptación
- [ ] Con dos dispositivos (o celular + emulador), un mensaje del comprador aparece en el organizador sin refrescar, y viceversa.
- [ ] Cortando el socket (apagando y prendiendo el wifi), el chat sigue funcionando por polling y se recupera solo.
- [ ] Cada transición de una compra genera una notificación visible para quien corresponde.
- [ ] `npm run lint` y `npm test` (back + front) pasan en CI.
- [ ] Todas las filas de `trazabilidad.md` en ✅.
- [ ] Flujo completo probado en **Android y en iOS** (dispositivo o emulador/simulador): teclado en chat y formularios, selector de fecha, subida de imágenes, swipe de favoritos y modo oscuro.
