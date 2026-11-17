# Asistente de la web (chat)

**Hoy:** el asistente de la esquina inferior derecha es **gratis y no usa IA ni servicios externos**.
Responde con botones y con una búsqueda por palabras clave sobre las FAQ (`src/data/site.ts`) y las soluciones (`src/data/soluciones.ts`); los precios salen de `src/data/precios.ts`. Siempre termina ofreciendo **reservar una llamada** o **WhatsApp**.

- Código: `src/components/Chatbot.astro` (se carga en todas las páginas en español desde `src/layouts/Base.astro`).
- Para cambiar lo que responde, edita esos archivos de datos: el asistente se actualiza solo en el siguiente despliegue.

## Dejarlo preparado para Cloudflare Workers AI (NO activado)
Workers AI tiene una cuota gratuita diaria. Antes de activarlo, comprueba en el panel de Cloudflare → *AI → Workers AI* cuál es el límite de vuestro plan y qué pasa al superarlo (que **no** os cobren sin avisar). Si hay cualquier posibilidad de coste, no lo activéis.

Pasos (todo está ya escrito y comentado):
1. `wrangler.jsonc`: quitar las `//` de la línea `"ai": { "binding": "AI" }`.
2. `worker/index.ts`: añadir `AI` al tipo `WorkerEnv` y quitar el comentario del bloque `/api/chat`.
3. `src/components/Chatbot.astro`: en `preguntar`, cuando la búsqueda no encuentre nada, llamar a `/api/chat` (el código está en el comentario del final del `<script>`).
4. Probarlo y desplegar.
