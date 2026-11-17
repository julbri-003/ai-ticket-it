# Iteración 07c — Detalles de "Telón de terciopelo" en Explorar, Mensajes y Mis eventos

> Leé antes `00-contexto-comun.md` (paleta, accesibilidad, iOS/Android) y `07b-front-landing-detalles.md`: esta iteración **reutiliza** lo que la 07b dejó en `components/ui/Teatro.jsx`, `useMovimientoReducido`, `useContador` e `iconosCategoria`.
> Requiere 07b, 08, 09 y 10. No cambia flujos ni endpoints.

## Objetivo
Llevar al resto de la app el lenguaje visual que estrenó la landing (marquesina, chip de talón, sellos, ornamentos, contadores y entradas suaves), para que Explorar, Mensajes y Mis eventos se sientan parte de la misma obra. Igual que en la 07b: **no se agregan secciones ni se cambian flujos**, todo funciona en claro y oscuro, en iOS y Android, y respeta "Reducir movimiento".

Como los cambios de la sección 1 son en componentes compartidos, también llegan a Favoritos, Mis compras y Notificaciones (estados vacíos, tarjetas). Eso es esperado; verificá que sus tests sigan pasando.

Referencias visuales: `design/stitch/explorar/`, `design/stitch/mensajes/` y `design/stitch/mis-eventos/` (claro y `alt/`). Tomá la jerarquía y los adornos, **no** contenido inventado.

## Alcance

### 1. Piezas compartidas
- **`ChipFecha`** (`components/eventos/ChipFecha.jsx`): sacá el chip de talón de la landing ("22 / NOV", día en Playfair y mes en versalitas) a un componente reutilizable. Es decorativo: la fecha ya está en el label de la tarjeta. La landing pasa a usarlo sin cambios visibles.
- **Datos del chip y del badge**: `aEvento` (`eventosService`) suma `quedanPocas`, `dia` y `mes` con la misma lógica de `publicoService` (`quedanPocasEntradas`, sin duplicarla). No cambia el back.
- **Tarjetas que se hunden**: `TicketCard` con `onPress` escala a 0,97 al presionar y vuelve (`Animated`, driver nativo). Con "Reducir movimiento" no escala; el feedback queda en la opacidad que ya tiene.
- **Entrada escalonada de listas**: componente `ListaEscalonada` en `components/ui` que hace aparecer sus hijos con fade y subida de 12 px, con 60 ms de diferencia entre uno y otro. Solo anima **la primera vez** que se carga la lista y **los primeros 6 ítems**; al paginar, refrescar o cambiar de pestaña los ítems aparecen directo. Con "Reducir movimiento" no anima.
- **Estado vacío con telón cerrado**: `EmptyState` suma una escena decorativa detrás del ícono: dos paños de telón cerrados en miniatura (reutilizá el dibujo de `ConTelon`, sin animación) y un `Ornamento` debajo del título. El ícono va dentro de un aro `goldOrnament`. Aplica a todos los estados vacíos de la app. `ErrorState` **no** cambia: un error no es una escena.
- **Iniciales**: mové `iniciales()` de la landing a `utils/textos.js` para reutilizarla en Mensajes.

### 2. Explorar
- **Contador de resultados en marquesina**: el texto "13 eventos" (o "13 eventos para vos") va dentro de una `Marquesina` compacta (lamparitas de 6 px, una fila arriba y otra abajo). Sigue siendo el `header` con `accessibilityLiveRegion="polite"` y el `testID="cantidad-resultados"`; las lamparitas son decorativas y se pausan sin foco.
- **Tarjetas** (`TarjetaEvento`): `ChipFecha` sobre la imagen y badge **"Últimas entradas"** (variante `warning`) cuando `quedanPocas`. Va también en el `accessibilityLabel`. No se muestra en eventos anteriores, cancelados ni agotados.
- **Para vos**: el título del carrusel de recomendados lleva un `Reflector` chico detrás (mismo token `reflector`, contraste ya testeado) y cada tarjeta del carrusel un `Sello` "Para vos" (decorativo, el carrusel ya dice que es para vos).
- **Lista**: `ListaEscalonada` para los resultados. Un `Ornamento` separa el carrusel del buscador (solo si se muestra el carrusel).
- **Sin resultados**: el `EmptyState` con telón cerrado de la sección 1.

### 3. Mensajes
- **Encabezado**: debajo del título, una línea "N sin leer" en `accentText` cuando hay mensajes sin leer en la página (suma de `noLeidos`), con `useContador`. El label lleva el valor final. Si no hay, no se muestra.
- **Agrupar por fecha**: las conversaciones se agrupan bajo encabezados "Hoy", "Ayer", "Esta semana" y "Antes", con un `Ornamento` chico al costado del texto. Los encabezados son `header` accesibles. Extraé la lógica a `agruparConversaciones(items, ahora)` en `mensajesService` (puro, testeable). Para eso `aConversacion` suma `enviado` (fecha ISO del último mensaje).
- **Fila de conversación** (`ItemConversacion`):
  - Avatar circular con las **iniciales** de la otra persona, superpuesto a la esquina inferior derecha de la miniatura del evento (fondo `surfaceSubtle`, borde `surface` de 2 px, texto `textPrimary`). Decorativo: el nombre ya está en el label.
  - Si hay mensajes sin leer, una **cinta dorada** de 3 px en el borde izquierdo de la tarjeta (`goldOrnament`) además del contador y la negrita que ya tiene. Así el estado no depende solo del color.
  - Cuando llega un mensaje nuevo por socket, el contador de esa conversación hace un **pulso único** (escala 1 → 1,15 → 1 en 300 ms). No hay bucles. Con "Reducir movimiento" no pulsa.
- **Lista**: `ListaEscalonada` solo en la primera carga, no cada vez que se recarga por socket.
- **Vacío**: `EmptyState` con telón cerrado.

### 4. Mis eventos (organizador)
- **Cabecera como marquesina**: "Tu cartelera / Mis eventos" va dentro de una `Marquesina` (es literalmente la cartelera del organizador). El botón "Crear" y el `Rating` quedan afuera, debajo.
- **Resumen que cuenta**: tres stat cards chicas antes de los segmentos, con `useContador` y label con el valor final:
  - "Entradas vendidas" (suma de `vendidasTotal` de los próximos),
  - "Ocupación promedio" (porcentaje sobre el cupo total de los próximos, sin decimales),
  - "Reembolsos pendientes" (suma de los pendientes de todos los eventos; si es > 0, el valor va en `error`).
  Extraé el cálculo a `resumenOrganizador(eventos)` en `organizadorService` (puro, testeable). Si no hay eventos, no se muestra.
- **Tarjeta** (`TarjetaEventoOrganizador`):
  - `ChipFecha` sobre la miniatura.
  - Chip **"Faltan N días"** / "Mañana" / "Hoy" en los próximos (texto `textSecondary`, ícono `Hourglass`). Helper puro `faltanTexto(fecha, ahora)` en `utils/fechas.js`. Va también en el label.
  - **Barra de ocupación que se llena**: `BarraOcupacion` anima el relleno de 0 al valor en 800 ms la primera vez (`scaleX` con `transformOrigin` a la izquierda, driver nativo). El texto "45/100 · 45 %" y el `accessibilityValue` siempre muestran el final.
  - **Sello "Sala llena"** (dorado, rotado −8°) cuando la ocupación es 100 %, y badge "Últimas entradas" cuando quedan ≤ 10 % (misma regla que el comprador). El estado va en el label; el sello es decorativo.
  - **Cancelados**: sello "Cancelado" en `estados.CANCELADA.texto` con borde doble, en diagonal sobre la miniatura. Decorativo (el badge y el label ya lo dicen). Verificá ≥ 4,5:1 sobre `surface` en ambos temas.
- **Lista**: `ListaEscalonada` al cargar y al cambiar de segmento solo la primera vez que se abre cada uno.
- **Vacío**: `EmptyState` con telón cerrado (los tres textos de hoy no cambian).

## Decisiones de la implementación
- `TicketCard` se hunde por sí mismo cuando tiene `onPress` (`useHundir` en `Teatro.jsx`): lo heredan todas las tarjetas de la app sin cambiar cada pantalla.
- `ListaEscalonada` decide qué anima en su primer render con ítems y lo recuerda por `key`: lo que llega después (otra página, recarga por socket) aparece directo. En Mis eventos cada segmento es una lista con `key` propia y `animar` solo la primera vez que se abre.
- "N sin leer" y el resumen de Mis eventos cuentan desde 0 solo con el primer valor; si cambia (llega un mensaje, se recarga), se muestra el nuevo directo.
- El sello "Sala llena" va en la fila de badges (no flotando) para no tapar el nombre del evento. `Sello` suma `variante="cancelado"`, `chico`, `style` y fondo `surface` para leerse también sobre imágenes.
- `quedanPocas` del organizador se calcula con vendidas/cupo (su DTO trae vendidas); `salaLlena` y `faltanTexto` no aplican a cancelados.
- El reflector y el sello "Para vos" van solo en el carrusel con recomendaciones (no en la tarjeta vacía "Recomendados para vos").

## Fuera de alcance
Chat, detalle de evento, checkout, crear/editar evento, perfil y notificaciones (salvo lo que llegue por los componentes compartidos). Si se quieren detalles ahí, va en otra iteración.

## Reglas transversales
Las mismas de la 07b, en particular:
- **Movimiento reducido**: todo consulta `useMovimientoReducido()`. Las únicas animaciones en bucle son las lamparitas y se pausan sin foco (`useIsFocused`).
- **Decorativos fuera del lector**: chip de fecha, sellos, avatar de iniciales, cinta, telón del vacío, reflector, lamparitas y ornamentos usan `DECORATIVO`. Lo que comunican (fecha, "Últimas entradas", "Sala llena", "Cancelado", sin leer) tiene que estar en el label o en texto visible accesible. El orden de lectura no cambia, salvo los encabezados de fecha en Mensajes y el resumen en Mis eventos.
- **Rendimiento**: `Animated` con `useNativeDriver: true`. Nada de `setInterval`. `ListaEscalonada` no anima más de 6 ítems ni vuelve a animar lo ya mostrado. Probá el scroll de Explorar con 20 resultados en un Android de gama media.
- **Tokens**: no hay colores sueltos. Si hace falta uno nuevo, se define en claro y oscuro con su par de contraste en `theme.test` y se documenta en `00-contexto-comun.md`.
- **Sin dependencias nuevas.**

## Tests
- Helpers puros: `faltanTexto` (hoy, mañana, N días, fecha pasada → `null`), `resumenOrganizador` (sin eventos, con cancelados y anteriores que no suman a vendidas/ocupación, cupo 0), `agruparConversaciones` (bordes de "Ayer" y "Esta semana", orden de los grupos, grupos vacíos que no aparecen), `aEvento` con `quedanPocas` / `dia` / `mes`, `iniciales` desde `utils/textos`.
- `ListaEscalonada`: con movimiento reducido muestra todo de entrada; no anima más de 6; al cambiar los hijos no vuelve a animar.
- `EmptyState`: el telón y el ornamento no están en el árbol de accesibilidad y el título sigue siendo `header`.
- Explorar: "Últimas entradas" aparece solo con `quedanPocas` y no en anteriores, cancelados ni agotados; el contador sigue con `cantidad-resultados` y live region; los decorativos están ocultos (`includeHiddenElements: false`).
- Mensajes: encabezados de fecha como `header`; "N sin leer" con el label final; la cinta y el avatar ocultos al lector.
- Mis eventos: el resumen muestra los valores finales con movimiento reducido y sus labels; "Sala llena", "Faltan N días" y "Cancelado" están en el label de la tarjeta; la barra mantiene `accessibilityValue` final.
- `theme.test`: par del sello "Cancelado" sobre `surface`.
- Todos los tests existentes siguen pasando (incluidos los de la landing después de mover `ChipFecha` e `iniciales`).

## Criterios de aceptación
- [x] `ChipFecha`, tarjetas que se hunden, `ListaEscalonada` y estado vacío con telón cerrado, reutilizados en toda la app.
- [x] Explorar: contador en marquesina, chip de fecha, "Últimas entradas", reflector y sello en "Para vos".
- [x] Mensajes: "N sin leer" animado, agrupado por fecha, avatar con iniciales, cinta de no leídos y pulso al llegar un mensaje.
- [x] Mis eventos: cabecera en marquesina, resumen que cuenta, "Faltan N días", barra que se llena, sellos "Sala llena" y "Cancelado".
- [x] Con "Reducir movimiento" no hay ninguna animación y todo se ve en su estado final.
- [ ] Lector de pantalla (TalkBack y VoiceOver): no lee decorativos y los estados que transmiten están en los labels.
- [ ] Probado en un celular Android y en iOS (o simulador) en claro y oscuro, sin tirones al scrollear Explorar.
- [x] Lint y tests de front en verde. Fila agregada en `trazabilidad.md` (tabla C) con evidencia.
