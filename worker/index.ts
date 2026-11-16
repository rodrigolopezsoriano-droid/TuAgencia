// Punto de entrada para publicar como Cloudflare Worker (con archivos estáticos).
// Reutiliza tal cual las funciones de /functions (formato Pages): solo decide a cuál llamar.
// Todo lo que no sea /api/* lo sirve Cloudflare directamente desde dist/ (ver wrangler.jsonc).
import { onRequestGet as disponibilidad } from '../functions/api/disponibilidad.ts';
import { onRequestPost as reservar } from '../functions/api/reservar.ts';
import type { Env } from '../functions/_lib/google.ts';

interface WorkerEnv extends Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

const respuesta = (status: number, error: string, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify({ error }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const { pathname } = new URL(request.url);
    const ruta = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

    if (ruta === '/api/disponibilidad') {
      if (request.method !== 'GET') return respuesta(405, 'metodo_no_permitido', { allow: 'GET' });
      return disponibilidad({ env });
    }
    if (ruta === '/api/reservar') {
      if (request.method !== 'POST') return respuesta(405, 'metodo_no_permitido', { allow: 'POST' });
      return reservar({ request, env });
    }
    if (ruta.startsWith('/api/')) return respuesta(404, 'no_encontrado');

    return env.ASSETS.fetch(request);
  },
};
