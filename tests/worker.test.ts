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
