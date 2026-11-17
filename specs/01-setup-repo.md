# 01 — Setup del repositorio

## Objetivo
Dejar un monorepo que arranque back y front vacíos, con lint, formato, Docker y CI funcionando, replicando la configuración de `REPO_REF`.

## Leer antes
`REPO_REF/package.json`, `eslint.config.mjs`, `.gitignore`, `docker-compose.yml`, `.github/workflows/tests.yml`, `packages/backend/{package.json,Dockerfile,.dockerignore,.env.example,index.js,swagger.js,jest.config.js}`, `packages/backend/tests/setupEnv.js`.

## Alcance

### Raíz
- `package.json` con workspaces `packages/*` y scripts equivalentes a REPO_REF: `dev:backend`, `start:backend`, `start:frontend` (`expo start`), `start:dev` (concurrently), `lint`, `format`, `test` (corre los tests de ambos workspaces), `seed`.
- ESLint flat config: reglas node para el back; react + react-hooks para el front (`packages/frontend/src/**`, `App.jsx`).
- Prettier 3, `.gitignore` (node_modules, `.env`, `.expo/`, `uploads/`, `coverage/`), `README.md` con el paso a paso para correr en el celular.

### Back (`packages/backend`)
- Estructura de carpetas completa (vacías con `.gitkeep` donde haga falta): `adapter/ controllers/dto/ domain/ errors/ jobs/ middlewares/ repositories/mongo/ routes/ schemas/ services/ sockets/ templates/ seeds/ scripts/ tests/ utils/ docs/`.
- Copiar y adaptar desde REPO_REF: `errors/AppError.js` (incluyendo `ConflictError`), los 5 middlewares (corrigiendo el doble `next` de `notFoundHandler`), `swagger.js`.
- `db.js`: si existe `MONGO_URI` conecta ahí; si no, crea un `MongoMemoryServer` y conecta. Exporta `conectarDB()` y `desconectarDB()` (este último para tests y apagado limpio).
- `app.js` exporta la app de express (json, cors con `ALLOWED_ORIGINS`, `/api-docs`, `/api`, `/uploads` estático, handlers de error). `index.js` crea el `http.Server`, conecta la DB, siembra los datos y escucha en `0.0.0.0:PORT`. Separar app de server permite testear con supertest y montar socket.io más adelante.
- `GET /api/health` → `{ status: "ok" }`.
- `utils/reloj.js` (ver contexto común).
- `.env.example`: `PORT=8000`, `JWT_SECRET`, `JWT_EXPIRES_IN=7d`, `ALLOWED_ORIGINS`, `MONGO_URI=` (vacío = en memoria), `INTERVALO_JOBS_MS=60000`, `UPLOADS_DIR=uploads`.
- Jest configurado para ESM como en REPO_REF, con un helper `tests/helpers/dbMemoria.js` que levanta y baja un MongoMemoryServer por suite. Un test de humo de `/api/health`.
- `Dockerfile` sobre **`node:20-bookworm-slim`** (mongodb-memory-server no funciona en alpine). `docker-compose.yml` solo con el servicio backend (ya no hace falta un contenedor de mongo).

### Front (`packages/frontend`)
- App Expo creada con `create-expo-app` (template blank, JS) y adaptada a la estructura de carpetas del contexto común.
- Dependencias instaladas con `npx expo install` (para que las versiones coincidan con la SDK).
- `app.config.js` que lee `EXPO_PUBLIC_API_URL` (por ejemplo `http://192.168.0.10:8000/api`). `.env.example` explicando que desde el celular hay que usar la IP LAN de la PC y desde el emulador de Android `10.0.2.2`.
- `App.jsx` con un placeholder que muestra el resultado de `/api/health` vía `apiCaller`, para probar la conectividad celular → back.
- jest-expo + @testing-library/react-native con un test de humo.
- Docker no aplica al front de Expo: documentarlo en el README.

### CI (`.github/workflows/tests.yml`)
- Node 20, `npm ci` en la raíz, cache de npm y del binario de mongodb-memory-server (`~/.cache/mongodb-binaries`).
- Jobs: lint, tests del back, tests del front. Sin `MONGO_URI` (usa memoria).

## Criterios de aceptación
- [ ] `npm install` en la raíz instala todo.
- [ ] `npm run dev:backend` levanta el server con Mongo en memoria y `GET /api/health` responde 200.
- [ ] `/api-docs` abre Swagger.
- [ ] `npm run start:frontend` abre Expo y, desde el celular con Expo Go, la pantalla muestra "ok" del health.
- [ ] Una ruta inexistente devuelve 404 con `{ status, message, timestamp }`.
- [ ] `npm run lint` y `npm test` pasan; el workflow de CI pasa.
- [ ] `docker compose up` levanta el back.
