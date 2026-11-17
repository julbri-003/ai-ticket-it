# 04 — Back: auth, categorías, eventos, búsqueda, multimedia y favoritos

## Objetivo
Exponer por REST todo lo necesario para registrarse, explorar, buscar y publicar eventos (casos de uso 3, 4 y 11 del enunciado, más favoritos y edición restringida).

## Leer antes
`REPO_REF/packages/backend/controllers/AuthController.js`, `services/AuthService.js`, `routes/authRoutes.js`, `controllers/HitosController.js`, `routes/hitosRoutes.js`, `controllers/dto/*`, `tests/proyectos.integracion.test.js`, `tests/authRegistro.integracion.test.js`.

## Endpoints

### Auth (`/api/auth`)
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/registro` | público | `{ nombre, apellido, email, password (≥8), rol: COMPRADOR\|ORGANIZADOR }` → `{ token, usuario }`. Email normalizado; 409 si existe. |
| POST | `/login` | público | `{ email, password }` → `{ token, usuario }`. 401 "Credenciales inválidas". |
| GET | `/me` | auth | Usuario actual (DTO sin hash). |

El JWT lleva `{ id, rol, nombre }`. Se usan `authMiddleware` y `authorizeRole` copiados de REPO_REF.

### Categorías (`/api/categorias`)
`GET /` (público).

### Eventos (`/api/eventos`)
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/` | público | **Buscador con filtros**. Query (zod, todos opcionales y combinables): `q` (texto en nombre, descripción, lugar y nombre del organizador; sin distinguir mayúsculas ni acentos), `categoriaIds` (CSV), `precioMin`, `precioMax`, `fechaDesde`, `fechaHasta`, `conDisponibilidad=true`, `puntajeMin` (0–5), `paraVos=true`, `orden=fecha\|precio\|puntaje\|relevancia` (por defecto `fecha`; `relevancia` solo con `paraVos`), `direccion=asc\|desc`, `pagina`, `limite (≤50)`, `anteriores=true\|false`. Respuesta `{ items, total, pagina, limite, filtrosAplicados }`. Validar `precioMin ≤ precioMax` y `fechaDesde ≤ fechaHasta` (400 con un mensaje claro). |
| GET | `/recomendados` | COMPRADOR | **"Recomendados para vos"**: ver la sección de abajo. Query `pagina`, `limite`. |
| GET | `/:id` | público | Detalle: tipos de entrada con `disponibles`, organizador `{ id, nombre, puntajePromedio, cantidadResenias }`, `precioMinimo`, `yaOcurrio`, `ampliacionesDescripcion`, URLs absolutas de multimedia. |
| GET | `/:id/resenias` | público | Reseñas **de todos los eventos del organizador** de ese evento, paginadas y con el nombre del evento al que pertenece cada una (caso de uso 10). |
| GET | `/mios` | ORGANIZADOR | Sus eventos (activos y anteriores) con vendidas/disponibles por tipo y conteo de compras por estado. |
| POST | `/` | ORGANIZADOR | Crear (JSON). La multimedia se sube aparte. |
| POST | `/:id/multimedia` | ORGANIZADOR dueño | `multipart/form-data`, campo `archivos` (máx 6) + `alts` (texto alternativo por archivo, obligatorio para imágenes). `multimedia` pasa a ser `[{ ruta, tipo, alt }]`. |
| DELETE | `/:id/multimedia` | ORGANIZADOR dueño | `{ ruta }`. |
| POST | `/:id/tipos-entrada` | ORGANIZADOR dueño | Agrega un tipo de entrada. |
| POST | `/:id/ampliaciones` | ORGANIZADOR dueño | `{ texto }`. |

Cualquier `PUT`/`PATCH` genérico sobre eventos **no existe**: la edición restringida se modela con estos endpoints específicos, que delegan en los métodos del dominio.

### Favoritos (`/api/favoritos`, COMPRADOR)
`GET /` (eventos favoritos, incluso anteriores, marcados con `yaOcurrio`), `PUT /:eventoId`, `DELETE /:eventoId`. Ambos idempotentes y devuelven la lista de ids. El DTO de evento incluye `esFavorito` cuando hay sesión de comprador (auth opcional en GET de eventos: `authOpcionalMiddleware`).

## Recomendados para vos
`services/RecomendacionesService.js`:
1. Obtiene los eventos favoritos del comprador (incluso inactivos).
2. Calcula `categoriasPreferidas` con el dominio.
3. Busca eventos **activos y futuros** de esas categorías, excluyendo los que ya están en favoritos y los que ya compró (CONFIRMADA/PENDIENTE), ordenados por `puntajeRecomendacion` y fecha.

Respuesta: `{ items, total, pagina, limite, categorias: [{ id, nombre, cantidad }], motivo }`, donde `motivo` es, por ejemplo, "Porque guardaste eventos de Recitales y Teatro". Sin favoritos: `{ items: [], categorias: [], motivo: null, sinFavoritos: true }` (no es error), para que el front muestre un estado vacío que invite a guardar favoritos.

El flag `paraVos=true` del buscador reutiliza el mismo cálculo: reemplaza `categoriaIds` por las categorías preferidas, y si además vienen `categoriaIds` del usuario, aplica la intersección. Así "Para vos" se combina con texto, precio, fecha y orden. Si el usuario no es comprador o no tiene favoritos, `paraVos` se ignora y `filtrosAplicados.paraVos = false`.

## Multimedia
- `middlewares/uploadMiddleware.js` con multer: tipos `image/jpeg|png|webp` (≤5 MB) y `video/mp4` (≤20 MB). Si no cumple, 400 con un mensaje claro (traducir los `MulterError` en `errorHandler`).
- `adapter/AlmacenamientoLocalAdapter.js` con interfaz `guardar(archivo) → ruta`, `eliminar(ruta)`; guarda en `UPLOADS_DIR` con nombre UUID. El service depende de la interfaz, no de multer ni de fs, para poder cambiar de proveedor sin tocarlo.
- `/uploads` servido estático. El DTO devuelve URL absoluta armada con `PUBLIC_BASE_URL` (o la que infiera del request) para que el celular la pueda abrir.

## Services
`AuthService`, `CategoriasService`, `EventosService` (crear, buscar, detalle, edición restringida verificando titularidad → 403), `FavoritosService`, `ReseniasService.listarPorOrganizadorDelEvento`.

## Tests (supertest + memoria)
Registro y login (ok, duplicado, credenciales malas); un comprador no puede crear eventos (403); otro organizador no puede editar (403); crear con fecha pasada o sin tipos → 400; intento de editar la descripción original → no existe ruta / 400; subir un archivo con tipo inválido → 400; búsqueda con cada filtro, combinaciones y orden; rangos inválidos → 400; favoritos idempotentes; recomendados (categorías correctas, excluye favoritos y compras, vacío sin favoritos, `paraVos` combinado con `q` y precio).

## Criterios de aceptación
- [ ] Todos los endpoints documentados en Swagger con ejemplos.
- [ ] Validación zod en todos los bodies y queries (`.strict()` en bodies).
- [ ] DTOs: nunca exponen `passwordHash` ni campos internos de mongoose (`__v`, `_id` → `id`).
