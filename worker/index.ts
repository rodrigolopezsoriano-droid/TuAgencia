// Punto de entrada para publicar como Cloudflare Worker (con archivos estáticos).
// Reutiliza tal cual las funciones de /functions (formato Pages): solo decide a cuál llamar.
// Todo lo que no sea /api/* lo sirve Cloudflare directamente desde dist/ (ver wrangler.jsonc).
import { onRequestGet as disponibilidad } from '../functions/api/disponibilidad.ts';
import { onRequestPost as reservar } from '../functions/api/reservar.ts';
import type { Env } from '../functions/_lib/google.ts';
import { keepalive, type KeepaliveEnv } from '../functions/_lib/keepalive.ts';

interface WorkerEnv extends Env, KeepaliveEnv {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

const respuesta = (status: number, error: string, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify({ error }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // www.tuagencia.tech → tuagencia.tech (301, conservando ruta y parámetros) para que Google vea una sola web.
    // Para que llegue aquí hay que añadir www.tuagencia.tech como dominio personalizado del Worker en Cloudflare.
    if (url.hostname === 'www.tuagencia.tech') {
      const destino = `https://tuagencia.tech${pathname}${url.search}`;
      return Response.redirect(destino, request.method === 'GET' || request.method === 'HEAD' ? 301 : 308);
    }

    const ruta = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

    if (ruta === '/api/disponibilidad') {
      if (request.method !== 'GET') return respuesta(405, 'metodo_no_permitido', { allow: 'GET' });
      return disponibilidad({ env });
    }
    if (ruta === '/api/reservar') {
      if (request.method !== 'POST') return respuesta(405, 'metodo_no_permitido', { allow: 'POST' });
      return reservar({ request, env });
    }
    /* ─── PREPARADO, DESACTIVADO: chat con Cloudflare Workers AI ─────────────────────────
       Ver docs/CHATBOT.md. Para activarlo hay que (1) descomentar "ai" en wrangler.jsonc,
       (2) añadir `AI: { run: (modelo: string, datos: unknown) => Promise<{ response?: string }> }` a WorkerEnv
       y (3) quitar el comentario de este bloque. Hoy NO se usa: el asistente de la web no llama a ningún servicio.

    if (ruta === '/api/chat' && request.method === 'POST') {
      const { pregunta } = (await request.json().catch(() => ({}))) as { pregunta?: string };
      if (typeof pregunta !== 'string' || !pregunta.trim() || pregunta.length > 300) return respuesta(400, 'pregunta_no_valida');
      const r = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: 'Eres el asistente de TuAgencia, una agencia de automatización con IA de Alcalá de Henares. Responde en español, en 2-3 frases, solo con lo que sabes de la agencia y termina ofreciendo reservar una llamada en /reservar. No inventes precios ni plazos.' },
          { role: 'user', content: pregunta.trim() },
        ],
      });
      return new Response(JSON.stringify({ respuesta: r.response ?? '' }), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
    }
    */
    if (ruta.startsWith('/api/')) return respuesta(404, 'no_encontrado');

    return env.ASSETS.fetch(request);
  },

  // Cron Trigger (wrangler.jsonc): ping periódico a Supabase para que no se pause.
  async scheduled(_evento: unknown, env: WorkerEnv, ctx: { waitUntil: (p: Promise<unknown>) => void }): Promise<void> {
    ctx.waitUntil(keepalive(env).then((m) => console.log(m)));
  },
};
