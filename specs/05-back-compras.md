# 05 — Back: compras, estados automáticos y reseñas

## Objetivo
Implementar el ciclo completo de una compra (casos de uso 1, 2, 7, 8, 9 y 12) usando la máquina de estados del dominio, más las tareas programadas que aplican las transiciones automáticas.

## Leer antes
`02-dominio.md` (tabla de transiciones), `REPO_REF/packages/backend/services/PostulacionesService.js`, `controllers/PostulacionesController.js`.

## Endpoints (`/api/compras`)
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/` | COMPRADOR | `{ eventoId, tipoEntradaId, cantidad }`. El precio se toma del evento, nunca del body. Reserva el cupo de forma atómica y crea la compra en PENDIENTE. 409 si no hay cupo, 400 si el evento ya ocurrió. |
| GET | `/mias` | COMPRADOR | Query `estado?`. Cada ítem: evento resumido (nombre, fecha, imagen, lugar), tipo, cantidad, total, `estado`, `diasParaElEvento` (solo CONFIRMADA), `fechaLimitePago` (si PENDIENTE), `puedeCancelar`, `puedePagar`, `puedeReseniar`, `mensajesNoLeidos`. Orden: próximas primero. |
| GET | `/:id` | comprador dueño u organizador del evento | Detalle con `historial` completo (timeline), mensajes, reseña si existe y acciones disponibles. |
| POST | `/:id/pagar` | comprador dueño | PENDIENTE → CONFIRMADA. Pago **simulado**: el body es vacío y el modal de confirmación vive en el front. Si ya venció, primero se aplica `vencer()` y se responde 409 "La compra venció". |
| POST | `/:id/cancelar` | comprador dueño | Según la tabla: libera cupo; si estaba CONFIRMADA queda `reembolsoPendiente`. |
| POST | `/:id/reembolsar` | organizador del evento | CANCELADA con reembolso pendiente → REEMBOLSADA. |
| POST | `/:id/resenia` | comprador dueño | `{ puntuacion, detalle }`. Solo si está UTILIZADA y no tiene reseña. Actualiza `puntajePromedio` del organizador **en la misma operación lógica**. |

### Por evento (`/api/eventos/:eventoId/compras`, ORGANIZADOR dueño)
`GET` con query `estado?` → `{ resumen, compras }`:
- `resumen`: por tipo de entrada `{ nombre, cupo, vendidas, disponibles }` (caso de uso 2), conteo por estado, recaudación confirmada y reembolsos pendientes (con su `fechaLimiteReembolso`).
- `compras`: comprador `{ nombre, apellido }`, tipo, cantidad, total, estado, fecha y acciones disponibles.

## Consistencia del cupo
- Crear: `eventosRepository.reservarCupo` (atómico) y después `comprasRepository.guardar`. Si guardar falla, `liberarCupo` (compensación). Documentar en `docs/decisiones.md` por qué no se usan transacciones de Mongo (el replica set en memoria agrega complejidad).
- Cancelar o vencer: `liberarCupo` una sola vez. Que una transición inválida se rechace en el dominio garantiza que no se libere dos veces.

## Tareas programadas (`jobs/`)
`jobs/ProgramadorTareas.js`: recibe una lista de tareas y el reloj; las ejecuta al iniciar y cada `INTERVALO_JOBS_MS` con `setInterval`. Expone `ejecutarTodas()` para tests y `detener()`. No se inicia con `NODE_ENV=test`.

| Tarea | Qué hace | Quién en el historial |
|---|---|---|
| `vencerComprasPendientes` | PENDIENTE con `fechaLimitePago <= ahora` → CANCELADA (VENCIDA) + libera cupo | SISTEMA |
| `marcarComprasUtilizadas` | CONFIRMADA de eventos con `fecha <= ahora` → UTILIZADA | SISTEMA |
| `reembolsosAutomaticos` | CANCELADA con `reembolsoPendiente` y `fechaLimiteReembolso <= ahora` → REEMBOLSADA | SISTEMA |
| `finalizarEventosPasados` | Eventos activos con `fecha <= ahora` → `finalizar()` (baja lógica) | SISTEMA |

Además, **evaluación perezosa**: antes de devolver una compra o de operar sobre ella, el service aplica las transiciones automáticas que correspondan a esa compra. Así la respuesta nunca muestra un estado viejo entre corridas del job.

Cada tarea es un método de `ComprasService`/`EventosService`; el job solo los orquesta. Las notificaciones de estos cambios se agregan en la iteración 06 (dejar un hook `this.alCambiarEstado?.(compra, cambio)` o similar).

## Tests
- Flujo feliz completo por API: crear → pagar → (avanzar el reloj) → UTILIZADA → reseña → el puntaje del organizador se actualiza.
- Cancelar PENDIENTE y CONFIRMADA, verificando el cupo liberado y el reembolso pendiente.
- Reembolso manual y automático (reloj +25 h).
- Vencimiento por 48 h y por evento ocurrido antes de las 48 h.
- No cancelar después de la fecha del evento; no reseñar dos veces; no reseñar si no está UTILIZADA.
- Permisos: otro comprador → 403; otro organizador → 403 en `/eventos/:id/compras` y en reembolsar.
- Resumen por evento: `vendidas + disponibles = cupo` en cada tipo.
- Sin sobreventa con compras concurrentes por API.

## Criterios de aceptación
- [ ] Cada transición deja una entrada en el historial con quién, cuándo y el detalle.
- [ ] Ningún service cambia `estado` directamente: siempre a través del dominio.
- [ ] Swagger con todos los endpoints y el diagrama de estados descrito en la descripción del tag "Compras".
