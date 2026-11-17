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
- [ ] **Contraste** ≥ 4,5:1 en texto normal y botones (3:1 en texto grande, íconos y bordes de inputs), en **modo claro y oscuro**. Usar solo los tokens de la paleta "Telón de terciopelo" de abajo, que ya están verificados; no inventar tintes más claros para texto.
- [ ] **Cada campo tiene etiqueta visible** (nunca solo placeholder) asociada con `accessibilityLabel`/`aria-labelledby`; los obligatorios se marcan con `*` y una leyenda "* Obligatorio".
- [ ] **Los errores aparecen junto al campo** (debajo, con ícono y color de error), dicen qué pasó y cómo resolverlo, y se anuncian (`accessibilityLiveRegion="polite"` / `role="alert"`).
- [ ] **Feedback en toda acción importante**: cargando (Skeleton o spinner en el botón, `accessibilityState={{ busy: true }}`), éxito y error (Toast anunciado al lector de pantalla).
- [ ] **Navegación con teclado y foco siempre visible**: todo elemento interactivo es enfocable (`focusable`), muestra un anillo de foco de 2px en `primary` con offset (sobre teclado externo / web) y el orden de foco es lógico. Nunca se oculta el foco.
- [ ] **Imágenes informativas con texto alternativo** (`accessibilityLabel`; el organizador carga el alt de cada imagen al subirla); las decorativas con `accessible={false}`.
- [ ] **Consistencia**: componentes similares se ven y funcionan igual en toda la app (siempre los de `components/ui/`, nunca variantes ad hoc).
- [ ] **Acciones destructivas** piden confirmación (Modal) o permiten deshacer (Toast con "Deshacer", por ejemplo al quitar un favorito).
- [ ] El estado nunca se comunica solo con color: siempre ícono + texto. Áreas táctiles ≥ 44×44.
- [ ] Modo claro y oscuro completos (Sistema / Claro / Oscuro).

## Plataformas: iOS y Android
La app tiene que funcionar en **ambas** con Expo Go, con el mismo código. Diferencias a contemplar siempre:
- **Sombras**: `shadowColor/shadowOffset/shadowOpacity/shadowRadius` (iOS) **y** `elevation` (Android) en cada componente con sombra (TicketCard, Modal, Toast).
- **Teclado**: `KeyboardAvoidingView` con `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` (login, formularios, chat).
- **Safe areas**: `react-native-safe-area-context` para notch, Dynamic Island y barra de gestos de Android; nunca paddings fijos.
- **Fecha y hora**: `@react-native-community/datetimepicker` se ve distinto en cada SO (inline/spinner en iOS, diálogo en Android); envolverlo en un componente propio `SelectorFecha` con la misma API.
- **Permisos**: textos de permiso de cámara y galería en `app.config.js` (`ios.infoPlist` y plugin de `expo-image-picker`).
- **Botón atrás de Android**: cierra modales y bottom sheets antes de navegar hacia atrás.
- **Fuentes**: cargadas con `expo-font` antes de renderizar (splash), así se ven igual en las dos.
- Usar `Platform.select` solo para estas diferencias; nada de pantallas separadas por SO.

## Cómo usar los diseños de `design/stitch/`
Son **referencia visual** (layout, jerarquía, componentes, tono), no especificación funcional. Si una pantalla muestra algo que el producto no tiene, **se ignora y mandan las specs**: códigos QR, butacas/filas/palcos, descarga de PDF o wallet, facturas/AFIP, cargos de servicio (el total es precio × cantidad), estados distintos de los 5 definidos ("Emitido", "Activo", "Acceso prioritario"), pasos de progreso inventados en lugar del historial real, o cancelar como link chico en vez de botón con confirmación. Los colores y tipografías salen de los tokens de abajo, no de la config de Tailwind del HTML exportado (Stitch generó su propia paleta en `design/stitch/_design-system/DESIGN.md`, con un fondo rosado `#fff8f8` que **no** se usa). En cada pantalla, `screen.png`/`code.html` es la versión principal (clara), `screen-dark.png`/`code-dark.html` la oscura cuando existe, y `alt/` una variante clara alternativa de menor prioridad.

## Identidad visual: "Telón de terciopelo"
La **estructura** de la UI (pills, barra de filtros, cards, stat cards, paginación, carruseles, footer, etiquetas en mayúsculas espaciadas) se copia de REPO_REF. La **temática** es teatro clásico con ejecución moderna:
- **Concepto ticket, moderno**: las tarjetas de compra y de evento tienen forma de entrada, con muescas semicirculares laterales y un **talón** separado por una línea punteada (número de serie "Nº 004817" y dato clave: cuenta regresiva, precio o estado). Bordes muy redondeados (16–18px), mucho aire y una sombra suave con tinte bordó en claro.
- **Letra con adornos**: títulos en **Playfair Display** (itálica 700 para destacar una palabra: "Tu próxima *función*"). Cuerpo, datos y pills en **Inter** (400/500/600). Etiquetas de sección en mayúsculas espaciadas (`letter-spacing` amplio), con el ornamento "✦" en dorado.
- **Nada de "viejo"**: sin textura de papel, sin tipografía slab ni de máquina de escribir, sin sellos gastados ni sepia.
- Pills y botones totalmente redondos (9999px). Las pills de estado van con **fondo tintado + texto del mismo tono + ícono**.

| Token | Claro ("marfil") | Oscuro ("platea") |
|---|---|---|
| background | `#faf7f2` | `#0f0b0d` |
| surface (cards) | `#ffffff` | `#1d1417` |
| surfaceSubtle / elevated | `#f3ece4` | `#2a1a1f` |
| ticketStub (talón) | `#fbf3ee` | `#b3122c` (texto `#ffffff` / `#f5efe6`) |
| textPrimary | `#1c1416` | `#f5efe6` |
| textSecondary | `#4a3a3e` | `#d8ccc0` |
| textMuted | `#6b5a5e` | `#a8998f` |
| primary (relleno de botón principal, tab activa) | `#7a1e2c` + texto `#ffffff` | `#c8102e` + texto `#ffffff` |
| accentText (palabra destacada, tipo de entrada, cuenta regresiva) | `#7a1e2c` | `#ff4757` |
| gold (etiquetas, ✦, botón secundario en oscuro) | `#8a6417` | `#d4af37` (botón: texto `#0f0b0d`) |
| goldOrnament (filetes, solo decorativo) | `#b8892b` | `#d4af37` |
| velvet / velvetShade (telón y banner de la landing) | `#7a1e2c` / `#4f111c` | `#7a0f1f` / `#3d0710` |
| onVelvet · goldOnVelvet (texto sobre terciopelo, ≥ 4,5:1) | `#ffffff` · `#f2d58a` | `#ffffff` · `#f2d58a` |
| reflector (opacidad del halo dorado del hero; el texto encima sigue ≥ 4,5:1) | `0.18` | `0.08` |
| Sello "Cancelado" (spec 07c): usa `estados.CANCELADA.texto` sobre `surface` (≥ 4,5:1, en `theme.test`); no es un token nuevo | — | — |
| success | `#1f6b52` | `#6fc3a0` |
| warning | `#8a5300` | `#e8b04a` |
| error | `#a3182b` | `#ff8a8a` |
| info | `#1f3a5f` | `#8fb3de` |
| borderInput | `#8c7d80` | `#7a6a64` |
| divider | `#e6dcd0` | `#3a2a2e` |
| focusRing | `#7a1e2c` | `#f5efe6` |

**Estados de compra** (pill con fondo tintado, texto del mismo tono e ícono):

| Estado | Claro (texto / fondo) | Oscuro (texto / fondo) | Ícono |
|---|---|---|---|
| PENDIENTE | `#8a5300` / `#fbf0dc` | `#e8b04a` / `#33270f` | reloj |
| CONFIRMADA | `#1f6b52` / `#e7f2ec` | `#6fc3a0` / `#16302a` | check |
| UTILIZADA | `#1f3a5f` / `#e6edf6` | `#8fb3de` / `#172433` | ticket |
| CANCELADA | `#a3182b` / `#f9e3e5` | `#ff4757` / `#3a1219` | x |
| REEMBOLSADA | `#8a6417` / `#f7efdc` | `#d4af37` / `#2e2512` | flecha circular |

**Contrastes verificados (WCAG)**: todo texto ≥ 4,6:1 sobre su fondo (la mayoría > 5,5), botones rellenos ≥ 5,9:1 y bordes de input ≥ 3,5:1. Los rellenos rojos del oscuro (`#b3122c`, `#c8102e`) contrastan poco contra el fondo negro (2,8–3,3:1), así que los botones rojos del oscuro llevan **anillo de foco crema** (`#f5efe6`, 17:1) y el talón queda delimitado por las muescas y la línea punteada. El dorado ornamental `#b8892b` **no** se usa para texto en claro.

**Uso del rojo en oscuro**: el relleno rojo solo va en el talón, el botón principal y la tab activa; el resto de los acentos son texto `#ff4757` o dorado. Así el modo oscuro es teatral sin saturar.

## Definición de terminado (toda iteración)
- `npm run lint` y los tests de la iteración pasan.
- Swagger actualizado para cada endpoint nuevo.
- `packages/backend/docs/changelog.md` actualizado y decisiones no obvias anotadas en `docs/decisiones.md`.
- No adelantar trabajo de iteraciones siguientes. Si algo de la spec es ambiguo, preguntar antes de inventar.
