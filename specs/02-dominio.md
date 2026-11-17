# 02 — Dominio

## Objetivo
Implementar en `packages/backend/domain/` las clases y reglas de negocio puras (sin mongoose ni express), con tests unitarios exhaustivos. Es la base de todo lo demás: la lógica no se duplica en services ni en el front.

## Leer antes
`REPO_REF/packages/backend/domain/persistibleDominio.js`, `proyectoDominio.js`, `estadoProyectoDominio.js`, `rolesDominio.js`, `notificacionDominio.js` y sus tests en `tests/`.

## Modelo (basado en el diagrama del enunciado + decisiones del producto)

Todas las entidades persistibles **extienden `Persistible`** (copiar de REPO_REF: `activo`, `fechaModificacion`, `modificadoPor`, `darDeBaja`, `darDeAlta`).

### `rolesDominio.js`
`Roles = { COMPRADOR, ORGANIZADOR }` (congelado).

### `usuarioDominio.js` — `Usuario extends Persistible`
`id, nombre, apellido, email, passwordHash, rol, favoritos: eventoId[]`. Solo organizadores: `puntajePromedio` (0 si no hay reseñas) y `cantidadResenias`.
- `agregarFavorito(eventoId)` (idempotente) y `quitarFavorito(eventoId)`. Solo para COMPRADOR.
- `registrarResenia(puntuacion)`: recalcula el promedio incremental. Solo para ORGANIZADOR.

### `categoriaDominio.js` — `Categoria extends Persistible`
`nombre, descripcion`. Catálogo fijo sembrado.

### `tipoEntradaDominio.js` — `TipoEntrada`
`id, nombre, descripcion, precio (>0), cupo (entero >0), disponibles (0..cupo)`.
- `hayCupoPara(cantidad): boolean`
- `reservar(cantidad)`: si no hay cupo lanza `ConflictError`.
- `liberar(cantidad)`: nunca supera `cupo`.
- `vendidas` (getter) = `cupo - disponibles`.

### `eventoDominio.js` — `Evento extends Persistible`
`id, nombre, descripcion (original e inmutable), ampliacionesDescripcion: [{ texto, fecha }], categoriaId, fecha (DateTime), lugar, tiposEntrada: TipoEntrada[], multimedia: [{ ruta, tipo: imagen|video, alt }] (archivos subidos; `alt` obligatorio en imágenes), organizadorId`.

Reglas:
- Al crear: nombre, descripcion, categoria, lugar, fecha futura y **al menos un tipo de entrada**; nombres de tipo únicos dentro del evento.
- `yaOcurrio(reloj)` = `fecha <= ahora`.
- `tuPrecioEstaEntre(min, max)`: true si **algún** tipo de entrada tiene precio en [min, max]. Si min o max no vienen, ese extremo queda abierto.
- `precioMinimo` (getter).
- **Edición restringida** (solo el organizador dueño y solo si `!yaOcurrio`):
  - `agregarMultimedia(rutas)` / `quitarMultimedia(ruta)`: lo único libremente editable.
  - `agregarTipoEntrada(tipo)`: se pueden agregar tipos; **nunca borrar** ni modificar los existentes.
  - `ampliarDescripcion(texto)`: agrega una ampliación con fecha; **la descripción original no se edita**.
  - Cualquier otro intento de modificación lanza `BadRequestError`.
- `finalizar(usuarioSistema)`: baja lógica (`darDeBaja`) cuando el evento ya ocurrió. Los eventos finalizados siguen visibles en "Eventos anteriores".

### `recomendacionDominio.js` — "Recomendados para vos"
Función pura `categoriasPreferidas(eventosFavoritos, { maxCategorias = 3 })`:
- Cuenta cuántos favoritos tiene el usuario por categoría, incluyendo eventos ya finalizados, porque reflejan a qué suele asistir.
- Devuelve las categorías ordenadas por frecuencia (desempate: el favorito más reciente), como `[{ categoriaId, cantidad, peso }]`, donde `peso = cantidad / totalFavoritos`.
- Sin favoritos devuelve `[]`.

`puntajeRecomendacion(evento, preferidas)` = peso de su categoría (0 si no está entre las preferidas). Se usa para ordenar los recomendados: primero el peso y después la fecha más próxima.

### `estadoCompraDominio.js`
`EstadoCompra = { PENDIENTE, CONFIRMADA, UTILIZADA, CANCELADA, REEMBOLSADA }`.
`MotivoCancelacion = { CANCELADA_POR_COMPRADOR, VENCIDA }`.
`ACTOR_SISTEMA = { id: "SISTEMA", nombre: "Sistema" }`.

### `cambioEstadoCompraDominio.js` — `CambioEstadoCompra`
`estadoAnterior, estadoNuevo, quien: { id, nombre, rol | "SISTEMA" }, fechaHora, detalle` (texto de trazabilidad, por ejemplo "Pago confirmado por $45.000,00", "Vencida: 48 h sin pago", "Reembolso automático: el organizador no reembolsó en 24 h").

### `mensajeDominio.js` — `Mensaje`
`id, usuarioId, usuarioNombre, rol, mensaje (1..1000 caracteres, trim), enviado`.

### `compraDominio.js` — `Compra extends Persistible`
`id, compradorId, eventoId, organizadorId, tipoEntradaId, tipoEntradaNombre, precioUnitario, cantidad (1..10), total, estado, historial: CambioEstadoCompra[], mensajes: Mensaje[], fechaCompra, fechaLimitePago, motivoCancelacion, reembolsoPendiente, fechaLimiteReembolso, reseniaId`.

Constantes configurables en el mismo módulo: `HORAS_PARA_PAGAR = 48`, `HORAS_PARA_REEMBOLSAR = 24`, `MAX_ENTRADAS_POR_COMPRA = 10`.

**Máquina de estados** (toda transición pasa por un único `actualizarEstado(nuevo, quien, detalle, reloj)` privado que valida la transición contra una tabla y agrega el `CambioEstadoCompra` al historial):

| Desde | Hacia | Disparador | Condición | Efecto |
|---|---|---|---|---|
| — | PENDIENTE | comprador crea la compra | evento activo y no ocurrido; hay cupo | reserva cupo; `fechaLimitePago = min(fechaCompra + 48 h, evento.fecha)` |
| PENDIENTE | CONFIRMADA | comprador `pagar()` | `ahora < fechaLimitePago` | — |
| PENDIENTE | CANCELADA | comprador `cancelar()` | evento no ocurrido | libera cupo; sin reembolso |
| PENDIENTE | CANCELADA (VENCIDA) | sistema `vencer()` | `ahora >= fechaLimitePago` | libera cupo |
| CONFIRMADA | CANCELADA | comprador `cancelar()` | evento no ocurrido | libera cupo; `reembolsoPendiente = true`; `fechaLimiteReembolso = ahora + 24 h` |
| CANCELADA | REEMBOLSADA | organizador `reembolsar()` | `reembolsoPendiente` | `reembolsoPendiente = false` |
| CANCELADA | REEMBOLSADA | sistema `reembolsarAutomaticamente()` | `reembolsoPendiente` y `ahora >= fechaLimiteReembolso` | ídem, con detalle "automático" |
| CONFIRMADA | UTILIZADA | sistema `marcarUtilizada()` | `ahora >= evento.fecha` | habilita reseña |

Cualquier otra transición lanza `ConflictError` con un mensaje claro ("No se puede cancelar una compra UTILIZADA").

Helpers:
- `diasParaElEvento(eventoFecha, reloj)`: solo si está CONFIRMADA; si no, `null`. Redondea hacia arriba; 0 = "hoy".
- `puedeCancelar(eventoFecha, reloj)`, `puedePagar(reloj)`, `puedeReseniar(usuarioId)` (UTILIZADA, comprador dueño, sin reseña previa).
- `agregarMensaje(usuario, texto, reloj)`: solo el comprador de la compra o el organizador del evento, **en cualquier estado**. Si no, `ForbiddenError`.

### `reseniaDominio.js` — `Resenia extends Persistible`
`id, compraId, compradorId, compradorNombre, eventoId, organizadorId, tipoEntradaNombre, puntuacion (1..5, pasos de 0.5), detalle (0..1000), fecha`. **Una reseña por compra**: una misma persona puede reseñar varias compras del mismo evento, porque cada tipo de entrada puede tener una experiencia distinta.

### `notificacionDominio.js` — `Notificacion extends Persistible`
`id, destinatarioId, tipo, titulo, mensaje, datos: { compraId?, eventoId? }, fecha, leida`. `marcarLeida()`.

## Tests (`tests/*.Dominio.test.js`)
Cubrir **cada fila** de la tabla de transiciones (caso válido + al menos un inválido), cupo (reservar, liberar, límites), vencimiento exacto en el borde de las 48 h y cuando el evento ocurre antes, reembolso automático en el borde de las 24 h, `diasParaElEvento`, edición restringida de Evento, `tuPrecioEstaEntre` con extremos abiertos, permisos del chat, unicidad de la reseña por compra y `categoriasPreferidas` (sin favoritos, empate, límite de categorías, favoritos de eventos finalizados). Todo con un reloj fijo inyectado.

## Criterios de aceptación
- [ ] Ningún archivo de `domain/` importa mongoose, express ni nada de `services/`.
- [ ] Cobertura de `domain/` ≥ 90 %.
- [ ] Diagrama actualizado en `docs/diagrama-clases.puml` (PlantUML, como en REPO_REF).
