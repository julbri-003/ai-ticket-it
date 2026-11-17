# Iteración 07b — Landing con detalles de "Telón de terciopelo"

> Leé antes `00-contexto-comun.md` (paleta, accesibilidad, iOS/Android y "Cómo usar los diseños de design/stitch/").
> Se puede correr en cualquier momento después de la 07: no depende de 08, 09 ni 10 ni las bloquea.

## Objetivo
La landing (`features/home/Landing.jsx`) ya tiene todas sus secciones. Esta iteración **no agrega secciones ni cambia flujos**: suma detalles visuales y microinteracciones que refuerzan la identidad de teatro clásico modernizado y el concepto de entrada. Todo lo que se agregue tiene que funcionar en claro y oscuro, en iOS y Android, y respetar "Reducir movimiento".

Referencia visual: `design/stitch/landing/screen.png` (claro) y `screen-dark.png` (oscuro). Tomá de ahí la jerarquía y los adornos, **no** el contenido inventado (QR antifraude, AFIP, WhatsApp, "nominadas", comisiones, cupones de descuento, links legales que no existen).

## Alcance

### 1. Telón y reflector en el hero
- **Telón decorativo** arriba del hero: dos paños de terciopelo con pliegues (SVG con `react-native-svg`, ya instalado) y una cenefa con flecos dorados. Color `primary` en claro y el rojo talón `#b3122c` en oscuro.
- **Apertura del telón** al montar la pantalla: los paños se corren hacia los costados en ~900 ms con `Animated` de React Native (driver nativo) y quedan como marco lateral angosto. Corre **una sola vez** por montaje.
- **Reflector**: un halo radial suave (`RadialGradient` del SVG, opacidad del token `reflector`: 0,18 en claro y 0,08 en oscuro) detrás del título del hero. No puede bajar el contraste del texto: el título y el párrafo siguen ≥ 4,5:1 medidos sobre el color más claro del halo.

### 2. Ticket del hero más "entrada"
- **Sello** dorado rotado (−8°) en la esquina superior derecha del ticket: "Estreno" en Playfair itálica, con borde doble. Es decorativo.
- **Perforación** entre cuerpo y talón: línea de círculos pequeños (no guiones) alineada con las muescas que ya tiene `TicketCard`. Si hace falta, agregá una prop `perforacion="puntos" | "guiones"` a `TicketCard` con `"guiones"` por defecto, para no cambiar el resto de la app.
- **Numeración** del talón con tipografía tabular (`fontVariant: ["tabular-nums"]`).

### 3. Fila de garantías debajo del hero
Tres "pills" en fila con scroll horizontal si no entran, cada una con ícono `lucide-react-native` y texto **verdadero para esta app**:
- `ShieldCheck` "Reembolso si se cancela el evento"
- `Clock` "48 h para pagar tu reserva"
- `MessageCircle` "Chat directo con el organizador"

### 4. Estadísticas que cuentan
- Los valores de las stat cards **cuentan desde 0** hasta el valor real en ~1,2 s (easing out) cuando la grilla entra en pantalla por primera vez.
- Formato con separador de miles `es-AR` ("1.240"). El puntaje se anima con un decimal y coma.
- El `accessibilityLabel` siempre lleva el **valor final**, nunca el intermedio. Con "Reducir movimiento" se muestra el valor final directamente.
- Extraé la lógica a un hook puro `useContador(valorFinal, { duracion, activo })` en `src/hooks/` para poder testearlo.

### 5. Cartelera como marquesina
- El encabezado "Próximos eventos" va dentro de una **marquesina**: un rectángulo con borde de lamparitas (círculos dorados de 6 px) que **titilan** suavemente, de forma escalonada, con opacidad entre 0,55 y 1 y un ciclo de 2,4 s. Con "Reducir movimiento" quedan fijas y encendidas.
- Agregá a la derecha un link "Ver todos" → Login (mismo destino que las tarjetas). Tiene que ser un botón accesible con `accessibilityRole="link"` y un área táctil ≥ 44×44.
- En cada tarjeta, la fecha pasa a un **chip de talón** sobre la imagen: día grande en Playfair y mes abreviado en versalitas ("22 / NOV").
- Badge **"Últimas entradas"** (variante `warning`) cuando quedan ≤ 10 % del cupo total del evento y no está agotado. El DTO del buscador ya trae `cupo` y `disponibles` por tipo: se calcula en el front con `quedanPocasEntradas` (`publicoService`), sin cambios en el back.

### 6. Categorías con identidad
- Cada categoría tiene un **ícono propio** según su nombre. Usá un mapa en `src/components/eventos/iconosCategoria.js` (por ejemplo: Recitales → `Music`, Teatro → `Drama`, Stand Up → `Mic`, Festivales → `PartyPopper`, Deportes → `Trophy`, Conferencias → `Presentation`, Infantiles → `Baby`, Danza → `Footprints`) con `Clapperboard` como respaldo. El mismo mapa se reutiliza en la `BarraFiltros` de Explorar.
- Debajo del nombre, la **cantidad de eventos activos** ("12 eventos", "1 evento", "Próximamente" si es 0). Agregá `eventosPorCategoria: { [categoriaId]: number }` a `GET /api/resumen-publico` con test de integración. No cambies `GET /api/categorias`.
- Al presionar, la tarjeta se hunde levemente (`scale 0.97`) y vuelve. Sigue llevando al Login.

### 7. "¿Cómo funciona?" como recorrido
- Los tres pasos quedan unidos por una **línea vertical perforada** (círculos pequeños, color `divider`) que va de un número al siguiente.
- Cada número lleva un aro dorado (`goldOrnament`) alrededor del círculo `primary`. El dorado no va como texto sobre `primary` porque no llega a 4,5:1.

### 8. Reseñas como críticas de diario
- Cada reseña lleva comillas tipográficas grandes (“ ”) en dorado y Playfair, **decorativas** (`accessible={false}`), y el texto en itálica.
- Avatar circular con las **iniciales** del autor (fondo `surfaceSubtle`, texto `textPrimary`).
- Pie: "— Martín G. · Noche de Jazz en el Sótano" en versalitas pequeñas.

### 9. Banner final en terciopelo
- Fondo `primary` con una textura de pliegues sutil (SVG, opacidad ≤ 0,08) y un fleco dorado en el borde inferior.
- Título en `onPrimary` con la palabra destacada en dorado. Verificá ≥ 4,5:1 del dorado sobre `primary` en ambos temas. Si no llega, la palabra destacada va en `onPrimary` subrayada en dorado.
- El botón "Crear mi cuenta" pasa a variante invertida (fondo `onPrimary`, texto `primary`).

### 10. Ornamentos y entrada de secciones
- Componente `Ornamento` en `components/ui` (✦ ──── ✦ en dorado, decorativo) entre secciones principales. Que no haya dos ornamentos seguidos ni uno pegado al footer.
- Cada sección aparece con **fade + subida de 12 px** la primera vez que entra en pantalla (`onLayout` + posición de scroll, componente `Revelar`). Con "Reducir movimiento" aparece directamente.
- **Barra superior fija**: la marca y "Ingresar" quedan arriba al scrollear. A partir de 24 px de scroll se le agrega fondo `surface` y una sombra suave.
- **Marca**: ícono `Ticket` dorado rotado −12° a la izquierda del wordmark "AI Ticket It". El conjunto es un `header` accesible con el nombre de la app.

### 11. Footer con secciones
El `Footer` acepta grupos opcionales `secciones=[{ titulo, links }]`. En la landing quedan:
- **Plataforma**: "¿Cómo funciona?" (hace scroll hasta esa sección), "Para organizadores" (scroll a "Pensado para todos"), "Próximos eventos" (scroll a la cartelera).
- **Cuenta**: "Ingresar", "Crear cuenta", "Publicar un evento".

Explorar sigue usando el footer simple, sin cambios.

## Reglas transversales
- **Movimiento reducido**: un hook `useMovimientoReducido()` que usa `AccessibilityInfo.isReduceMotionEnabled()` y escucha `reduceMotionChanged`. Todas las animaciones de esta spec lo consultan. Las animaciones en bucle (lamparitas) son las únicas infinitas y se pausan cuando la pantalla pierde el foco (`useIsFocused`).
- **Decorativos fuera del lector**: telón, reflector, sello, perforaciones, lamparitas, comillas y ornamentos llevan `accessible={false}` e `importantForAccessibility="no-hide-descendants"`. El orden de lectura de la landing no cambia respecto de hoy, salvo por "Ver todos" y la fila de garantías.
- **Rendimiento**: animaciones en el hilo de UI (`Animated` con `useNativeDriver: true`). Se eligió en lugar de reanimated porque no necesita mocks extra en Jest. El contador usa `requestAnimationFrame` porque solo cambia un texto. Nada de `setInterval` para animar. Los SVG grandes se memoizan. La landing tiene que seguir scrolleando fluido en un Android de gama media. Probalo en el celular.
- **Tokens**: se agregaron `velvet`, `velvetShade`, `onVelvet`, `goldOnVelvet` y `reflector` en claro y oscuro, con contraste testeado en `theme.test` (incluido el texto sobre el halo). No agregues colores sueltos. Si hace falta uno nuevo (por ejemplo `gold` con transparencia), definilo en el theme claro y oscuro y documentá su contraste en `00-contexto-comun.md`.
- **Sin dependencias nuevas**: alcanzan `react-native-svg`, `Animated` de React Native y `lucide-react-native`.

## Tests
- `useContador`: arranca en 0, termina en el valor final, con `activo=false` devuelve el final de entrada y no rompe con `null`.
- `useMovimientoReducido`: con el mock en `true`, la landing muestra los valores finales y las lamparitas no animan.
- `iconosCategoria`: cada categoría del seed tiene ícono propio y una desconocida cae en `Clapperboard`.
- Landing: "Ver todos" navega a Login; los links del footer hacen scroll (mock de `scrollTo`) y los de cuenta navegan; las tarjetas de categoría muestran "N eventos" / "Próximamente"; "Últimas entradas" aparece solo con ≤ 10 % y no si está agotado; los elementos decorativos no aparecen en el árbol de accesibilidad (`queryByLabelText` / `toBeOnTheScreen` con `includeHiddenElements: false`).
- Back: `GET /api/resumen-publico` devuelve `eventosPorCategoria` coherente con los eventos activos del seed. Si se agregó `quedanPocas`, cubrí los casos borde (exactamente 10 %, agotado, varios tipos).
- Todos los tests existentes siguen pasando.

## Criterios de aceptación
- [x] Telón que se abre una vez, reflector, sello "Estreno" y perforación de puntos en el hero, en claro y oscuro.
- [x] Fila de garantías con textos verdaderos para la app.
- [x] Contadores animados con label accesible del valor final.
- [x] Marquesina con lamparitas, "Ver todos", chip de fecha y badge "Últimas entradas".
- [x] Categorías con ícono propio, cantidad de eventos y feedback al presionar. El mapa de íconos se reutiliza en Explorar.
- [x] Pasos unidos por línea perforada, reseñas estilo crítica y banner final en terciopelo con contraste verificado.
- [x] Ornamentos, entrada de secciones, barra superior fija con sombra y marca con ícono.
- [x] Footer con secciones y scroll a anclas.
- [x] Con "Reducir movimiento" no hay ninguna animación y todo se ve en su estado final.
- [ ] Lector de pantalla (TalkBack y VoiceOver): no lee ningún decorativo y el orden es lógico.
- [ ] Probado en un celular Android y en iOS (o simulador) en claro y oscuro, sin tirones al scrollear.
- [x] Lint y tests de front y back en verde. Fila agregada en `trazabilidad.md` (tabla C) con evidencia.
