# 00 — Contexto común (leer siempre antes de cualquier iteración)

## Producto
**AI Ticket It**: plataforma de venta de entradas para eventos. Hay dos roles, elegidos al registrarse y no combinables:
- **COMPRADOR**: busca y explora eventos, guarda favoritos, compra entradas, paga, cancela, chatea con el organizador por cada compra y reseña.
- **ORGANIZADOR**: publica eventos con tipos de entrada (precio + cupo), ve las compras de cada evento, reembolsa cancelaciones y responde el chat.

No hay rol admin.

## Restricciones del enunciado (no negociables)
- Back-end: **Node + Express**.
- Front-end: **React Native (Expo)**, ejecutándose localmente en un celular (Expo Go) o emulador.
- Persistencia **en memoria**: **mongodb-memory-server** + **mongoose**. Los datos se pierden al reiniciar y se re-siembran al arrancar. Si `MONGO_URI` está definida, se usa esa base (útil para debug); si no, se levanta la instancia en memoria.

## Repo de referencia
`REPO_REF = C:\Users\brise\2026-2c-lu-sa-grupo-3` es un proyecto anterior del mismo autor. **Los requerimientos no funcionales, la organización de carpetas y los patrones se copian de ahí.** Antes de crear un archivo de un tipo (controller, route, service, repo, schema, dominio, middleware, context, componente, api), abrí su equivalente en `REPO_REF` e imitá su estructura, estilo y nombres.

Archivos clave de referencia:

| Patrón | Archivo en REPO_REF |
|---|---|
| Errores tipados | `packages/backend/errors/AppError.js` |
| Middlewares | `packages/backend/middlewares/*.js` (auth, authorizeRole, errorLogger, errorHandler, notFoundHandler) |
| Baja lógica de dominio | `packages/backend/domain/persistibleDominio.js` |
| Plugin mongoose heredable | `packages/backend/schemas/persistibleSchema.js` (`persistiblePlugin`) |
| Repos base | `packages/backend/repositories/RepositorioPersistible.js`, `repositories/mongo/RepositorioMongoPersistible.js` |
| Inyección de dependencias | `packages/backend/dependencias.js` |
| Controller + zod | `packages/backend/controllers/HitosController.js` |
| Routes + Swagger JSDoc | `packages/backend/routes/hitosRoutes.js`, `routes/router.js`, `swagger.js` |
| DTOs | `packages/backend/controllers/dto/*.js` |
| Templates de notificación | `packages/backend/templates/notificacionTemplates.js`, `services/TemplatesService.js` |
| Notificaciones | `packages/backend/services/NotificacionesService.js`, `domain/notificacionDominio.js` |
| Seeds | `packages/backend/seeds/*`, `scripts/seed.js` |
| Cliente HTTP | `packages/frontend/src/service/api.js`, `service/apis/apiCaller.js`, `service/apis/*Api.js` |
| Services de front (DTO → modelo de UI) | `packages/frontend/src/service/*Service.js` |
| Contexts | `packages/frontend/src/context/{Auth,Theme,Toast}Context.jsx` |
| Componentes UI | `packages/frontend/src/components/ui/*` (Button, Card, Badge, Input, Select, Textarea, Modal, Skeleton, Spinner, Pagination) |
| Tokens visuales | `packages/frontend/src/styles/theme.js` |

**No copiar defectos conocidos**: `notFoundHandler` de REPO_REF llama `next()` dos veces (debe llamarse una sola vez). Tampoco se copian Tailwind, Vite, react-router ni cypress: no aplican a React Native.

## Stack
**Back** (`packages/backend`, ESM `"type": "module"`): express 5, mongoose 8, mongodb-memory-server, zod 4, jsonwebtoken, bcrypt, cors, dotenv, multer, socket.io, swagger-jsdoc, swagger-ui-express. Tests: jest + supertest.

**Front** (`packages/frontend`): Expo (última SDK estable), React Native, **styled-components/native** (único mecanismo de estilos; nada de StyleSheet suelto ni Tailwind), **axios**, React Navigation (native-stack + bottom-tabs), expo-secure-store, expo-image-picker, expo-image, socket.io-client, lucide-react-native. Tests: jest-expo + @testing-library/react-native.

## Arquitectura del back (capas, dependencias solo hacia abajo)
```
routes → controllers (zod + DTO) → services (casos de uso) → domain (reglas)
                                         ↓
                              repositories (mongoose) / adapters (archivos, sockets)
```
- **routes/**: arma la cadena de middlewares (`authMiddleware`, `authorizeRole`, upload) y documenta con Swagger JSDoc. Un `router.js` monta todo bajo `/api`.
- **controllers/**: valida el body, la query y los params con **zod** (schemas exportados arriba del controller, como en `HitosController`), llama al service y devuelve el DTO de `controllers/dto/`. No contiene reglas de negocio.
- **services/**: orquestan casos de uso y verifican titularidad (403). Reciben dependencias por constructor.
- **domain/**: clases puras sin mongoose, express ni HTTP. Todas las reglas de negocio y transiciones de estado viven acá y lanzan `AppError`s.
- **repositories/**: `RepositorioPersistible` (abstracto) + `repositories/mongo/*MongoRepository.js`. Convierten documentos ↔ entidades de dominio (hidratar / `mapearCampos`).
- **schemas/**: schemas de mongoose. **Toda entidad persistible aplica `schema.plugin(persistiblePlugin)`**: la baja lógica y la auditoría se heredan por plugin, nunca se redeclaran.
- **adapter/**: integraciones con infraestructura (almacenamiento de archivos, emisión por socket).
- **templates/**: textos de notificaciones; **TemplatesService** los resuelve.
- **middlewares/**, **errors/**, **utils/**, **seeds/**, **scripts/**, **jobs/** (tareas programadas), **sockets/**, **tests/**, **docs/**.
- **dependencias.js**: único lugar donde se instancian repos, services y adapters (composition root).
- Reloj inyectable: `utils/reloj.js` exporta `{ ahora: () => new Date() }`. Toda regla temporal lo recibe para poder testearse.

## Arquitectura del front
```
src/
  components/   ui/ (genéricos), layout/, eventos/, compras/, chat/, notificaciones/
  context/      AuthContext, ThemeContext, ToastContext, SocketContext, NotificacionesContext
  features/     auth/, eventos/, compras/, favoritos/, organizador/, notificaciones/, perfil/, errors/
  routes/       AppNavigator.jsx, AuthStack, CompradorTabs, OrganizadorTabs
  service/      api.js (axios + interceptores), apis/apiCaller.js, apis/<recurso>Api.js, <recurso>Service.js, socket.js
  styles/       theme.js
  utils/
```
- `features/` = pantallas. `components/` = piezas reutilizables. Las pantallas nunca llaman a axios directo: **pantalla → `<recurso>Service` → `<recurso>Api` → `apiCaller` → `api`**.
- Todo estado de carga usa **Skeleton**. Todo error o éxito de una acción se informa con **Toast**. Toda acción destructiva o de pago pide confirmación con **Modal**.

## Convenciones
- Nombres de dominio en **español**: `compraDominio.js`, `ComprasService.js`, `ComprasController.js`, `comprasRoutes.js`, `CompraSchema`, `ComprasMongoRepository.js`, `comprasApi.js`, `comprasService.js` (front).
- Respuestas de error con el formato de `errorHandler` de REPO_REF: `{ status, message, timestamp }`. Los errores de zod responden 400 con el detalle de los campos.
- Códigos HTTP: 400 validación o regla, 401 sin sesión, 403 sin permiso o titularidad, 404 inexistente, 409 conflicto (sin cupo, estado inválido).
- Fechas en ISO UTC en la API; el front las formatea en `es-AR`.
- Montos con `Number` y 2 decimales; nunca confiar en el precio que envía el cliente.

## Accesibilidad y UX (obligatorio en todo el front)
En React Native, el equivalente a `aria-*` son las props `accessibilityRole`, `accessibilityLabel`, `accessibilityHint`, `accessibilityState` y `accessibilityLiveRegion` (o las props `aria-*` / `role` que RN ya soporta). Checklist de revisión, a cumplir en cada pantalla:
- [ ] **Contraste** ≥ 4,5:1 en texto normal y botones (3:1 en texto grande, íconos y bordes de inputs), en **modo claro y oscuro**. Usar solo los tokens de la paleta "Ticket vintage" de abajo, que ya están verificados; no inventar tintes más claros para texto.
- [ ] **Cada campo tiene etiqueta visible** (nunca solo placeholder) asociada con `accessibilityLabel`/`aria-labelledby`; los obligatorios se marcan con `*` y una leyenda "* Obligatorio".
- [ ] **Los errores aparecen junto al campo** (debajo, con ícono y color de error), dicen qué pasó y cómo resolverlo, y se anuncian (`accessibilityLiveRegion="polite"` / `role="alert"`).
- [ ] **Feedback en toda acción importante**: cargando (Skeleton o spinner en el botón, `accessibilityState={{ busy: true }}`), éxito y error (Toast anunciado al lector de pantalla).
- [ ] **Navegación con teclado y foco siempre visible**: todo elemento interactivo es enfocable (`focusable`), muestra un anillo de foco de 2px en `primary` con offset (sobre teclado externo / web) y el orden de foco es lógico. Nunca se oculta el foco.
- [ ] **Imágenes informativas con texto alternativo** (`accessibilityLabel`; el organizador carga el alt de cada imagen al subirla); las decorativas con `accessible={false}`.
- [ ] **Consistencia**: componentes similares se ven y funcionan igual en toda la app (siempre los de `components/ui/`, nunca variantes ad hoc).
- [ ] **Acciones destructivas** piden confirmación (Modal) o permiten deshacer (Toast con "Deshacer", por ejemplo al quitar un favorito).
- [ ] El estado nunca se comunica solo con color: siempre ícono + texto. Áreas táctiles ≥ 44×44.
- [ ] Modo claro y oscuro completos (Sistema / Claro / Oscuro).

## Identidad visual: "Ticket vintage"
La **estructura** de la UI (pills, barra de filtros, cards, stat cards, paginación, carruseles, footer, tipografía mono para etiquetas) se copia de REPO_REF, pero la **temática** cambia: entradas impresas antiguas (tickets de teatro y cine de los 50–70). Cards con muescas laterales y línea de perforación, números de serie en mono ("Nº 004817"), sellos para estados destacados y fondo de papel con grano muy sutil. Moderno y ordenado, no kitsch.

Para que **no parezca navidad**: crema/espresso + azul marino + café dominan (~85 %), el rojo ladrillo es acento (~10 %) y el verde solo indica éxito/CONFIRMADA (~5 %). Nunca grandes áreas rojas y verdes juntas, ni rojo + verde + dorado como decoración.

| Token | Claro ("papel") | Oscuro ("espresso") |
|---|---|---|
| background | `#f6efe2` | `#1a120d` |
| surface | `#fffaf0` | `#261b14` |
| surfaceSubtle / elevated | `#efe4d0` | `#33251b` |
| textPrimary | `#2b1d14` | `#f3e9d7` |
| textSecondary | `#5c4033` | `#d9c8ad` |
| textMuted | `#6f5442` | `#b09a80` |
| primary (azul marino) | `#1f3a5f` | `#8fb3de` |
| accent (rojo ladrillo) | `#9e2f2a` | `#e8867a` |
| success (verde botella) | `#2f6b4f` | `#7fbf9a` |
| warning (ocre) | `#7a5200` | `#e0b84a` |
| error | `#8f1d1d` | `#f19a8f` |
| borderInput | `#8a7058` | `#7d6650` (solo sobre background/surface; sobre elevated da 2,7:1) |
| divider | `#e2d4bc` | `#3d2d22` |
| onFilled (texto de botón relleno) | `#fffaf0` | `#1a120d` |
| ornamento (no texto) | `#c9a227` | `#c9a227` |

Contrastes verificados (WCAG): todo texto ≥ 5:1 sobre background/surface/subtle en su tema; botones rellenos ≥ 6:1; bordes de input ≥ 3:1 (ver la nota del oscuro). El dorado da 2,1:1 sobre crema: **solo** para ornamentos, o con texto espresso encima (6,7:1).

Estados de compra: PENDIENTE ocre (reloj), CONFIRMADA verde (check), UTILIZADA azul marino (ticket), CANCELADA rojo ladrillo (x), REEMBOLSADA café `textSecondary` (flecha circular). Siempre ícono + texto.

Tipografía: slab serif para títulos y números (Zilla Slab / Roboto Slab), sans para el cuerpo (Work Sans / Inter), mono tipo máquina de escribir para etiquetas, seriales y precios (IBM Plex Mono / Courier Prime), cargadas con `expo-font`.

## Definición de terminado (toda iteración)
- `npm run lint` y los tests de la iteración pasan.
- Swagger actualizado para cada endpoint nuevo.
- `packages/backend/docs/changelog.md` actualizado y decisiones no obvias anotadas en `docs/decisiones.md`.
- No adelantar trabajo de iteraciones siguientes. Si algo de la spec es ambiguo, preguntar antes de inventar.
