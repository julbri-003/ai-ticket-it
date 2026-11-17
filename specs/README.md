# AI Ticket It — Specs para desarrollo guiado por especificaciones

Specs para construir **AI Ticket It** con un agente de IA (Claude Code, Cline, Cursor, etc.), iteración por iteración.

## Cómo usarlas

1. Creá el repo nuevo vacío y cloná al lado del repo de referencia:
   ```
   C:\Users\brise\2026-2c-lu-sa-grupo-3   ← repo de referencia (patrones a copiar)
   C:\Users\brise\ai-ticket-it            ← repo nuevo
   ```
2. Copiá esta carpeta al repo nuevo como `specs/`.
3. Para cada iteración, abrí una sesión nueva del agente y pasale:
   > Leé `specs/00-contexto-comun.md` y `specs/NN-<iteracion>.md`. Antes de escribir código, presentame un plan breve (archivos a crear o modificar y decisiones abiertas) y esperá mi OK. Al terminar, verificá todos los criterios de aceptación y corré los tests.
4. Revisá el resultado, probalo y commiteá **antes** de pasar a la siguiente iteración.

## Orden

| # | Spec | Resultado |
|---|------|-----------|
| 00 | `00-contexto-comun.md` | Reglas que valen para todas las iteraciones (no se ejecuta sola) |
| 01 | `01-setup-repo.md` | Monorepo, lint, Docker, CI, esqueleto de back y de app Expo |
| 02 | `02-dominio.md` | Clases de dominio y reglas de negocio con tests unitarios |
| 03 | `03-persistencia.md` | mongodb-memory-server, schemas, plugin Persistible, repos y seeds |
| 04 | `04-back-auth-eventos.md` | Auth, categorías, eventos, búsqueda, subida de archivos, favoritos |
| 05 | `05-back-compras.md` | Compras, máquina de estados, tareas programadas, reseñas |
| 06 | `06-back-chat-notificaciones.md` | Chat (REST + socket.io) y notificaciones in-app con templates |
| 07 | `07-front-base.md` | Theme, contexts, componentes UI, navegación, auth |
| 07b | `07b-front-landing-detalles.md` | Landing con telón, marquesina, contadores y adornos (opcional, se puede correr en cualquier momento después de la 07) |
| 07c | `07c-front-detalles-app.md` | Lleva los detalles de la 07b a Explorar, Mensajes y Mis eventos (opcional, después de la 10) |
| 08 | `08-front-comprador.md` | Explorar, detalle, checkout, mis compras, favoritos, reseñas |
| 09 | `09-front-organizador.md` | Mis eventos, crear y editar evento, compras por evento, reembolsos |
| 10 | `10-front-chat-notificaciones-cierre.md` | Chat, notificaciones, pulido final y datos para el video |

## Chequeo de cobertura
`trazabilidad.md` lista cada caso de uso del enunciado y cada funcionalidad agregada, con la spec que lo implementa, la pantalla de Stitch y cómo verificarlo. Al terminar cada spec, pedile al agente: "Marcá en specs/trazabilidad.md las filas que completa esta spec, con su evidencia".

## Diseños de Stitch (opcional, desde la iteración 07)

Exportá cada pantalla a `design/stitch/<nombre-pantalla>/` con `code.html` + `screen.png`. Las specs de front le indican al agente que los use como referencia visual cuando existan. Los prompts para generarlas están en `stitch-prompts.md`. Nombres esperados: `landing`, `login`, `registro`, `explorar`, `filtros`, `detalle-evento`, `checkout`, `mis-compras`, `detalle-compra`, `chat`, `mensajes`, `calificar`, `favoritos`, `notificaciones`, `mis-eventos`, `crear-evento`, `editar-evento`, `compras-evento`, `perfil`, `componentes`.
