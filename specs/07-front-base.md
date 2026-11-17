# 07 — Front base: theme, contexts, componentes, navegación y auth

## Objetivo
Portar a React Native la base de UI de REPO_REF (mismo look & feel y misma API de componentes) y dejar funcionando el login, el registro y la navegación por rol.

## Leer antes
`REPO_REF/packages/frontend/src/styles/theme.js`, `styles/GlobalStyles.js`, `context/*.jsx`, `components/ui/*.jsx`, `components/layout/*.jsx`, `service/api.js`, `service/apis/apiCaller.js`, `service/authService.js`, `features/auth/*.jsx`, `routes/*.jsx`.
Si existen, `design/stitch/login/`, `design/stitch/registro/` y cualquier otra carpeta de `design/stitch/` (paleta y tipografía).

## Reglas de portado (web → React Native)
| REPO_REF (web) | Este proyecto (RN) |
|---|---|
| `styled.div` / `styled.span` / `styled.button` | `styled.View` / `styled.Text` / `styled.Pressable` de `styled-components/native` |
| `theme.js` | **Misma estructura de tokens** (colors, typography, borderRadius, espaciados) con unidades numéricas, pero con los **valores de la paleta "Telón de terciopelo"** de `00-contexto-comun.md` |
| `localStorage` | `expo-secure-store` (token) + estado en memoria |
| `window.location.href = '/login'` en el interceptor 401 | `AuthContext.cerrarSesion()` → la navegación vuelve sola al AuthStack |
| framer-motion | `Animated` / `LayoutAnimation` de RN |
| lucide-react | lucide-react-native |
| react-router + ProtectedRoute | React Navigation; el navegador raíz elige el stack según la sesión y el rol |
| Diseño de Stitch (HTML + Tailwind) | Traducir a componentes con styled-components/native; **nunca** meter WebView ni Tailwind |

Se mantienen: el nombre de cada componente, sus props y variantes, y la API de los contexts (`useToast().mostrar(...)`, `useAuth()`, `useTheme()`), para que el código se parezca al de REPO_REF.

## Alcance

### `service/`
- `api.js`: axios con `baseURL = EXPO_PUBLIC_API_URL`, timeout, interceptor que agrega el Bearer desde un *getter* de token (no lee storage en cada request) e interceptor 401 que llama a un callback registrado por AuthContext. Mantener `mensajeDeError(error)` de REPO_REF.
- `apis/apiCaller.js`: copiar tal cual. Agregar `postForm(endpoint, formData)` para multipart.
- `apis/authApi.js`, `authService.js`.
- `socket.js`: crea el cliente socket.io con `auth: { token }` (todavía no se usa; queda listo para la iteración 10).

### `context/`
- `ThemeContext` (claro y oscuro, persistido, respetando el modo del sistema por defecto) + `ThemeProvider` de styled-components.
- `ToastContext`: misma API y variantes (success, error, warning, info), animado, arriba con safe area, autocierre.
- `AuthContext`: `usuario`, `token`, `cargando`, `iniciarSesion`, `registrarse`, `cerrarSesion`, `esComprador`, `esOrganizador`. Al abrir la app restaura la sesión validando `/auth/me`.

### `components/ui/`
**TicketCard** (card moderna con radio 18px, muescas laterales y línea punteada que separa el **talón** con `ticketStub` de fondo; base de TarjetaEvento, TarjetaCompra y stat cards), **TituloEscena** (Playfair Display con prop `destacada` para la palabra en itálica `accentText`), **EtiquetaSeccion** (mayúsculas espaciadas en dorado con ✦), Button (variantes primary, secondary, outline, ghost, danger; loading; icono), Input (label, error, secure), Textarea, Select (modal con lista), Card, Badge, **EstadoCompraBadge** (color e icono por estado: según la tabla de estados de `00-contexto-comun.md`), Modal (con variante de confirmación: título, texto, confirmar/cancelar, loading), **Skeleton** (shimmer animado + presets `SkeletonCard`, `SkeletonLista`, `SkeletonDetalle`), Spinner, EmptyState, ErrorState (con reintentar), Rating (estrellas de lectura e input de 0.5), Chip (filtros), ImagenEvento (expo-image con placeholder).

### `components/layout/`
`Pantalla` (SafeArea + scroll + pull-to-refresh opcional), `Encabezado`.

### `routes/`
- `AppNavigator`: sin sesión → `AuthStack` (**Landing**, Login, Registro); COMPRADOR → `CompradorTabs` (Explorar, Mis compras, Favoritos, Mensajes, Perfil); ORGANIZADOR → `OrganizadorTabs` (Mis eventos, Crear, Mensajes, Notificaciones, Perfil). Top app bar con íconos de mensajería y campana, cada uno con su contador. Pantallas de detalle en stacks anidados.
- `features/home/Landing` (sin sesión): hero con un ticket grande destacado (muescas, talón con "Nº 000001"), pill de tagline, título Playfair con una palabra en itálica de acento, CTAs, stat cards tipo talón, carrusel de próximos eventos (público), grilla de categorías (cada tarjeta es un botón que lleva al Login), "Cómo funciona", sección compradores/organizadores, carrusel de reseñas destacadas, banner final y `Footer`.
- `components/layout/Footer`: al final de Landing y de Explorar (links, toggle de tema, ©).
- Componentes compartidos adicionales: `Carrusel` (swipe, dots, contador "3/8", flechas enfocables, visor a pantalla completa) y `Paginacion` (pills numeradas + "Mostrando 1–10 de 87"), usados en toda lista larga. Los servicios de front piden páginas al back (`pagina`, `limite`).
- En las tabs que corresponden a iteraciones futuras, poner una pantalla placeholder.

### `features/`
- `auth/Login`, `auth/Registro` (selector de rol con dos tarjetas: "Quiero comprar entradas" / "Quiero organizar eventos"). Validación inline, errores del back por Toast.
- `perfil/Perfil`: datos, rol, cambio de tema, cerrar sesión (con confirmación).
- `errors/`: pantalla genérica de error y de sin conexión.

### Accesibilidad en los componentes base
Implementar acá el checklist de accesibilidad de `00-contexto-comun.md`, para que todas las pantallas lo hereden:
- `theme.js`: verificar con un test (`utils/contraste.js`) que cada par texto/fondo y onPrimary/primary cumple ≥ 4,5:1 en ambos temas.
- Todo componente interactivo con `accessibilityRole`, `accessibilityLabel` (obligatorio si es solo ícono) y `accessibilityState` (disabled, selected, busy, checked), y un **anillo de foco visible** (estado `focused` vía `onFocus`/`onBlur`).
- `Input`/`Select`/`Textarea`: label visible obligatorio (prop `label`), `requerido` → `*`, `error` → mensaje debajo con ícono y `accessibilityLiveRegion="polite"`, `ayuda` → texto de ayuda.
- `Toast`: anunciado con `AccessibilityInfo.announceForAccessibility`, con acción opcional "Deshacer", y **descartable con swipe hacia la derecha o hacia arriba** (PanResponder + Animated, umbral por distancia o velocidad; izquierda y abajo no descartan). Conserva siempre la **X** para cerrarlo con teclado o lector de pantalla.
- `Modal`: atrapa el foco, se cierra con Escape/back y devuelve el foco al disparador.
- `ImagenEvento`: prop `alt` obligatoria (o `decorativa`).

## Tests (RN Testing Library)
Button (loading deshabilita y marca busy), Modal de confirmación, EstadoCompraBadge (texto por estado), Input (error con label y anuncio), contraste del theme, Login (muestra el error del back), AuthContext (restaura la sesión), AppNavigator (cada rol ve sus tabs).

## Criterios de aceptación
- [ ] Desde el celular: registro → login → tabs del rol → cerrar sesión → vuelve al login.
- [ ] Token vencido o inválido → vuelve al login con un toast.
- [ ] Modo oscuro funcionando en todos los componentes.
- [ ] Ningún componente usa `StyleSheet.create` ni estilos inline extensos: todo con styled-components/native.
