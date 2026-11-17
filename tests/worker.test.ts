// Comprueba que el Worker enruta /api/* a las funciones de la agenda y el resto a los archivos estáticos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.ts';

const ASSETS = { fetch: async (r: Request) => new Response('estatico:' + new URL(r.url).pathname) };
const llamar = (ruta: string, init?: RequestInit) => worker.fetch(new Request('https://tuagencia.tech' + ruta, init), { ASSETS });

test('lo que no es /api/* lo sirve el almacén de archivos estáticos', async () => {
  const r = await llamar('/reservar');
  assert.equal(await r.text(), 'estatico:/reservar');
});

test('/api/disponibilidad sin credenciales de Google responde con un error controlado, no con el 404 del sitio', async () => {
  const r = await llamar('/api/disponibilidad');
  assert.notEqual(r.status, 404);
  assert.match(r.headers.get('content-type') ?? '', /application\/json/);
});

test('métodos y rutas incorrectas en /api', async () => {
  assert.equal((await llamar('/api/disponibilidad', { method: 'POST' })).status, 405);
  assert.equal((await llamar('/api/reservar')).status, 405);
  assert.equal((await llamar('/api/otra-cosa')).status, 404);
});

test('/api/reservar acepta la barra final y rechaza orígenes ajenos', async () => {
  const r = await llamar('/api/reservar/', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://malo.example' },
    body: '{}',
  });
  assert.ok([400, 403].includes(r.status), 'estado ' + r.status);
});

test('el cron hace GET a la tabla keepalive de Supabase con la clave pública', async () => {
  const real = globalThis.fetch;
  const llamadas: { url: string; h: Record<string, string> }[] = [];
  globalThis.fetch = (async (u: string, init?: RequestInit) => {
    llamadas.push({ url: String(u), h: init?.headers as Record<string, string> });
    return new Response('[]', { status: 200 });
  }) as typeof fetch;
  try {
    const pendientes: Promise<unknown>[] = [];
    await worker.scheduled({}, { ASSETS, SUPABASE_URL: 'https://x.supabase.co/', SUPABASE_ANON_KEY: 'sb_publishable_x' }, { waitUntil: (p) => pendientes.push(p) });
    await Promise.all(pendientes);
    assert.equal(llamadas.length, 1);
    assert.equal(llamadas[0].url, 'https://x.supabase.co/rest/v1/keepalive?select=id');
    assert.equal(llamadas[0].h.apikey, 'sb_publishable_x');
  } finally {
    globalThis.fetch = real;
  }
});

test('el cron falla de forma visible si faltan las variables o Supabase responde error', async () => {
  const real = globalThis.fetch;
  try {
    const p1: Promise<unknown>[] = [];
    await worker.scheduled({}, { ASSETS }, { waitUntil: (p) => p1.push(p) });
    await assert.rejects(Promise.all(p1), /faltan SUPABASE_URL/);
    globalThis.fetch = (async () => new Response('x', { status: 401 })) as typeof fetch;
    const p2: Promise<unknown>[] = [];
    await worker.scheduled({}, { ASSETS, SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'k' }, { waitUntil: (p) => p2.push(p) });
    await assert.rejects(Promise.all(p2), /401/);
  } finally {
    globalThis.fetch = real;
  }
});

test('www.tuagencia.tech redirige con 301 a tuagencia.tech conservando ruta y parámetros', async () => {
  const r = await worker.fetch(new Request('https://www.tuagencia.tech/precios?plan=Esencial&x=1'), { ASSETS });
  assert.equal(r.status, 301);
  assert.equal(r.headers.get('location'), 'https://tuagencia.tech/precios?plan=Esencial&x=1');
  const raiz = await worker.fetch(new Request('https://www.tuagencia.tech/'), { ASSETS });
  assert.equal(raiz.headers.get('location'), 'https://tuagencia.tech/');
  // una petición POST (p. ej. a la API) se redirige sin cambiar de método
  const post = await worker.fetch(new Request('https://www.tuagencia.tech/api/reservar', { method: 'POST', body: '{}' }), { ASSETS });
  assert.equal(post.status, 308);
});

test('tuagencia.tech (sin www) no se redirige', async () => {
  const r = await llamar('/precios');
  assert.equal(r.status, 200);
});
