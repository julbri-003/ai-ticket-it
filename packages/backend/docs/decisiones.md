# Decisiones

Decisiones no obvias tomadas en cada iteración.

## Iteración 01

- **Jest 30 en ambos workspaces.** REPO_REF usa Jest 27, pero `jest-expo` de la SDK 58 pide Jest 30.
  Con npm workspaces las dependencias se elevan a la raíz; tener dos versiones mayores de Jest rompe
  el script del back (`../../node_modules/jest/bin/jest.js`). Se usa la misma versión en los dos.
- **`npm test` en la raíz corre `npm test --workspaces`.** El `jest` a secas de REPO_REF no aplica:
  el back necesita `--experimental-vm-modules` (ESM) y el front el preset `jest-expo`.
- **`notFoundHandler` llama a `next` una sola vez** (REPO_REF lo llamaba dos veces).
- **`errorHandler` responde 400 a JSON mal formado** (`entity.parse.failed`) en vez de 500.
- **`errorLogger` no imprime con `NODE_ENV=test`** para no ensuciar la salida de los tests.
- **`/api/health` devuelve solo `{ status: "ok" }`**, como pide la spec (REPO_REF devolvía
  `estado`, `timestamp` y `uptime`).
- **Health del front sigue la cadena completa**: `App.jsx → healthService → healthApi → apiCaller → api`.
- **Token en `expo-secure-store`** (en lugar de `localStorage` de REPO_REF). El manejo del 401 en el
  interceptor se completa en la iteración 07, cuando existan AuthContext y la navegación.
- **Swagger lee `routes/*.js` con ruta absoluta** para que funcione aunque el proceso se lance desde la raíz.
- **Docker**: `node:20-bookworm-slim` + `ca-certificates` y `libcurl4` (mongod los necesita). El binario de
  MongoDB se descarga en el primer arranque y se cachea en un volumen.
- **Seeds**: todavía no existen (iteración 03). `index.js` deja marcado dónde se van a invocar.
- **Se borraron `AGENTS.md` y `.claude/` del template de Expo** porque indicaban usar Expo Router,
  en contra de la spec (React Navigation).

## Iteración 02

- **El dominio reserva y libera cupo sobre la entidad en memoria** (`Compra.crear`, `cancelar`, `vencer` reciben
  el `Evento` y operan sobre su `TipoEntrada`). Así la regla queda en el dominio y testeada; en la iteración 05 el
  service la persiste con la operación atómica del repositorio.
- **Tabla de transiciones indexada por disparador** (`pagar`, `cancelar`, `vencer`, `reembolsar`,
  `marcar como utilizada`), no solo por "desde → hacia": con una tabla de estados, `vencer()` aceptaba una
  compra CONFIRMADA porque CONFIRMADA → CANCELADA es válido para `cancelar()`. Lo detectó un test.
- **Validaciones de forma primero, de negocio después**: una transición que la tabla no admite responde
  "No se puede X una compra ESTADO" antes que cualquier chequeo de fechas.
- **`Evento.editar(cambios, reloj)` es el único punto de edición** y es atómico (valida todo antes de aplicar).
  Los métodos sueltos (`agregarMultimedia`, `ampliarDescripcion`, etc.) delegan en él. Campos aceptados:
  `multimediaNueva`, `multimediaAQuitar`, `tiposEntradaNuevos`, `ampliacionDescripcion`.
- **Editar un evento ocurrido o finalizado responde 409** (estado inválido); un campo no editable responde 400.
- **`Evento.crear(datos, reloj)` exige fecha futura; el constructor no**, para poder hidratar eventos pasados.
- **La titularidad (403) la verifican los services**, salvo el chat y la reseña, donde la spec la pone en el dominio.
- **La unicidad de la reseña es por compra (id), no por tipo de entrada**: quien hizo dos compras del mismo
  evento puede reseñar cada una, aunque sean del mismo tipo de entrada. Siempre tiene que ser el comprador
  de esa compra (`crearResenia` → 403, `registrarResenia` → 409 si el `compradorId` no coincide).
- **Reseña en dos pasos**: `compra.crearResenia(...)` valida y arma la `Resenia` sin id; tras guardarla,
  `compra.registrarResenia(resenia)` la vincula. El índice único de `resenia.compraId` (iteración 03) lo refuerza.
- **`diasParaElEvento`** usa `Math.ceil` literal: devuelve 0 solo cuando el evento ya empezó (nunca negativo).
- **`categoriasPreferidas`** recibe los favoritos en el orden en que se marcaron (como `usuario.favoritos`); el
  "más reciente" para desempatar es el de mayor índice. Se agregó `ordenarRecomendados` para el criterio de orden.
- **`ACTOR_SISTEMA` es exactamente `{ id: "SISTEMA", nombre: "Sistema" }`**; `CambioEstadoCompra` completa
  `rol: "SISTEMA"` al registrarlo.
- **Montos**: precios y totales se redondean a 2 decimales; los detalles del historial se formatean en `es-AR`
  ("$45.000,00").
- **Sin miembros `#privados` en clases persistibles**: como en REPO_REF, los helpers privados son funciones del
  módulo, porque los documentos de mongoose cargados con `loadClass` no pueden acceder a `#privados`.
- **`Persistible.darDeBaja/darDeAlta` aceptan un reloj opcional** para que la auditoría sea testeable.
- **Cobertura con `coverageProvider: "v8"`**: la instrumentación de babel no funciona con ESM nativo.

## Iteración 03

- **Los repos devuelven entidades de dominio** (`new Evento({...})`), no documentos con `loadClass` como REPO_REF:
  los services trabajan con objetos puros y las reglas viven en un solo lugar.
- **Ids**: `ObjectId` en Mongo, `string` en el dominio. Un id con formato inválido en una búsqueda devuelve `null`
  (404 en el service) en lugar de un `CastError`.
- **`RepositorioPersistible.delete(id, usuarioActual, reloj)` exige quién da de baja.** No se copió el
  `ProveedorUsuarioActual` de REPO_REF (vive en `services/` y dependía del modo mock).
- **`EventosMongoRepository.guardar` nunca reescribe `disponibles` de tipos existentes**: en una modificación hace
  `$set` de los campos editables y `$push` de los tipos nuevos (los que no tienen id). Así guardar un evento editado
  no pisa una reserva concurrente. El dominio ya prohíbe modificar tipos existentes.
- **`ComprasMongoRepository.guardar` no reescribe `mensajes`** al modificar: los mensajes entran solo por
  `agregarMensaje` (`$push`), para no perder uno enviado mientras otra operación guardaba la compra.
- **`reservarCupo`**: `updateOne` con `$elemMatch: { _id, disponibles: { $gte: cantidad } }` + `$inc` con
  `arrayFilters`, en una sola operación atómica. **`liberarCupo`** usa un update con pipeline
  (`$min: [cupo, disponibles + cantidad]`) para no superar el cupo, también atómico.
- **Búsqueda por texto**: además del índice `$text` (nombre + descripción) que pide la spec, `q` busca con regex sobre
  un campo normalizado `textoBusqueda` (nombre, descripción, ampliaciones y lugar, en minúsculas y sin acentos) y
  sobre `nombreBusqueda` de los organizadores. `$text` solo encuentra palabras completas ("jaz" no encuentra "jazz")
  y no cubre el lugar ni el organizador, que pide la spec 04.
- **Orden por defecto**: fecha ascendente; con `anteriores=true`, fecha descendente; por puntaje, descendente.
  Desempate estable por fecha y `_id`.
- **Seeds con el dominio**: cada compra se arma con `Compra.crear`, `pagar`, `cancelar`, etc., avanzando un reloj
  simulado. El historial, el cupo, los mensajes y las reseñas quedan coherentes con las reglas reales. Son idempotentes
  por nombre (categorías y eventos) y email (usuarios); las compras de un evento solo se crean junto con él. Los
  favoritos se cargan solo a compradores creados en esa corrida.
- **Imágenes de la semilla**: afiches abstractos generados por `scripts/generarImagenesSemilla.js` (PNG sin
  dependencias), servidos como `/uploads/semilla/<categoria>.png`.
- **Tests de persistencia**: cada suite levanta su propio MongoMemoryServer y construye los índices (`Model.init()`)
  antes de empezar, para que los índices únicos se respeten desde el primer test.

## Iteración 04

- **Errores de zod en el `errorHandler`**: `{ status: "fail", message, timestamp, detalles: [{ campo, mensaje }] }`.
  Mantiene el formato común (REPO_REF respondía `{ error, detalles }` desde cada controller) y el `message` ya trae
  el detalle legible. Los controllers no tienen try/catch: Express 5 propaga los errores de los handlers async.
- **`MulterError` traducidos a 400** con mensajes en castellano; un tipo de archivo no permitido se rechaza en el
  `fileFilter` con `BadRequestError`. Multer guarda en memoria: el service recibe el buffer y lo guarda vía
  `AlmacenamientoLocalAdapter` (no conoce multer ni fs). El límite de 5 MB de imágenes se valida por tipo después
  de multer, que solo admite un límite global (el de video, 20 MB).
- **Compensación al subir multimedia**: si el dominio o la base rechazan el cambio, se borran los archivos ya
  guardados. El adapter solo borra lo que él subió (`/uploads/eventos/…`), nunca las imágenes de la semilla, que
  son compartidas entre eventos.
- **`alts` en multipart**: campo repetido en el mismo orden que `archivos`; obligatorio para imágenes.
- **Auth opcional**: con un token inválido o vencido, los endpoints públicos responden como anónimo (no 401), para
  que una sesión vencida no rompa la exploración.
- **Validación de queries**: `limite > 50` → 400 (no se recorta); `orden=relevancia` sin `paraVos=true` → 400;
  `fechaHasta` con solo fecha incluye todo ese día. Los bodies usan `.strict()`; las queries no, para tolerar
  parámetros extra (cache busting).
- **`paraVos` sin efecto** (anónimo, organizador o comprador sin favoritos): se ignora, `filtrosAplicados.paraVos =
false` y `orden=relevancia` cae a `fecha`. Con `categoriaIds`, la intersección vacía devuelve 0 resultados.
- **Relevancia**: el repositorio calcula el peso de la categoría con `$switch` sobre `pesosCategorias` y ordena por
  peso desc y fecha asc. Lo usan `/recomendados` y `paraVos`.
- **Recomendados**: las categorías preferidas respetan el orden en que se marcaron los favoritos (desempate);
  `obtenerVarios` devuelve en orden de la base, así que el service los reordena.
- **Detalle de evento** incluye los finalizados ("Eventos anteriores"). Un id con formato inválido en la ruta → 400;
  inexistente → 404. Categoría inexistente al crear → 400.
- **`VistasEventos`** arma categoría, organizador y `esFavorito` para una lista de eventos con 2–3 consultas en total
  (no una por evento). `esFavorito` solo aparece con sesión de comprador.
- **URL absoluta de multimedia**: `PUBLIC_BASE_URL` si está definida; si no, se infiere del request (protocolo + host),
  que desde el celular ya es la IP LAN de la PC.
- **Favoritos**: se puede marcar un evento finalizado; `GET /api/favoritos` los lista del último marcado al primero.
- **Afiches de la semilla** regenerados con la paleta "Telón de terciopelo" (cambió en el contexto común).

## Iteración 05

- **Sin transacciones de Mongo.** Requieren un replica set; con mongodb-memory-server eso implica
  `MongoMemoryReplSet`, más lento de levantar y más frágil en los tests y en Docker. En su lugar:
  - **Crear**: `reservarCupo` atómico (la base impide la sobreventa) y después `guardar` la compra; si el guardado
    falla, `liberarCupo` (compensación).
  - **Transiciones con control optimista**: `guardarTransicion(compra, estadoAnterior)` solo escribe si la compra
    sigue en el estado leído. El cupo se libera **después** de ese guardado exitoso, así un mismo vencimiento o
    cancelación aplicados en paralelo (job + evaluación perezosa + petición) no lo liberan dos veces. Quien pierde
    recibe 409 (acción del usuario) o relee la compra (job / evaluación perezosa).
  - **Reseña**: 1) se crea (índice único por compra), 2) se suma al puntaje del organizador con el dominio y un
    guardado condicional sobre `cantidadResenias` (3 reintentos), 3) se vincula a la compra. Si falla el paso 2, se
    borra la reseña.
- **Evaluación perezosa** en todo caso de uso que lee u opera sobre compras (detalle, mis compras, compras por evento,
  pagar, cancelar, reembolsar, reseñar). El job y la evaluación perezosa comparten el mismo código
  (`#transicionAutomatica` + `#transicion`).
- **Pagar una compra vencida**: si al operar ya venció, primero se aplica `vencer()` y se responde 409
  "La compra venció" (también si ya estaba vencida de antes).
- **Reembolso manual fuera de plazo**: primero corre la evaluación perezosa; si ya correspondía el reembolso
  automático, el organizador recibe 409 "La compra ya fue reembolsada automáticamente" y el historial lo refleja.
- **"Mis compras"**: primero las de eventos futuros (la más próxima arriba) y después las de eventos pasados (la más
  reciente arriba).
- **Recaudación confirmada** = total de las compras CONFIRMADA y UTILIZADA (cobrado y no devuelto).
- **`mensajesNoLeidos`**: mensajes del otro participante posteriores a su última lectura. La marca de lectura llega
  en la iteración 06; hasta entonces cuentan todos.
- **Las acciones devuelven el detalle completo** (`pagar`, `cancelar`, `reembolsar`), con historial y acciones
  disponibles al día, para que el front no tenga que volver a pedirlo.
- **Tareas programadas**: cada compra se procesa por separado (un error se registra y no frena a las demás) y dos
  corridas no se solapan. El temporizador usa `unref()` para no impedir el apagado del proceso.
- **Tests con reloj adelantado**: todos los services comparten el objeto `reloj`; los tests espían `reloj.ahora`
  (`avanzarReloj`) sin tocar el código productivo.
- **Bug detectado por los tests**: las tareas informaban 0 cambios porque `#transicion` aplica la transición sobre el
  mismo objeto leído; ahora se compara contra el estado guardado antes de procesar.
