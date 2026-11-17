# 08 — Front comprador

## Objetivo
Todas las pantallas del comprador (casos de uso 1, 3, 7, 9, 10, 11 y 12, más favoritos), salvo el chat (iteración 10).

## Leer antes
`REPO_REF/packages/frontend/src/features/projects/ProjectExplorer.jsx`, `ProjectDetail.jsx`, `features/colaborador/MisProyectos.jsx`, `service/proyectosService.js` (patrón de mapeo DTO → modelo de UI).
Si existen: `design/stitch/{explorar,detalle-evento,checkout,mis-compras,detalle-compra,favoritos}/`.

## Service layer
`apis/{eventos,categorias,compras,favoritos,resenias}Api.js` + `{eventos,compras,favoritos}Service.js`, que mapean los DTOs a modelos de UI (fechas formateadas en es-AR, montos con `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })`, textos de estado, etc.). `utils/fechas.js` con `diasRestantesTexto(n)`: "Hoy", "Mañana", "Faltan N días".

## Pantallas

### Explorar (`features/eventos/Explorar`)
- **Carrusel "Recomendados para vos"** arriba de todo (solo comprador): `GET /eventos/recomendados`, con el `motivo` como subtítulo ("Porque guardaste eventos de Recitales y Teatro") y "Ver todos", que activa el filtro Para vos. Sin favoritos: tarjeta de estado vacío "Guardá eventos en favoritos y te recomendamos según lo que te gusta". Con sesión de organizador o sin sesión, no se muestra.
- **Buscador**: input con label visible ("Buscar eventos, lugares u organizadores"), ícono, botón limpiar, debounce de 400 ms y búsquedas recientes (últimas 5, guardadas localmente, borrables).
- **Barra de filtros** (pills horizontales, sticky): primero la pill **"✦ Para vos"** (toggle; deshabilitada con hint si no hay favoritos), después "Todas" + categorías (multi-selección) y al final el botón **Filtros** con contador de filtros activos.
- **Bottom sheet de Filtros** (`components/eventos/PanelFiltros`): orden (Fecha / Precio / Puntaje del organizador / Relevancia, esta última solo con Para vos) + dirección; rango de precio (mín/máx con validación inline); rango de fechas (desde/hasta, con atajos "Este finde", "Este mes"); switch "Solo con entradas disponibles"; puntaje mínimo del organizador (pills 3+, 4+, 4,5+). Botones "Limpiar" y "Aplicar (N resultados)" (conteo en vivo con `limite=1`).
- **Pills de filtros aplicados** debajo de la barra, cada una con ✕ para quitarla, más "Limpiar todo". Encabezado de resultados: "87 eventos" o "12 eventos para vos".
- El estado de los filtros vive en un hook `useFiltrosEventos()` que arma la query para `eventosService.buscar` y se conserva al volver desde el detalle.
- Lista **paginada** con el componente `Paginacion` (pills numeradas) de `TarjetaEvento`: imagen, nombre, categoría, fecha, lugar, "desde $X", estrellas del organizador y corazón de favorito (toggle optimista con rollback y toast si falla).
- Sección/segmento **"Eventos anteriores"**: mismas tarjetas en **gris** (opacidad, imagen desaturada), badge "Finalizado", sin botón de compra.
- Skeleton al cargar, EmptyState sin resultados ("Probá con otra búsqueda"), ErrorState con reintentar.

### Detalle de evento (`features/eventos/DetalleEvento`)
- Carrusel de multimedia (imágenes; los videos con `expo-video` o, como mínimo, un ícono que abra el archivo).
- Nombre, categoría, fecha y hora, lugar, descripción original + ampliaciones con su fecha ("Actualización del 12/11").
- Organizador: nombre, puntaje promedio y cantidad de reseñas.
- **Tipos de entrada**: tarjetas seleccionables con nombre, descripción, precio y disponibles ("Quedan 12"; "Agotado" deshabilitado).
- Selector de cantidad (stepper) limitado por `min(disponibles, 10)`.
- Total calculado en vivo. Botón **Comprar** → crea la compra (PENDIENTE) y navega al checkout.
- Si el evento ya ocurrió: todo en gris, sin compra.
- **Reseñas del organizador** (caso de uso 10): lista paginada con estrellas, comentario, comprador, tipo de entrada y evento.

### Checkout / Pago (`features/compras/Checkout`)
- Resumen: evento, tipo, cantidad, precio unitario y total.
- Cuenta regresiva hasta `fechaLimitePago`: "Tenés hasta el 18/11 15:30 para pagar".
- Botón **Pagar** → Modal de confirmación: "¿Seguro que querés pagar $45.000,00?". Al confirmar llama a `/pagar` con el botón en loading, muestra un toast de éxito y navega al detalle de la compra.
- "Pagar más tarde" vuelve a Mis compras (la compra queda PENDIENTE).

### Mis compras (`features/compras/MisCompras`)
- Segmentos/filtros por estado (Todas, Pendientes, Confirmadas, Utilizadas, Canceladas, Reembolsadas) con contador.
- `TarjetaCompra`: imagen y nombre del evento, fecha, tipo × cantidad, total, **EstadoCompraBadge** bien visible y:
  - CONFIRMADA → **"Faltan N días"** destacado (caso de uso 1).
  - PENDIENTE → "Pagá antes del …" + botón Pagar.
  - CANCELADA con reembolso pendiente → "Reembolso en proceso (hasta el …)".
  - UTILIZADA sin reseña → botón "Calificar".
  - Badge de mensajes no leídos.
- Pull-to-refresh, Skeleton, EmptyState con CTA "Explorar eventos".

### Detalle de compra (`features/compras/DetalleCompra`)
- Cabecera con estado y días restantes.
- Datos del evento y de la compra.
- **Timeline del historial** (`components/compras/TimelineEstados`): cada cambio con ícono del estado, fecha y hora, quién ("Vos", "Organizador", "Sistema") y el detalle.
- Acciones según los flags del back: Pagar, **Cancelar** (Modal: "Se te reembolsarán $X dentro de 24 h" si estaba confirmada, o "Se liberarán tus entradas" si estaba pendiente), Calificar, botón "Chat con el organizador" (navega a una pantalla placeholder hasta la iteración 10).

### Calificar (`features/compras/Calificar`, modal o pantalla)
Rating de 0.5 a 5 + comentario opcional (contador de caracteres, máx 1000). Al enviar: toast y se oculta el botón Calificar.

### Favoritos (`features/favoritos/Favoritos`)
Lista de favoritos con la misma tarjeta; los anteriores en gris. Quitar con swipe o con el ícono.

## Tests
Explorar (aplica filtros y orden → llama al service con la query correcta; Para vos agrega `paraVos=true`; quitar una pill de filtro actualiza la query), `useFiltrosEventos` (cuenta los filtros activos, valida rangos), carrusel de recomendados (motivo y estado vacío), TarjetaCompra (muestra "Faltan N días" solo si está CONFIRMADA), Checkout (el modal muestra el importe correcto y confirmar llama a pagar), DetalleCompra (las acciones visibles dependen de los flags), TimelineEstados.

## Criterios de aceptación
- [ ] Con los seeds se ve al menos una compra en cada estado con su texto correcto.
- [ ] No se puede seleccionar más cantidad que el cupo disponible.
- [ ] Toda pantalla tiene loading (Skeleton), vacío y error.
- [ ] Cada acción muestra un toast de éxito o error y refresca los datos afectados.
