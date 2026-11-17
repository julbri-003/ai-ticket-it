# Matriz de trazabilidad

Cada requisito, dónde se implementa y cómo se verifica. Se usa en tres momentos:

1. **Diseños de Stitch**: antes de la spec 07, revisar que cada fila tenga su pantalla exportada (columna "Pantalla").
2. **Durante el desarrollo**: al cerrar cada spec, marcar las filas que esa spec completa.
3. **Cierre (spec 10)**: el agente recorre la matriz completa y en "Estado" pone ✅ con la evidencia (nombre del test o pasos de prueba manual) o ❌ con lo que falta.

## A. Casos de uso del enunciado (mínimos obligatorios)

| # | Requisito | Back | Front | Pantalla | Cómo verificarlo | Estado |
|---|---|---|---|---|---|---|
| CU1 | Comprador ve sus compras, con estado claro y días restantes si está CONFIRMADA | 02 `diasParaElEvento` · 05 `GET /compras/mias` | 08 MisCompras | `mis-compras` | Con los seeds: una compra por estado; solo la CONFIRMADA muestra "Faltan N días" | |
| CU2 | Organizador ve las compras de un evento por estado y las entradas que quedan de cada tipo | 05 `GET /eventos/:id/compras` (resumen) | 09 ComprasEvento | `compras-evento` | `vendidas + disponibles = cupo` por tipo; filtrar por estado | |
| CU3 | Buscar eventos por texto o explorar por categorías | 03 `buscar` · 04 `GET /eventos` | 08 Explorar | `explorar`, `filtros` | Buscar "traviata" y filtrar por Teatro | |
| CU4 | Organizador crea un evento con varios tipos de entrada (precio + cupo) | 02 Evento · 04 `POST /eventos` | 09 CrearEvento | `crear-evento` | Crear con 3 tipos y verlo desde un comprador | |
| CU5 | Comprador envía mensajes en cualquier momento por compra | 06 chat REST + socket | 10 Chat | `chat` | Enviar desde una compra CANCELADA también funciona | |
| CU6 | Organizador responde mensajes en cualquier momento por compra | 06 | 10 Chat | `chat`, `mensajes` | Con dos dispositivos, el mensaje llega sin refrescar | |
| CU7 | Comprador cancela una compra para obtener el reembolso | 02 `cancelar` · 05 `POST /cancelar` | 08 DetalleCompra | `detalle-compra` | CONFIRMADA → CANCELADA con reembolso pendiente y cupo liberado | |
| CU8 | Solo se puede cancelar si no está UTILIZADA y el evento no ocurrió | 02 tabla de transiciones · 05 tests | 08 (botón según `puedeCancelar`) | `detalle-compra` | Intentar cancelar una UTILIZADA o con el evento pasado → 409 y sin botón | |
| CU9 | Con la entrada UTILIZADA, el comprador puntúa y comenta | 02 Resenia · 05 `POST /resenia` | 08 Calificar | `calificar` | Solo UTILIZADA y una vez por compra; el puntaje del organizador se actualiza | |
| CU10 | Las reseñas se ven en los eventos de cada organizador | 04 `GET /eventos/:id/resenias` | 08 DetalleEvento | `detalle-evento` | Un evento nuevo de un organizador con reseñas previas las muestra | |
| CU11 | Ordenar por precio, fecha y puntaje del organizador | 03 `buscar` (orden) · 04 | 08 PanelFiltros | `filtros` | Probar los 3 órdenes asc/desc | |
| CU12 | Comprar eligiendo tipo y cantidad sin superar el cupo | 02 `reservar` · 03 `reservarCupo` atómico · 05 `POST /compras` | 08 DetalleEvento + Checkout | `detalle-evento`, `checkout` | El stepper no supera lo disponible; test de concurrencia sin sobreventa | |

## B. Funcionalidades agregadas

| Requisito | Back | Front | Pantalla | Cómo verificarlo | Estado |
|---|---|---|---|---|---|
| Registro con un único rol (comprador u organizador), JWT | 04 auth | 07 Login/Registro | `login`, `registro` | Cada rol ve sus tabs; un comprador no puede crear eventos (403) | |
| Pago simulado con modal de confirmación e importe | 05 `POST /pagar` | 08 Checkout | `checkout` | El modal muestra el total correcto | |
| Vencimiento de PENDIENTE a las 48 h o en la fecha del evento | 02 · 05 job `vencerComprasPendientes` | 08 ("Pagá antes del…") | `mis-compras` | Test con reloj adelantado; libera cupo | |
| UTILIZADA automática en la fecha del evento | 05 job `marcarComprasUtilizadas` | 08 | `mis-compras` | Test con reloj | |
| Reembolso manual del organizador o automático a las 24 h | 05 `POST /reembolsar` · job `reembolsosAutomaticos` | 09 ComprasEvento | `compras-evento` | Reloj +25 h → REEMBOLSADA por SISTEMA | |
| Historial de estados con fecha, quién y detalle | 02 CambioEstadoCompra · 05 | 08 TimelineEstados | `detalle-compra` | Cada transición aparece en la línea de tiempo | |
| Subida real de multimedia con texto alternativo | 04 multer + AlmacenamientoLocalAdapter | 09 Crear/Editar | `crear-evento`, `editar-evento` | Subir 2 imágenes con alt; un tipo inválido → error junto al campo | |
| Edición restringida (multimedia libre, agregar tipos, ampliar descripción) | 02 Evento · 04 endpoints específicos | 09 EditarEvento | `editar-evento` | No se puede borrar un tipo ni editar la descripción original | |
| Eventos pasados en "Anteriores", en gris, con baja lógica | 02 `finalizar` · 03 plugin · 05 job | 08 Explorar · 09 MisEventos | `explorar`, `mis-eventos` | Un evento pasado no se puede comprar y se ve en gris | |
| Favoritos | 04 `/favoritos` | 08 Favoritos | `favoritos`, `explorar` | Toggle idempotente; quitar ofrece "Deshacer" | |
| Buscador con filtros (texto, categorías, precio, fechas, disponibilidad, puntaje mínimo) | 03 · 04 | 08 Explorar + PanelFiltros | `explorar`, `filtros` | Combinar filtros; un rango inválido muestra error junto al campo | |
| Recomendados para vos (por categorías de favoritos) | 02 `categoriasPreferidas` · 04 `/recomendados` y `paraVos` | 08 carrusel + pill "Para vos" | `explorar` | Un comprador con favoritos de Recitales ve recitales; sin favoritos ve el estado vacío | |
| Notificaciones in-app con templates | 06 templates + NotificacionesService | 10 Notificaciones | `notificaciones` | Cada transición genera la notificación correcta | |
| Bandeja de conversaciones | 10 `GET /compras/conversaciones` | 10 Mensajes | `mensajes` | Orden por último mensaje y contador de no leídos | |
| Landing, footer, paginación y carruseles | — | 07 | `landing` y todas las listas | Toda lista larga pagina; las galerías usan el carrusel | |
| Persistencia en memoria (mongodb-memory-server) con plugin Persistible | 01 `db.js` · 03 | — | — | Sin `MONGO_URI` arranca y siembra; ningún schema redeclara campos del plugin | |
| Arquitectura en capas y carpetas como el repo de referencia | 00 · todas | 00 · 07 | — | Revisión de carpetas; controllers sin reglas de negocio | |

## C. Requisitos no funcionales de UI (en todas las pantallas)

| Requisito | Dónde | Cómo verificarlo | Estado |
|---|---|---|---|
| Contraste ≥ 4,5:1 en claro y oscuro | 00 paleta · 07 test de contraste | Test `contraste` + revisión visual | |
| Label visible y marca de obligatorio en cada campo | 07 Input/Select/Textarea | Recorrer los formularios | |
| Errores junto al campo, explicando qué pasó y cómo resolverlo | 07 · 08 · 09 | Enviar formularios vacíos o inválidos | |
| Feedback de carga, éxito y error en cada acción | 07 Skeleton/Toast | Probar con el back apagado | |
| Navegación con teclado y foco visible | 07 | Teclado externo o versión web: Tab recorre todo con anillo visible | |
| Texto alternativo en imágenes informativas | 04 · 07 ImagenEvento | Lector de pantalla (TalkBack/VoiceOver) | |
| Componentes consistentes | 07 `components/ui` | Ninguna pantalla usa variantes ad hoc | |
| Confirmación o deshacer en acciones destructivas | 07 Modal/Toast | Cancelar compra, quitar imagen, cerrar sesión, quitar favorito | |
| Modo claro y oscuro completos | 07 ThemeContext | Cambiar el tema en Perfil y recorrer todo | |
