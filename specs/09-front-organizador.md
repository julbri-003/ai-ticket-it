# 09 — Front organizador

## Objetivo
Pantallas del organizador (casos de uso 2, 4 y 8, más la edición restringida y los reembolsos), salvo el chat (iteración 10).

## Leer antes
`REPO_REF/packages/frontend/src/features/colectivo/ColectivoDashboard.jsx`, `ProjectForm.jsx`, `ManageProject.jsx`, `components/colectivo/CreateMilestoneModal.jsx`.
Si existen: `design/stitch/{mis-eventos,crear-evento,editar-evento,compras-evento}/`.

## Pantallas

### Mis eventos (`features/organizador/MisEventos`)
- Encabezado con el puntaje promedio propio y la cantidad de reseñas.
- Segmentos "Próximos" / "Anteriores" (anteriores en gris).
- `TarjetaEventoOrganizador`: imagen, nombre, fecha, barra de ocupación total (vendidas/cupo), conteo por estado y alerta si hay **reembolsos pendientes**: "2 reembolsos por hacer · vence en 5 h".
- FAB o botón "Crear evento".

### Crear evento (`features/organizador/CrearEvento`)
Formulario por pasos (o secciones) con validación inline:
1. **Datos**: nombre, categoría (Select), fecha y hora (`@react-native-community/datetimepicker`, solo futuras), lugar, descripción.
2. **Tipos de entrada**: lista dinámica (agregar o quitar mientras se crea) con nombre, descripción, precio y cupo; al menos uno y nombres únicos.
3. **Multimedia**: `expo-image-picker` (múltiple, imágenes y videos), previsualización con opción de quitar, validación de tamaño y tipo en el cliente.
4. **Revisión** y publicar: crea el evento (JSON) → sube la multimedia (`postForm`) con progreso. Si falla la subida, el evento ya existe: avisar y llevar a Editar para reintentar.

Antes de publicar, avisar con un Modal que después **no se podrá** editar la descripción original ni borrar tipos de entrada.

### Editar evento (`features/organizador/EditarEvento`)
Refleja la edición restringida del dominio:
- **Multimedia**: agregar y quitar libremente.
- **Tipos de entrada**: los existentes se muestran en solo lectura (con vendidas/disponibles) y un botón "Agregar tipo de entrada" abre un Modal para crear uno nuevo.
- **Descripción**: la original en solo lectura + las ampliaciones con fecha + "Agregar actualización" (Textarea).
- Los demás campos se muestran deshabilitados con una nota "No editable".
- Si el evento ya ocurrió: todo en solo lectura.

### Compras del evento (`features/organizador/ComprasEvento`)
- **Resumen por tipo de entrada** (caso de uso 2): por cada tipo, nombre, precio, barra vendidas/cupo y **"Quedan N"** destacado.
- Totales: recaudación confirmada y conteo por estado.
- Filtro por estado (chips) + lista de compras: comprador, tipo × cantidad, total, fecha y **EstadoCompraBadge**.
- Compras CANCELADAS con reembolso pendiente: botón **Reembolsar** + "Reembolso automático el …". Modal de confirmación con importe y comprador.
- Tocar una compra abre `DetalleCompra` en modo organizador (reusar la pantalla de la iteración 08: timeline, sin acciones de comprador, con Reembolsar si corresponde y acceso al chat).

## Service layer
`apis/eventosApi.js` (agregar mios, crear, multimedia, tiposEntrada, ampliaciones, comprasDelEvento), `organizadorService.js` para el mapeo.

## Tests
Formulario de creación (no avanza sin un tipo de entrada; valida duplicados), EditarEvento (los tipos existentes no tienen botón de borrar; la descripción original no es editable), ComprasEvento (renderiza "Quedan N" por tipo; Reembolsar solo aparece con reembolso pendiente).

## Criterios de aceptación
- [ ] Crear un evento con 3 tipos y 2 imágenes desde el celular, y verlo en Explorar desde la cuenta de un comprador.
- [ ] Después de una compra del comprador, el organizador ve bajar los disponibles.
- [ ] Reembolsar actualiza la lista y el comprador lo ve REEMBOLSADA.
