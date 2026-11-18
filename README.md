# AI Ticket It

Plataforma de venta de entradas para eventos. Monorepo con:

- `packages/backend`: Node + Express 5 + mongoose, con MongoDB **en memoria** (mongodb-memory-server).
- `packages/frontend`: app React Native con Expo, para correr en el celular con **Expo Go** o en un emulador.

Las specs de cada iteración están en [`specs/`](specs/README.md).

## Requisitos

- Node 20 o superior y npm.
- En el celular: la app **Expo Go** (Play Store / App Store).
- PC y celular **en la misma red Wi-Fi**.
- Opcional: Docker, para correr el back en un contenedor.

## Paso a paso para correrlo en el celular

1. **Instalar dependencias** (desde la raíz, una sola vez):

   ```bash
   npm install
   ```

2. **Configurar el back**: copiar `packages/backend/.env.example` a `packages/backend/.env`.
   Dejá `MONGO_URI` vacío para usar la base en memoria.

3. **Levantar el back**:

   ```bash
   npm run dev:backend
   ```

   La primera vez descarga el binario de MongoDB (puede tardar un minuto). Queda escuchando en
   `http://0.0.0.0:8000`. Probá `http://localhost:8000/api/health` y la documentación en
   `http://localhost:8000/api-docs`.

   Opcional: en `packages/backend/.env` definí `PUBLIC_BASE_URL=http://<IP-de-la-PC>:8000` para que las URLs
   de imágenes y videos siempre apunten a la IP LAN (si no, se infieren de cada request).

4. **Averiguar la IP LAN de la PC**: en Windows, `ipconfig` → "Dirección IPv4" del adaptador Wi-Fi
   (por ejemplo `192.168.0.10`). Si el firewall de Windows pregunta, permití Node en redes privadas.

5. **Configurar el front**: copiar `packages/frontend/.env.example` a `packages/frontend/.env` y poner
   `EXPO_PUBLIC_API_URL=http://<IP-de-la-PC>:8000/api`.
   - Emulador de Android: `http://10.0.2.2:8000/api`.

6. **Levantar Expo**:

   ```bash
   npm run start:frontend
   ```

7. **Abrir la app**: escanear el QR con Expo Go (Android) o con la cámara (iOS). Aparece la landing con
   los eventos destacados; si muestra un error de conexión, revisá la IP, que estén en la misma red y el
   firewall. El chat y las notificaciones en tiempo real usan el mismo host y puerto (socket.io).

Para levantar back y front juntos: `npm run start:dev`.

**Mapa (spec 11):** en Expo Go el mapa funciona sin configurar nada. Un build de producción para
Android necesita una API key de Google Maps: definila en `packages/frontend/.env` como
`GOOGLE_MAPS_ANDROID_API_KEY=...` (`app.config.js` la toma de ahí). **No la commitees.** En iOS el mapa
usa Apple Maps y no necesita key. "Cómo llegar" abre Google Maps (app o navegador) sin pedir permiso de
ubicación; el permiso solo se pide al organizador para buscar una dirección.

## Scripts (desde la raíz)

| Script                   | Qué hace                                                  |
| ------------------------ | --------------------------------------------------------- |
| `npm run dev:backend`    | Back con recarga automática (`node --watch`)              |
| `npm run start:backend`  | Back sin recarga                                          |
| `npm run start:frontend` | `expo start`                                              |
| `npm run start:dev`      | Back y front en paralelo (concurrently)                   |
| `npm run lint`           | ESLint en todo el monorepo                                |
| `npm run format`         | Prettier sobre todo el repo                               |
| `npm test`               | Tests del back (Jest + supertest) y del front (jest-expo) |
| `npm run seed`           | Siembra una base externa (`MONGO_URI`)                    |

## Usuarios de prueba

Al arrancar, el back siembra datos de demo (categorías, eventos futuros y pasados, compras en todos los
estados con chat y reseñas). **Todos los usuarios tienen la contraseña `Ticket123!`**.

| Rol         | Email                  | Para qué sirve en la demo                                                                                                                           |
| ----------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Organizador | `lucia@ticketit.test`  | Recitales y festivales; tiene un reembolso pendiente por hacer                                                                                      |
| Organizador | `martin@ticketit.test` | Teatro, stand-up y danza                                                                                                                            |
| Organizador | `sofia@ticketit.test`  | Deportes, conferencias e infantiles                                                                                                                 |
| Comprador   | `ana@ticketit.test`    | Favoritos de Recitales ("Recomendados para vos"); compra confirmada con chat, una pendiente que vence en menos de 48 h y una utilizada para reseñar |
| Comprador   | `bruno@ticketit.test`  | Favoritos de Stand-up; compra pendiente, cancelada con reembolso pendiente y reseña hecha                                                           |
| Comprador   | `carla@ticketit.test`  | Compra vencida, reembolsada por el organizador y reseña hecha                                                                                       |
| Comprador   | `diego@ticketit.test`  | Sin favoritos (estado vacío); reembolso automático y una utilizada para reseñar                                                                     |

Las imágenes de los eventos son afiches de relleno generados con `node packages/backend/scripts/generarImagenesSemilla.js`
(`packages/backend/seeds/assets/`). Se pueden reemplazar por fotos reales con el mismo nombre de archivo.

## Docker

```bash
docker compose up --build
```

Levanta **solo el back** en `http://localhost:8000`, con MongoDB en memoria dentro del contenedor.

El front de Expo **no se dockeriza**: Expo Go necesita conectarse al servidor de desarrollo (Metro) desde
el celular por la red local, y meterlo en un contenedor complica la red sin aportar nada. El front
siempre se corre con `npm run start:frontend` en la PC.

## Datos

La base vive en memoria: **los datos se pierden al reiniciar el back** y se vuelven a sembrar al arrancar.
Para depurar con una base real, completá `MONGO_URI` en `packages/backend/.env`.

## Tests

```bash
npm test          # back + front
npm run lint      # ESLint en todo el monorepo
```

- **Back** (`packages/backend/tests`): Jest (ESM) + supertest sobre MongoDB en memoria. Hay tests unitarios del
  dominio con reloj fijo (`*.Dominio.test.js`) y de integración por API (`*.integracion.test.js`), incluido el socket
  con `socket.io-client`. Las tareas programadas se prueban adelantando el reloj.
  Cobertura del dominio: `npm run test:coverage -w packages/backend` (umbral 90 %).
- **Front** (`packages/frontend/__tests__`): jest-expo + React Native Testing Library. Un adapter de axios falso
  (`pruebas/apiFalsa.js`) hace correr los interceptores reales y un socket falso (`pruebas/pantallas.jsx`) simula el
  tiempo real.

## Arquitectura

```
packages/backend
  routes → controllers (zod + DTO) → services (casos de uso, titularidad) → domain (reglas puras)
                                                ↘ repositories/mongo (mongoose)   ↘ adapter (archivos, socket)
  jobs/ProgramadorTareas   sockets/index.js   templates/   seeds/
packages/frontend
  features (pantallas) → service (DTO → modelo de UI) → service/apis → apiCaller → api (axios + JWT)
  context (Auth, Theme, Toast, Socket, Notificaciones)   hooks   components/ui (sistema de diseño)
```

Las decisiones de cada iteración están en [`packages/backend/docs/decisiones.md`](packages/backend/docs/decisiones.md)
y el detalle de cambios en [`changelog.md`](packages/backend/docs/changelog.md). La API está documentada con Swagger
en `/api-docs`.

## Guion sugerido para el video

Usar dos dispositivos (o celular + emulador): **Ana** (`ana@ticketit.test`, comprador) y **Lucía**
(`lucia@ticketit.test`, organizadora). Contraseña `Ticket123!`.

| #   | Paso en la app                                                                                             | Back                                                                                                                             | Front                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | Ana busca "jazz" y filtra por Recitales y precio                                                           | `routes/eventosRoutes.js` → `EventosController.buscar` → `EventosService.buscar` → `EventosMongoRepository.buscar` (aggregation) | `features/eventos/Explorar.jsx`, `hooks/useFiltrosEventos.js`, `components/eventos/PanelFiltros.jsx`        |
| 2   | Abre el evento: tipos con "Quedan N", elige cantidad y confirma la reserva en el modal                     | `ComprasService.crear` → `Compra.crear` (dominio) → `EventosMongoRepository.reservarCupo` (atómico, sin sobreventa)              | `features/eventos/DetalleEvento.jsx`, `components/compras/SelectorCantidad.jsx`                             |
| 3   | Paga (pago simulado con modal)                                                                             | `POST /compras/:id/pagar` → `Compra.pagar` → `guardarTransicion` (optimista) → hook `alCambiarEstado`                            | `features/compras/Checkout.jsx`                                                                             |
| 4   | Lucía recibe la notificación al instante (badge + toast)                                                   | `AvisosComprasService` → `NotificacionesService.notificar` → `EmisorSocketAdapter` (`notificacion:nueva`)                        | `context/NotificacionesContext.jsx`, `components/layout/Encabezado.jsx`                                     |
| 5   | Ana escribe por el chat; Lucía responde sin refrescar                                                      | `POST /compras/:id/mensajes` → `MensajesService.enviar` → `mensaje:nuevo` a la sala `compra:<id>` (`sockets/index.js`)           | `features/compras/Chat.jsx`, `hooks/useChatCompra.js`, `features/mensajes/Mensajes.jsx`                     |
| 6   | (Opcional) Apagar el wifi de un dispositivo: el chat avisa y sigue por polling; al volver se recupera solo | `GET /compras/:id/mensajes?desde=`                                                                                               | `useChatCompra` (polling cada 10 s y recuperación al reconectar), `context/SocketContext.jsx`               |
| 7   | Ana cancela la compra: queda CANCELADA con reembolso pendiente y el cupo vuelve                            | `Compra.cancelar` (tabla de transiciones) → `EventosMongoRepository.liberarCupo`                                                 | `features/compras/DetalleCompra.jsx`, `components/compras/TimelineEstados.jsx`                              |
| 8   | Lucía ve la alerta de reembolsos y reembolsa desde Compras del evento; Ana la ve REEMBOLSADA en vivo       | `POST /compras/:id/reembolsar` → `Compra.reembolsar`; si no lo hace en 24 h, `ProgramadorTareas` → `reembolsosAutomaticos`       | `features/organizador/MisEventos.jsx`, `features/organizador/ComprasEvento.jsx`, `hooks/useEstadoCompra.js` |
| 9   | Cierre: Lucía crea un evento (4 pasos, imágenes con alt) o cancela uno (reembolso automático de todo)      | `EventosService.crear`, `agregarMultimedia` (multer + `AlmacenamientoLocalAdapter`), `EventosService.cancelar`                   | `features/organizador/CrearEvento.jsx`, `features/organizador/EditarEvento.jsx`                             |

Tip: mostrar el modo oscuro desde Perfil y el historial de estados en el detalle de la compra.
