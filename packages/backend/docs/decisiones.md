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
