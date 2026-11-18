# Iteración 11 — Mensajes sugeridos, ideas para crear eventos, ubicación en el mapa y recordatorio de pago

> Leé antes `00-contexto-comun.md` (reglas, paleta, accesibilidad, iOS/Android).
> Requiere 05, 06, 08, 09 y 10. Los detalles visuales de 07b/07c son opcionales: si están, reutilizá sus piezas (`Ornamento`, `Sello`, `DECORATIVO`, `useMovimientoReducido`).

## Objetivo
Cuatro mejoras chicas que le ahorran trabajo a comprador y organizador:
1. **Mensajes sugeridos** al abrir un chat por primera vez (preguntas frecuentes del comprador y respuestas típicas del organizador).
2. **Ideas al crear un evento**: sugerencias de qué escribir en la descripción y qué tipos de entrada armar, según la categoría.
3. **Ubicación exacta en un mapa**: el organizador marca el punto al crear el evento y el comprador puede abrir **"Cómo llegar"** en Google Maps (en auto, desde su ubicación).
4. **Recordatorio de pago**: una notificación cuando a una reserva PENDIENTE le quedan 24 h para pagarse.

No cambia la máquina de estados de las compras ni los flujos existentes. Todo funciona en claro y oscuro, en iOS y Android, y con lector de pantalla.

## Alcance

### 1. Mensajes sugeridos en el chat (front)
- **Cuándo**: en `Chat` de una compra, mientras **el usuario no envió ningún mensaje propio** en esa conversación. Se ocultan solos después del primer envío y también con un botón "Ocultar sugerencias" (dura mientras la pantalla esté montada; no se persiste).
- **Dónde**: una fila con scroll horizontal de chips justo arriba de `EntradaMensaje`. Si el chat está vacío, el estado vacío los invita a usarlos ("Empezá con una pregunta frecuente").
- **Qué hacen**: tocar un chip **completa el campo de texto** con la sugerencia y le da foco. **No envía**: el usuario puede editarla. Respeta `MAX_CARACTERES_MENSAJE`.
- **Contenido**: función pura `sugerenciasChat({ rol, compra, evento })` en `src/service/sugerenciasService.js` que devuelve hasta 6 textos.
  - **Comprador** (fijas): "¡Hola! ¿Hay código de vestimenta?", "¿El evento es al aire libre o techado?", "¿A qué hora abren las puertas?", "¿Se puede ingresar con comida o bebida?", "¿Hay estacionamiento cerca?", "¿Es apto para menores?". Si el evento **no** tiene ubicación en el mapa, se suma "¿Me pasás la dirección exacta?" en lugar de la de estacionamiento.
  - **Organizador** (con datos de la compra): "¡Gracias por tu compra para {evento}! Te recomiendo llegar temprano.", "¡Hola {nombre}! Cualquier duda sobre el evento, escribime por acá.", "Las puertas abren una hora antes del inicio.". Según el estado: PENDIENTE → "Te recuerdo que tenés hasta el {fechaLimite} para pagar tu reserva."; CONFIRMADA → "¡Tu pago quedó confirmado! Nos vemos en {lugar}."; CANCELADA/REEMBOLSADA → "Lamentamos que no puedas venir. Si necesitás algo, avisame.".
  - `{nombre}` es solo el nombre de pila del comprador. Si falta un dato, esa sugerencia no se muestra (nunca "undefined").
- **Accesibilidad**: la fila es un grupo con label "Mensajes sugeridos". Cada chip es un botón con label "Usar sugerencia: {texto}" y área táctil ≥ 44×44. Al completar el campo se anuncia "Sugerencia agregada al mensaje" (`AccessibilityInfo.announceForAccessibility`).

### 2. Ideas al crear un evento (front)
En el paso "Datos" de `CrearEvento`:
- **Ejemplo de nombre** en el placeholder según la categoría elegida (por ejemplo, Recitales → "Ej.: Noche de rock en el Club Sur", Teatro → "Ej.: Esperando la carroza, función de estreno"). Sin categoría, uno genérico.
- **"Ideas para tu descripción"**: chips debajo del `Textarea`. Al tocar uno se **agrega una línea** al final de la descripción con el rótulo listo para completar (por ejemplo `Duración aproximada: `) y se mueve el cursor al final. Un chip ya usado (su rótulo ya está en la descripción) se muestra marcado y no se vuelve a agregar.
  - Comunes: "Duración aproximada", "Apertura de puertas", "Código de vestimenta", "Al aire libre o techado", "Edad mínima", "Accesibilidad del lugar", "Qué incluye la entrada".
  - Por categoría (máximo 3 extra): Recitales → "Banda soporte", "Lista de temas"; Teatro → "Elenco", "Dirección"; Stand-up → "Contenido para adultos"; Festivales → "Line-up por día", "Zona de comidas"; Deportes → "Sectores de la cancha"; Conferencias → "Oradores", "Certificado de asistencia"; Infantiles → "Edad recomendada"; Danza → "Compañía", "Estilo".
- **Tipos de entrada sugeridos** en el paso "Entradas": chips "General", "VIP", "Preventa" (y por categoría: Recitales/Festivales → "Campo", "Platea"; Teatro → "Platea", "Pullman"; Deportes → "Popular", "Platea"; Conferencias → "Estudiantes"). Tocar uno completa el **nombre** del primer tipo vacío del editor (o agrega uno nuevo con ese nombre); precio y cupo los completa el organizador. Los nombres ya usados no se ofrecen.
- Toda la lógica en funciones puras de `sugerenciasService` (`ejemploNombre(categoria)`, `ideasDescripcion(categoria)`, `agregarIdea(descripcion, idea)`, `tiposSugeridos(categoria)`), reutilizando la normalización de nombres de `iconosCategoria` (sin acentos ni mayúsculas).
- Las sugerencias **no** cambian validaciones ni límites (descripción y nombres siguen con los máximos actuales; `agregarIdea` no supera el máximo de la descripción y, si no entra, no agrega nada y lo avisa en el helper del campo).

### 3. Ubicación exacta en un mapa

#### Back
- `Evento` suma `ubicacion` **opcional**: `{ lat, lng, direccion }`. `lat` ∈ [−90, 90], `lng` ∈ [−180, 180], `direccion` texto de 5 a 200 caracteres. Validación en dominio y en zod (si viene, viene completa).
- Se acepta en `POST /api/eventos`. No se edita después (igual que `lugar`): no hay endpoint de edición general, solo los puntuales (ampliar descripción, tipos, multimedia), y ninguno la acepta.
- El DTO del evento (detalle, buscador y "Mis eventos") devuelve `ubicacion` o `null`.
- Seeds: los eventos de ejemplo suman coordenadas reales de sus lugares.
- Swagger y `docs/swaggerEsquemas.js` actualizados.

#### Front — organizador (crear)
- En el paso "Datos", debajo de "Lugar", una sección **"Ubicación en el mapa (opcional)"**:
  - Campo "Dirección exacta" + botón "Buscar en el mapa", que usa `Location.geocodeAsync` (`expo-location`) para centrar el mapa y poner el pin.
  - Mapa (`react-native-maps`) de 200 px de alto con un **pin arrastrable**. Tocar el mapa también mueve el pin.
  - Botón "Quitar ubicación".
  - Si la búsqueda no encuentra nada, o el permiso se niega, se avisa en el helper del campo y se puede poner el pin a mano. El mapa arranca centrado en el Obelisco (CABA).
- La revisión (paso 4) muestra la dirección y un mini mapa estático.
- `EditarEvento` muestra la ubicación como `CampoNoEditable` (dirección + mini mapa).

#### Front — comprador (detalle del evento)
- En `DetalleEvento`, si hay `ubicacion`: mini mapa no interactivo (`liteMode` en Android, sin scroll ni zoom) con el pin y la dirección debajo. El mapa es decorativo para el lector: la dirección es texto.
- Botón **"Cómo llegar"** (`Navigation`, variante `outline`) que abre Google Maps con la ruta **en auto desde la ubicación actual**: `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}&travelmode=driving` con `Linking.openURL`. Sin `origin`, Google Maps usa la ubicación del dispositivo, así que **la app no pide permiso de ubicación** para esto. Abre la app de Google Maps si está instalada y, si no, el navegador.
- Sin `ubicacion`, "Cómo llegar" usa `destination={lugar}` (texto codificado con `encodeURIComponent`), así funciona también con eventos viejos.
- El armado de la URL va en una función pura `urlComoLlegar(evento)` con tests.
- En web no hay `react-native-maps`: se muestra solo la dirección y "Cómo llegar" (archivo `.web.jsx` o import condicional).

#### Dependencias nuevas
`react-native-maps` y `expo-location`, instaladas con `npx expo install` para que coincidan con el SDK 58. Agregá en `app.config.js` el texto del permiso de ubicación (`expo-location` plugin, "Para buscar la dirección de tu evento en el mapa"). En Android, un build de producción necesita una API key de Google Maps (`android.config.googleMaps.apiKey`). En Expo Go funciona sin key. Dejalo documentado en el README, sin key en el repo. En Jest, mock de `react-native-maps` (componentes `View`) y de `expo-location` en `jest.setup`.

### 4. Recordatorio de pago a 24 h (back)
- Nuevo tipo de notificación **`RECORDATORIO_PAGO`**:
  - título "Tu reserva vence pronto";
  - mensaje: `Te quedan menos de 24 h para pagar {N entradas tipo} de "{evento}" ({total}). Vence el {fechaLimite}.`;
  - destino `DetalleCompra`.
- Nueva tarea programada **`recordarPagosPendientes`** (en `ComprasService`, registrada en `dependencias.js` antes de `vencerComprasPendientes`). Avisa una sola vez a cada compra que cumpla:
  - está PENDIENTE y todavía no tiene `recordatorioPagoEnviado`;
  - quedan **24 h o menos** para su `fechaLimitePago` (y no venció);
  - su plazo total (de `fechaCompra` a `fechaLimitePago`) es **mayor a 24 h**. Si el evento estaba tan cerca que el plazo ya era corto, el comprador lo vio al reservar y no se le recuerda.
- Idempotencia igual que `recordarEventosProximos`: dominio `debeRecordarPago(reloj)` + `marcarRecordatorioPagoEnviado()`, flag `recordatorioPagoEnviado` en el schema, `guardarSi` con condición `{ estado: PENDIENTE, recordatorioPagoEnviado: { $ne: true } }` y repo `listarParaRecordatorioPago(ahora)` con índice.
- La notificación llega en vivo por socket como las demás (`notificacion:nueva`). En el front, `notificacionesService` la lleva a `DetalleCompra`, que ya muestra el tiempo restante y "Pagar".

## Decisiones de la implementación
- **Sin `PUT` de eventos**: el back edita por endpoints puntuales, así que la ubicación se carga solo al crear y Editar la muestra como no editable.
- **Tipos sugeridos inline**: `CrearEvento` usa el editor de tipos en línea (no `ModalTipoEntrada`), así que el chip completa el nombre del primer tipo vacío o agrega uno.
- **Chip de idea usada**: se muestra con el estado seleccionado de `Chip` (`primary`/`onPrimary`, contraste ya testeado) y su label dice "ya agregada".
- **Dirección del pin**: si el organizador pone el pin sin escribir dirección, se envía el texto de "Lugar". Si queda con menos de 5 caracteres, el paso no avanza.
- **Datos del chat**: el DTO de compra suma `evento.ubicacion` (para la variante sin dirección) y el front toma el nombre del comprador del primer cambio de estado.
- **Recordatorio de pago**: corre antes de `vencerComprasPendientes` en cada vuelta del programador. El test de integración tolera que otras reservas de la semilla también reciban el aviso.
- **Mapa en web**: `components/mapa/Mapa.web.jsx` no dibuja mapa; el selector avisa que el punto se marca desde el celular.

## Reglas transversales
- **Sin datos inventados**: las sugerencias son ayudas de escritura, no información del evento. Nunca se envían ni se guardan solas.
- **Privacidad**: la ubicación del dispositivo no se lee ni se manda al back. La única ubicación que se guarda es la del evento, elegida por el organizador. La búsqueda de direcciones usa el geocodificador del sistema (`expo-location`), sin servicios externos propios.
- **Accesibilidad**: chips con label, rol y área ≥ 44×44. Los mapas son decorativos y la dirección siempre está como texto. "Cómo llegar" es un botón con `accessibilityHint="Abre Google Maps con la ruta en auto"`. El pin arrastrable tiene alternativa accesible: la búsqueda por dirección.
- **Contraste y tokens**: no hay colores sueltos. El pin usa `primary` y el chip marcado, `secondary`/`onSecondary`.

## Tests
- **Back (dominio)**: `debeRecordarPago` en los bordes: exactamente 24 h, ya vencida, plazo total ≤ 24 h, ya recordada y otros estados. Validación de `ubicacion` (rangos, incompleta, dirección corta o larga).
- **Back (integración)**:
  - `POST /api/eventos` con y sin `ubicacion`, y con una inválida → 400.
  - `PUT` con `ubicacion` → 400.
  - DTOs devuelven `ubicacion`.
  - `recordarPagosPendientes` notifica una sola vez aunque corra dos veces, con el texto del template, y no toca compras que no cumplen.
- **Front (helpers)**:
  - `sugerenciasChat` por rol y estado, sin "undefined" con datos faltantes y con la variante sin ubicación.
  - `ideasDescripcion`, `agregarIdea` (no duplica, respeta el máximo), `tiposSugeridos` y `ejemploNombre` por categoría y con una desconocida.
  - `urlComoLlegar` con coordenadas y con `lugar` (codificado).
- **Front (pantallas)**:
  - **Chat**: los chips aparecen sin mensajes propios. Tocar uno completa el input y no llama a la API. Desaparecen después de enviar y con "Ocultar sugerencias".
  - **CrearEvento**: un chip de idea agrega la línea y queda marcado. El tipo sugerido abre el modal con el nombre precargado. El evento se crea con `ubicacion` cuando se buscó una dirección (mock de `geocodeAsync`).
  - **DetalleEvento**: "Cómo llegar" llama a `Linking.openURL` con la URL esperada. Sin ubicación usa el lugar. La dirección es texto accesible.
  - **Notificaciones**: `RECORDATORIO_PAGO` navega a `DetalleCompra`.
- Todos los tests existentes siguen pasando.

## Criterios de aceptación
- [x] Chat: sugerencias por rol y estado al abrirlo por primera vez; completan el campo sin enviar y se ocultan al enviar o con "Ocultar".
- [x] Crear evento: ejemplo de nombre, ideas para la descripción por categoría y tipos de entrada sugeridos.
- [x] Ubicación: el organizador busca o marca el punto al crear; se guarda, se ve en la revisión y en Editar (no editable); el back la valida.
- [x] Comprador: mini mapa y "Cómo llegar" que abre Google Maps en auto desde su ubicación; funciona también sin coordenadas.
- [x] Recordatorio de pago: una sola notificación cuando faltan ≤ 24 h, solo si el plazo era mayor a 24 h; lleva a la compra.
- [x] Dependencias instaladas con `npx expo install`, permiso documentado en `app.config.js` y API key de Android documentada (no commiteada).
- [ ] Probado en un celular Android y en iOS (o simulador): mapa, búsqueda de dirección, "Cómo llegar" y sugerencias con TalkBack/VoiceOver.
- [x] Lint y tests de front y back en verde. Filas agregadas en `trazabilidad.md` con evidencia.
