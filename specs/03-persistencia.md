# 03 — Persistencia (mongoose + mongodb-memory-server)

## Objetivo
Persistir las entidades del dominio con mongoose sobre Mongo en memoria, heredando la baja lógica por plugin y con repositorios que devuelven entidades de dominio. Incluye los seeds.

## Leer antes
`REPO_REF/packages/backend/schemas/persistibleSchema.js`, `schemas/proyectoSchema.js`, `repositories/RepositorioPersistible.js`, `repositories/mongo/RepositorioMongoPersistible.js`, `repositories/mongo/ProyectosMongoRepository.js`, `seeds/*`, `tests/repositorioMongoPersistible.test.js`, `tests/persistibleSchema.test.js`.

## Alcance

### Schemas (`schemas/`)
- `persistibleSchema.js`: copiar `persistiblePlugin` (campos de auditoría, filtro `activo: true` en find/findOne/countDocuments, `incluirInactivos()`).
- `usuarioSchema`, `categoriaSchema`, `eventoSchema` (con subdocumento `tipoEntradaSchema` y `ampliacionesDescripcion`), `compraSchema` (con subdocumentos `cambioEstadoSchema` y `mensajeSchema` embebidos, según el diagrama: `Compra.mensajes`), `reseniaSchema`, `notificacionSchema`.
- **Todos los schemas raíz aplican `schema.plugin(persistiblePlugin)`**. Ningún schema redeclara `activo`, `fechaModificacion` ni `modificadoPor`.
- `timestamps: true` en los schemas raíz.
- Índices: `usuario.email` único; `evento` de texto sobre nombre + descripcion; `evento.{categoriaId, fecha}`; `compra.{compradorId, estado}`, `compra.{eventoId}`, `compra.{estado, fechaLimitePago}`, `compra.{estado, fechaLimiteReembolso}`; `resenia.compraId` único; `notificacion.{destinatarioId, leida, fecha}`.

### Repositorios (`repositories/` + `repositories/mongo/`)
- Copiar `RepositorioPersistible` y `RepositorioMongoPersistible`. Cada repo concreto define `model`, `mapearCampos(entidad)` y `hidratar(doc) → entidad de dominio`.
- `UsuariosMongoRepository`: `obtenerPorId`, `obtenerPorEmail`, `guardar`, `obtenerVarios(ids)`.
- `CategoriasMongoRepository`: `listar`, `obtenerPorId`.
- `EventosMongoRepository`:
  - `obtenerPorId(id, { incluirInactivos })`: los eventos finalizados están dados de baja lógica, pero compras, reseñas y "anteriores" los necesitan.
  - `buscar({ q, categoriaIds, precioMin, precioMax, fechaDesde, fechaHasta, conDisponibilidad, puntajeMin, organizadorId, excluirIds, orden, direccion, pagina, limite, anteriores })`: `categoriaIds` acepta varias categorías (lo usa el filtro "Para vos"); `conDisponibilidad` exige algún tipo con `disponibles > 0`; `puntajeMin` filtra por el `puntajePromedio` del organizador. Aggregation con `$lookup` a usuarios para ordenar por `puntajePromedio` del organizador; `precioMinimo` calculado con `$min` sobre los tipos; `anteriores=true` trae los ya ocurridos/inactivos, si no solo los activos con `fecha > ahora`. Devuelve `{ items, total, pagina, limite }`.
  - `listarPorOrganizador(organizadorId)` (incluye inactivos), `guardar`.
  - **`reservarCupo(eventoId, tipoEntradaId, cantidad)` atómico**: `findOneAndUpdate` con condición `disponibles >= cantidad` y `$inc` negativo usando `arrayFilters`. Si no matchea, lanza `ConflictError("No hay cupo suficiente")`. `liberarCupo` con la operación inversa, sin superar el cupo. Así se evita la sobreventa con compras concurrentes.
  - `listarParaFinalizar(ahora)`.
- `ComprasMongoRepository`: `obtenerPorId`, `guardar`, `listarPorComprador(id, { estado })`, `listarPorEvento(eventoId, { estado })`, `listarPendientesVencidas(ahora)`, `listarReembolsosVencidos(ahora)`, `listarConfirmadasDeEventosOcurridos(ahora)` (join con eventos), `agregarMensaje(compraId, mensaje)` (con `$push`, sin reescribir la compra completa).
- `ReseniasMongoRepository`: `crear`, `existeParaCompra`, `listarPorOrganizador(id, paginado)`, `listarPorEvento(id)`.
- `NotificacionesMongoRepository`: `crear`, `listarPorDestinatario(id, { soloNoLeidas, pagina })`, `contarNoLeidas`, `marcarLeida`, `marcarTodasLeidas`.

### `dependencias.js`
Instanciar todos los repos (sin el modo mock de REPO_REF: la base en memoria cumple ese rol).

### Seeds (`seeds/` + `scripts/seed.js`)
Se ejecutan al arrancar `index.js` (siempre, porque la base arranca vacía). **Idempotentes** (si existe por email o nombre, no duplican).
- Categorías fijas: Recitales, Teatro, Stand-up, Festivales, Deportes, Conferencias, Infantiles, Danza.
- 3 organizadores y 4 compradores con contraseña conocida (documentada en el README, sección "Usuarios de prueba").
- ~15 eventos repartidos por categoría y organizador: futuros (con distintos precios para probar orden y rango), uno en menos de 48 h, y **3 eventos pasados**.
- Compras en **todos los estados**, con historial coherente, mensajes de chat y reseñas en las UTILIZADAS, para que la demo del video muestre cada caso sin preparar nada.
- Imágenes: archivos en `seeds/assets/` copiados a `UPLOADS_DIR` al sembrar.
- Fechas relativas al reloj (`ahora + 5 días`), nunca hardcodeadas.

## Tests
- Plugin: el find por defecto excluye inactivos e `incluirInactivos()` los trae.
- Cada repo: guardar → obtener devuelve una entidad de dominio equivalente.
- `reservarCupo` concurrente: 20 `Promise.all` sobre cupo 5 → exactamente 5 éxitos.
- `buscar`: texto, varias categorías, rango de precio, rango de fechas, `conDisponibilidad`, `puntajeMin`, los tres órdenes, paginación y `anteriores`.
- Seeds: al menos 2 compradores con favoritos concentrados en 1–2 categorías, para mostrar "Recomendados para vos" en el video, y 1 comprador sin favoritos para el caso vacío.
- Seeds: correrlos dos veces no duplica.

## Criterios de aceptación
- [ ] Al arrancar el back sin `MONGO_URI` quedan los datos de demo cargados (verificable con un GET temporal o un test).
- [ ] Ningún schema redeclara campos del plugin.
- [ ] Tests pasan en CI.
