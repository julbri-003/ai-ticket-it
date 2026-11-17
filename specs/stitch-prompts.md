# Prompts para Stitch (en inglés)

Uso: en Stitch elegí **App (mobile)**. Pegá primero el **Prompt principal**: define el sistema de diseño y genera las primeras pantallas. Después pegá los **prompts por lote** en el mismo proyecto para que respeten el estilo. Stitch rinde mejor generando de a 3–5 pantallas por prompt que todo junto.

Exportá cada pantalla a `design/stitch/<nombre>/` (`code.html` + `screen.png`) usando los nombres entre corchetes.

**Claro y oscuro**: alcanza con exportar **todas en claro** y **en oscuro solo las representativas**, guardadas como `screen-dark.png` (y `code-dark.html` si está) en la misma carpeta: `componentes`, `explorar`, `detalle-evento`, `detalle-compra`, `chat` y `crear-evento`. El modo oscuro se arma con los tokens del theme, así que el agente lo deriva para el resto. Si en alguna pantalla Stitch hizo algo especial en oscuro que querés conservar, exportala también.

---

## Prompt principal

```
Design a mobile app called "AI Ticket It", an event ticketing platform where ORGANIZERS publish events (concerts, theatre, stand-up, festivals, sports, conferences, kids, dance) with several ticket types (e.g. General, Platea, VIP), each with its own price and capacity, and BUYERS discover events, save favourites, buy tickets, pay, cancel, chat with the organizer about each purchase and leave a star review after attending. All UI copy must be in Spanish (Argentina, "vos" form, prices in ARS like "$45.000,00", dates like "sáb 22 nov · 21:00").

VISUAL STYLE — "Velvet curtain": classic theatre (opera house velvet, gold details, ivory programmes) executed in a MODERN, clean, airy way. It must feel elegant and current, never old, worn or retro-kitsch.
- Modern ticket concept: purchase cards, event cards and stat cards are shaped like modern tickets — large rounded corners (16–18px), two semicircular notches cut into the top and bottom edges, and a dashed vertical line separating a narrow STUB on the right. The stub holds the key datum (countdown "FALTAN 5 días", price, or status) and a small serial number "Nº 004817". Soft shadow with a burgundy tint in light mode; 1px inner border in dark mode.
- Decorative typography: titles in "Playfair Display" (700), highlighting ONE word per title in italic with the accent color (e.g. "Tu próxima *función*", "Esta noche, *en escena*"). Body, data, buttons and pills in "Inter" (400/500/600). Section labels in uppercase Inter 600 with wide letter-spacing, preceded by a gold "✦" ornament (e.g. "✦ PRÓXIMAS FUNCIONES").
- Avoid anything that looks old: no paper texture, no grain, no sepia, no slab or typewriter fonts, no worn rubber stamps.
- Light ("ivory") and dark ("stalls") modes, generate both for every screen.
- Light mode: background ivory #faf7f2, cards #ffffff, subtle surface #f3ece4, ticket stub #fbf3ee, dividers #e6dcd0, input borders #8c7d80, text #1c1416 / #4a3a3e / muted #6b5a5e. Primary VELVET BURGUNDY #7a1e2c (primary buttons with white text, active tab, accent word in titles, ticket type name, countdown number, focus ring). Gold #8a6417 for labels and the ✦ ornament (decorative gold #b8892b only for thin rules, never text). Success #1f6b52, warning #8a5300, error #a3182b, info #1f3a5f.
- Dark mode: background #0f0b0d, cards #1d1417 with 1px border #3a2a2e, elevated #2a1a1f, input borders #7a6a64, text #f5efe6 / #d8ccc0 / muted #a8998f. The ticket STUB is filled with saturated velvet red #b3122c with white/cream text. Primary buttons are crimson #c8102e with white text and a cream (#f5efe6) focus ring. Accent words, ticket type names and highlights in saturated red #ff4757. Gold #d4af37 for labels, ✦ ornaments and secondary buttons (dark text #0f0b0d on gold). Success #6fc3a0, warning #e8b04a, error #ff8a8a, info #8fb3de. Use solid red fills ONLY for the stub, the primary button and the active tab, so dark mode is dramatic without being saturated everywhere.
- All listed text/background pairs were checked: every text color meets ≥4.5:1 on its background in its theme and filled buttons ≥5.9:1. Don't introduce lighter tints for text.
- Shapes: 16–18px radius on cards and sheets, 12px on inputs, fully rounded PILLS (9999px) for buttons, chips, filters, status badges and counters.
- Icons: Lucide-style outline icons, 1.75px stroke, in text color.
- Cards: generous padding, clear hierarchy (image → title in Playfair → meta row with icons → price/rating row → actions).

REUSABLE COMPONENTS (must look and behave identically on every screen):
- Pills: category pills, filter pills (selected = filled primary + check icon; unselected = outline), tagline pill with gold border and "✦".
- Purchase status badges as pills with tinted background + same-hue text + icon (never color alone). Light (text/bg): PENDIENTE #8a5300/#fbf0dc (clock), CONFIRMADA #1f6b52/#e7f2ec (check-circle), UTILIZADA #1f3a5f/#e6edf6 (ticket), CANCELADA #a3182b/#f9e3e5 (x-circle), REEMBOLSADA #8a6417/#f7efdc (rotate-ccw). Dark: PENDIENTE #e8b04a/#33270f, CONFIRMADA #6fc3a0/#16302a, UTILIZADA #8fb3de/#172433, CANCELADA #ff4757/#3a1219, REEMBOLSADA #d4af37/#2e2512.
- Search + filter bar: sticky search input with a visible label "Buscar eventos, lugares u organizadores", search icon, clear button and recent searches; below it a horizontal scroll of pills starting with a highlighted "✦ Para vos" toggle pill (recommendations based on the categories of the user's favourites; disabled state with hint when the user has no favourites), then "Todas" + category pills (multi-select), and a "Filtros" button with a counter badge. Applied filters show as removable pills (with ✕) under the bar plus "Limpiar todo".
- Filters bottom sheet: sort (Fecha / Precio / Puntaje del organizador / Relevancia) with asc/desc toggle, price range min–max, date range with shortcuts ("Este finde", "Este mes"), switch "Solo con entradas disponibles", minimum organizer rating pills (3+, 4+, 4,5+), "Limpiar" and "Aplicar (N resultados)".
- Image carousel for events with many images: swipeable, dot indicators + "3/8" counter pill, arrows visible on focus, full-screen viewer on tap.
- Pagination: numbered pagination pills (‹ 1 2 3 … 9 ›) under every long list (events, purchases, reviews, notifications), with the current page filled and a "Mostrando 1–10 de 87" muted caption.
- Messaging icon: a chat-bubble icon button with an unread counter pill, shown in the top app bar and on each purchase card that has unread messages. Notification bell with counter pill in the top app bar.
- Bottom tab bar per role. Buyer: Explorar, Mis compras, Favoritos, Mensajes, Perfil. Organizer: Mis eventos, Crear, Mensajes, Notificaciones, Perfil.
- Footer: at the end of the landing page and the explore screen, a footer with logo, short tagline, links (Cómo funciona, Para organizadores, Ayuda, Términos, Privacidad), a light/dark mode toggle and "© 2026 AI Ticket It".
- Feedback states for every list and action: skeleton loaders with shimmer (same shape as the real cards), empty states with an illustration-style icon, a message and a CTA, error states with "Reintentar", toasts (success / error / warning / info, icon + title + message + close button, top of screen), buttons with inline loading spinner.
- Confirmation modal for destructive or payment actions: title, explanation of consequences, amount when relevant, secondary "Volver" and primary/danger confirm button.
- Star rating component (read-only and input, half stars).
- Stat cards shaped like small modern tickets (notches, dashed line), big Playfair number and uppercase gold label.

ACCESSIBILITY (mandatory, design for it visibly):
- Minimum 4.5:1 contrast for all normal text and button labels in BOTH themes; 3:1 for large text, icons and input borders.
- Every form field has a visible label above it (never placeholder-only); required fields marked with "*" and a legend "* Obligatorio" at the top of the form.
- Errors appear directly under the field, in error color with an alert icon, and say what happened and how to fix it (e.g. "La fecha debe ser posterior a hoy. Elegí una fecha futura."). Fields in error get an error-colored border.
- Clearly visible focus state on every interactive element for keyboard navigation: 2px primary outline with 2px offset (never removed). Show at least one screen with a focused element.
- Logical focus order (top→bottom, left→right), skip-to-content link on the landing page.
- Touch targets at least 44×44.
- Informative images have alt text (show event image captions/descriptions in the design annotations); decorative images are marked decorative.
- Status is never conveyed by color alone: always icon + text.
- Destructive actions (cancel purchase, remove image, log out) ask for confirmation; removing a favourite shows an "Deshacer" toast.

Start by generating these screens, each in dark and light mode:
1. [landing] Landing / welcome page for logged-out users: hero with a large featured modern ticket (notches, red/ivory stub with "Nº 000001"), tagline pill ("✦ Tus entradas, sin filas"), big Playfair title with one italic accent word ("Esta noche, *en escena*"), subtitle, two CTAs ("Explorar eventos" primary, "Publicar mi evento" outline), a row of 4 stat cards (eventos activos, entradas vendidas, organizadores, puntaje promedio), "Próximos eventos" horizontal carousel of event cards, category grid with icons, a "Cómo funciona" 3-step section (Elegí → Pagá → Disfrutá) and a two-column section "Para compradores / Para organizadores" with checklists, featured reviews carousel, final CTA banner and the footer.
2. [login] Login: logo, email and password fields with visible labels, show/hide password, inline errors, primary button with loading state, link to register.
3. [registro] Register: name, surname, email, password with strength hint, and a role selector as two large selectable cards ("Quiero comprar entradas" / "Quiero organizar eventos") with radio semantics.
```

---

## Lote 2 — Comprador: explorar y comprar

```
Using exactly the same design system, components and accessibility rules of this project, generate these buyer screens in dark and light mode:
4. [explorar] Explore: top app bar with logo, chat icon with unread pill and bell with counter pill; a "Recomendados para vos" horizontal carousel at the top with the reason as subtitle ("Porque guardaste eventos de Recitales y Teatro") and "Ver todos" link, plus its empty variant ("Guardá eventos en favoritos y te recomendamos según lo que te gusta"); sticky search + filter bar ("✦ Para vos" pill, category pills, "Filtros" button with counter) and applied-filter pills; segmented control "Próximos | Anteriores"; result count as an uppercase gold label ("✦ 87 EVENTOS"); list of event cards (image with category pill overlay and heart favourite button, title, date + venue with icons, "desde $12.000", organizer name with stars); numbered pagination; footer. Also show the "Anteriores" variant where past event cards are greyed out (desaturated image, reduced opacity, "Finalizado" pill, no buy action) and the skeleton loading variant.
5. [filtros] Filters bottom sheet: sort options as radio pills (Fecha, Precio, Puntaje del organizador, Relevancia — only enabled with "Para vos") with asc/desc toggle, price range with two labelled numeric inputs and inline validation ("El mínimo no puede superar al máximo. Corregí alguno de los dos valores."), date range "Desde / Hasta" with shortcut pills ("Este finde", "Este mes"), switch "Solo con entradas disponibles", minimum organizer rating pills (3+, 4+, 4,5+), category pills multi-select, "Limpiar" and "Aplicar (24 resultados)". Also show the results state with "12 eventos para vos" and the applied-filter pills.
6. [detalle-evento] Event detail: image/video carousel with dots and "1/6" counter; category pill, title, date/time, venue, organizer card (avatar initials, name, stars 4.6, "128 reseñas"); description plus "Actualizaciones" list with dates; ticket types as selectable cards (name, description, price, "Quedan 12" pill, "Agotado" disabled state); quantity stepper limited by availability with helper text; sticky bottom bar with total and "Comprar" button; organizer reviews section with rating summary (average + distribution bars), review cards (stars, comment, buyer name, ticket type, event name, date) and pagination.
7. [checkout] Checkout: order summary card, countdown pill "Tenés hasta el lun 18/11 15:30 para pagar", "Pagar" primary button and "Pagar más tarde" ghost button; plus the confirmation modal "¿Confirmás el pago de $45.000,00?" with Volver / Pagar and the success toast.
```

## Lote 3 — Comprador: compras, chat, favoritos

```
Same design system and accessibility rules. Generate in dark and light mode:
8. [mis-compras] My purchases: status filter pills with counters (Todas 12, Pendientes 1, Confirmadas 4, Utilizadas 5, Canceladas 1, Reembolsadas 1); purchase cards with event image, name, date, "VIP × 2", total, status badge pill and a contextual highlight: CONFIRMADA → large "Faltan 5 días" countdown chip; PENDIENTE → "Pagá antes del 18/11" warning + "Pagar" button; CANCELADA → "Reembolso en proceso hasta el 17/11"; UTILIZADA → "Calificar" button; chat icon with unread counter; pagination; empty state "Todavía no compraste entradas" with "Explorar eventos" CTA.
9. [detalle-compra] Purchase detail: header with status badge and countdown, event mini-card, purchase data table (tipo, cantidad, precio unitario, total, fecha de compra), vertical timeline of state changes (icon per state, date-time, who: "Vos" / "Organizador" / "Sistema", detail text like "Pago confirmado por $45.000,00"), actions: "Abrir chat", "Cancelar compra" (danger outline) and the cancel confirmation modal explaining refund within 24h.
10. [chat] Purchase chat: header with event name, ticket type and status pill; message bubbles (mine right in primary container, theirs left in surface with name + role pill), day separators, "enviando…" and failed "Reintentar" states, input with visible label (visually-hidden is OK only if the send button has an accessible name), character counter "0/1000", send icon button disabled when empty, a "Reconectando… (modo sin conexión en tiempo real)" banner variant.
11. [mensajes] Conversations inbox: list of purchase conversations with event image, last message preview, time, unread counter pill, status pill; pagination.
12. [calificar] Review modal: half-star rating input with labelled value ("4,5 de 5"), optional comment textarea with label and counter, inline error if no rating, "Enviar reseña".
13. [favoritos] Favourites: same event cards, past ones greyed out, remove with "Deshacer" toast.
14. [notificaciones] Notifications: unread highlighted with dot and bold title, icon per type (ticket, chat, refund, star, calendar), relative time, "Marcar todas como leídas", pagination, empty state.
```

## Lote 4 — Organizador

```
Same design system and accessibility rules. Generate the ORGANIZER screens in dark and light mode:
15. [mis-eventos] My events dashboard: greeting, 4 ticket-stub stat cards (eventos activos, entradas vendidas, recaudación confirmada, puntaje promedio ★4,6), warning banner "2 reembolsos pendientes · vence en 5 h" with link; segmented "Próximos | Anteriores"; event cards with occupancy progress bar (vendidas / cupo), status counters as small pills (3 pendientes, 40 confirmadas, 2 canceladas), "Ver compras" and "Editar" buttons; anteriores greyed; pagination; floating "Crear evento" button.
16. [crear-evento] Create event as a 4-step form with a step indicator (Datos → Entradas → Multimedia → Revisión). Step 1: labelled fields (nombre*, categoría* select, fecha y hora* picker, lugar*, descripción* textarea) with inline errors. Step 2: dynamic list of ticket-type cards (nombre*, descripción, precio*, cupo*) with "Agregar tipo de entrada" and remove buttons, duplicate-name error. Step 3: media uploader grid with thumbnails, alt-text field per image, remove (with confirmation) and "Agregar fotos o videos", size/type helper text. Step 4: review summary and a warning callout "Una vez publicado no vas a poder editar la descripción original ni eliminar tipos de entrada", "Publicar evento" with upload progress.
17. [editar-evento] Edit event (restricted editing): media section fully editable with carousel + add/remove; ticket types shown read-only with sold/available bars plus "Agregar tipo de entrada" (opens modal); original description read-only with a lock icon, list of dated updates and "Agregar actualización" textarea; other fields disabled with lock icon and helper "No editable una vez publicado".
18. [compras-evento] Event purchases: header with event mini-card; per-ticket-type availability cards (name, price, progress bar, big "Quedan 18 de 100"); totals row (recaudado, reembolsos pendientes); filter pills by status with counters; purchases table-like list (buyer name, tipo × cantidad, total, date, status pill, chat icon with unread counter); for CANCELADA with pending refund: "Reembolsar" button and caption "Reembolso automático el 17/11 14:00"; refund confirmation modal with amount and buyer; pagination.
19. [perfil] Profile (both roles): avatar initials, name, role pill, email, theme selector (Sistema / Claro / Oscuro as segmented pills), organizer rating summary when role is organizer, "Cerrar sesión" with confirmation.
```

## Lote 5 — Estados y componentes (hoja de referencia)

```
Same design system. Create one reference board screen [componentes] in dark and light mode showing all reusable components side by side with their states: buttons (primary, secondary, outline, ghost, danger × default, focused with visible focus ring, pressed, disabled, loading), inputs (empty, filled, focused, error with message, disabled, required marker), select, textarea with counter, pills (category, filter selected/unselected, status badges for the 5 purchase states), cards, stat card, skeletons (event card, purchase card, detail), empty state, error state with retry, 4 toast variants, confirmation modal, pagination, carousel with dots, star rating, chat bubble, tab bar with badge, top app bar with chat and bell counters, footer.
```

---

## Prompt de corrección (para pantallas ya generadas)

Usalo en el proyecto de Stitch donde ya tenés pantallas con el estilo anterior. Pegalo tal cual. Si Stitch cambia demasiado una pantalla, repetilo pantalla por pantalla agregando al final: "Apply only to the [nombre] screen".

```
Restyle ALL existing screens of this project with the new "Velvet curtain" visual direction. Keep every screen's structure, content, Spanish copy, components, layout order, navigation and accessibility features exactly as they are — change only the visual style described below. Generate light and dark versions of each screen.

GOAL: classic theatre (velvet, gold, ivory) executed in a MODERN, airy, elegant way. Remove everything that looks old or worn.

REMOVE: paper/grain textures, cream-yellow backgrounds, sepia/espresso browns, slab and typewriter/monospace fonts, rubber stamps, double-rule borders, navy as primary color, brick red, bottle green as a decorative color.

TYPOGRAPHY:
- Titles: "Playfair Display" 700. In each main title highlight ONE word in italic with the accent color (e.g. "Tu próxima *función*", "Esta noche, *en escena*", "Mis *entradas*").
- Everything else (body, data, prices, buttons, pills, inputs): "Inter" 400/500/600.
- Section labels: uppercase Inter 600, wide letter-spacing, preceded by a gold "✦" (e.g. "✦ PRÓXIMAS FUNCIONES").

MODERN TICKET SHAPE (keep the ticket concept, modernized):
- Event cards, purchase cards and stat cards become modern tickets: 16–18px rounded corners, two semicircular notches cut into the top and bottom edges, and a dashed vertical line separating a narrow STUB on the right.
- The stub holds the key datum: countdown ("FALTAN · 5 · días") on confirmed purchases, price ("desde $12.000") on event cards, the status on other purchases; plus a small serial "Nº 004817".
- Light mode: white card on ivory, soft burgundy-tinted shadow, stub background #fbf3ee. Dark mode: card #1d1417 with 1px border #3a2a2e, stub filled with velvet red #b3122c and white/cream text.

COLORS — LIGHT ("ivory"):
background #faf7f2 · cards #ffffff · subtle #f3ece4 · dividers #e6dcd0 · input borders #8c7d80
text #1c1416 · secondary #4a3a3e · muted #6b5a5e
primary velvet burgundy #7a1e2c (filled buttons with white text, active tab, accent italic word, ticket type name, countdown, focus ring)
gold #8a6417 for labels and ✦ (decorative gold #b8892b only for thin rules, never for text)
success #1f6b52 · warning #8a5300 · error #a3182b · info #1f3a5f

COLORS — DARK ("stalls"):
background #0f0b0d · cards #1d1417 · elevated #2a1a1f · borders #3a2a2e · input borders #7a6a64
text #f5efe6 · secondary #d8ccc0 · muted #a8998f
primary buttons crimson #c8102e with white text and a cream #f5efe6 focus ring
ticket stub #b3122c with white/cream text
accent italic word, ticket type names and highlights in saturated red #ff4757
gold #d4af37 for labels, ✦ and secondary buttons (text #0f0b0d on gold)
success #6fc3a0 · warning #e8b04a · error #ff8a8a · info #8fb3de
Solid red fills ONLY on the stub, the primary button and the active tab.

STATUS PILLS (tinted background + same-hue text + icon), light text/bg — dark text/bg:
PENDIENTE #8a5300/#fbf0dc — #e8b04a/#33270f (clock)
CONFIRMADA #1f6b52/#e7f2ec — #6fc3a0/#16302a (check-circle)
UTILIZADA #1f3a5f/#e6edf6 — #8fb3de/#172433 (ticket)
CANCELADA #a3182b/#f9e3e5 — #ff4757/#3a1219 (x-circle)
REEMBOLSADA #8a6417/#f7efdc — #d4af37/#2e2512 (rotate-ccw)

SHAPES: cards and bottom sheets 16–18px radius, inputs 12px, buttons/chips/filters/badges/counters fully rounded pills. Generous spacing. Lucide outline icons 1.75px in text color.

KEEP: ≥4.5:1 text contrast (all colors above are already verified — don't lighten them), visible labels, inline errors, visible focus rings, alt text, icon + text for status, confirmation modals, skeletons, toasts, pagination, carousels, filter bar, "✦ Para vos" pill, chat and bell counters, footer.
