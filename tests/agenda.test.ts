// Pruebas de la agenda propia. Ejecutar con: npm test
// No se conecta a Google: se simula con un `fetch` falso y se comprueba qué se le pediría.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { zonedAUtc, generarHuecos, huecosEnRango, fechaValida, fechaLocal } from '../functions/_lib/agenda.ts';
import { limpiarCache } from '../functions/_lib/google.ts';
import { onRequestGet } from '../functions/api/disponibilidad.ts';
import { onRequestPost } from '../functions/api/reservar.ts';

const ENV = { GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secreto', GOOGLE_REFRESH_TOKEN: 'refresco' };
const AHORA = Date.parse('2026-11-16T08:00:00Z'); // lunes 16 nov 2026, 09:00 en Madrid
const LUNES = '2026-11-23';

// ── zonas horarias y cambios de hora ──────────────────────────
test('zonedAUtc respeta invierno, verano y los dos cambios de hora', () => {
  const iso = (f: string, h: string) => new Date(zonedAUtc(f, h)).toISOString();
  assert.equal(iso('2026-01-15', '10:00'), '2026-01-15T09:00:00.000Z'); // invierno UTC+1
  assert.equal(iso('2026-07-01', '10:00'), '2026-07-01T08:00:00.000Z'); // verano UTC+2
  assert.equal(iso('2026-03-29', '10:00'), '2026-03-29T08:00:00.000Z'); // día que empieza el verano
  assert.equal(iso('2026-10-25', '10:00'), '2026-10-25T09:00:00.000Z'); // día que acaba el verano
});

test('fechaLocal y fechaValida', () => {
  assert.equal(fechaLocal(Date.parse('2026-11-16T23:30:00Z')), '2026-11-17'); // ya es martes en Madrid
  assert.equal(fechaValida('2026-02-30'), false);
  assert.equal(fechaValida('2026-11-23'), true);
  assert.equal(fechaValida('23/11/2026'), false);
});

// ── huecos ────────────────────────────────────────────────────
test('un lunes normal ofrece 22 huecos de 30 min (9:00-20:00)', () => {
  const h = generarHuecos(LUNES, [], AHORA);
  assert.equal(h.length, 22);
  assert.equal(h[0].hora, '09:00');
  assert.equal(h[21].hora, '19:30');
  assert.equal(h[0].inicio, '2026-11-23T08:00:00.000Z');
});

test('el sábado hay huecos de 9:00 a 15:00 y el domingo no', () => {
  const sab = generarHuecos('2026-11-28', [], AHORA);
  assert.equal(sab.length, 12);
  assert.equal(sab[0].hora, '09:00');
  assert.equal(sab[11].hora, '14:30');
  assert.deepEqual(generarHuecos('2026-11-22', [], AHORA), []); // domingo
});

test('un evento del calendario tapa los huecos que toca (aunque solo roce)', () => {
  const ocup = [{ inicio: zonedAUtc(LUNES, '11:00'), fin: zonedAUtc(LUNES, '12:00') }];
  const horas = generarHuecos(LUNES, ocup, AHORA).map((x) => x.hora);
  assert.ok(!horas.includes('11:00') && !horas.includes('11:30'));
  assert.ok(horas.includes('10:30') && horas.includes('12:00'));
  const roce = [{ inicio: zonedAUtc(LUNES, '10:15'), fin: zonedAUtc(LUNES, '10:45') }];
  const h2 = generarHuecos(LUNES, roce, AHORA).map((x) => x.hora);
  assert.ok(!h2.includes('10:00') && !h2.includes('10:30') && h2.includes('11:00'));
});

test('respeta la antelación mínima de 12 h', () => {
  // lunes 09:00 en Madrid: hasta las 21:00 no se ofrece nada del propio lunes
  assert.deepEqual(generarHuecos('2026-11-16', [], AHORA), []);
  assert.ok(generarHuecos('2026-11-17', [], AHORA).length > 0);
});

test('huecosEnRango solo devuelve días con huecos y no pasa de 30 días', () => {
  const r = huecosEnRango('2026-11-16', 31, [], AHORA);
  assert.ok(!('2026-11-22' in r) && '2026-11-28' in r); // domingo no, sábado sí
  assert.ok('2026-11-17' in r);
  assert.ok(Object.keys(r).every((f) => f <= '2026-12-17'));
});

// ── endpoints con Google simulado ─────────────────────────────
type Llamada = { url: string; body: any };
let llamadas: Llamada[] = [];
let ocupadoSimulado: { start: string; end: string }[] = [];
const fetchReal = globalThis.fetch;

beforeEach(() => {
  limpiarCache();
  llamadas = [];
  ocupadoSimulado = [];
  globalThis.fetch = (async (url: any, init?: any) => {
    const u = String(url);
    const body = init?.body instanceof URLSearchParams ? Object.fromEntries(init.body) : init?.body ? JSON.parse(init.body) : null;
    llamadas.push({ url: u, body });
    const ok = (o: unknown) => new Response(JSON.stringify(o), { status: 200, headers: { 'content-type': 'application/json' } });
    if (u.startsWith('https://oauth2.googleapis.com/token')) return ok({ access_token: 'tok', expires_in: 3600 });
    if (u.endsWith('/freeBusy')) return ok({ calendars: { primary: { busy: ocupadoSimulado } } });
    if (u.includes('/events?')) return ok({ hangoutLink: 'https://meet.google.com/abc-defg-hij', htmlLink: 'https://calendar.google.com/evento' });
    if (u.startsWith('https://challenges.cloudflare.com')) return ok({ success: body?.response === 'bueno' });
    throw new Error('fetch inesperado: ' + u);
  }) as typeof fetch;
});
const peticion = (cuerpo: unknown, cabeceras: Record<string, string> = {}) =>
  new Request('https://tuagencia.tech/api/reservar', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://tuagencia.tech', ...cabeceras },
    body: JSON.stringify(cuerpo),
  });
const reservaOk = { inicio: '2026-11-23T09:00:00.000Z', nombre: 'Lucía Pérez', email: 'Lucia@Correo.es', telefono: '600111222', mensaje: 'Quiero automatizar citas', consentimiento: true, web: '' };
const eventosCreados = () => llamadas.filter((l) => l.url.includes('/events?'));

test('GET disponibilidad devuelve días con huecos', async () => {
  const r = await onRequestGet({ env: ENV, now: AHORA });
  assert.equal(r.status, 200);
  const j: any = await r.json();
  assert.equal(j.duracionMin, 30);
  assert.ok(j.dias['2026-11-17'].length > 0);
  assert.ok(!('2026-11-22' in j.dias));
});

test('GET disponibilidad sin credenciales da 503 y no llama a Google', async () => {
  const r = await onRequestGet({ env: {}, now: AHORA });
  assert.equal(r.status, 503);
  assert.equal(llamadas.length, 0);
});

test('POST reservar crea el evento con Google Meet e invita al cliente', async () => {
  const r = await onRequestPost({ request: peticion(reservaOk), env: ENV, now: AHORA });
  assert.equal(r.status, 200);
  const j: any = await r.json();
  assert.equal(j.ok, true);
  assert.equal(j.enlaceMeet, 'https://meet.google.com/abc-defg-hij');
  const ev = eventosCreados();
  assert.equal(ev.length, 1);
  assert.match(ev[0].url, /conferenceDataVersion=1/);
  assert.match(ev[0].url, /sendUpdates=all/);
  assert.equal(ev[0].body.conferenceData.createRequest.conferenceSolutionKey.type, 'hangoutsMeet');
  assert.equal(ev[0].body.attendees[0].email, 'lucia@correo.es');
  assert.equal(ev[0].body.start.dateTime, '2026-11-23T09:00:00.000Z');
  assert.equal(ev[0].body.end.dateTime, '2026-11-23T09:30:00.000Z');
  assert.equal(ev[0].body.start.timeZone, 'Europe/Madrid');
});

test('POST reservar rechaza un hueco ya ocupado en el calendario', async () => {
  ocupadoSimulado = [{ start: '2026-11-23T08:30:00Z', end: '2026-11-23T09:30:00Z' }];
  const r = await onRequestPost({ request: peticion(reservaOk), env: ENV, now: AHORA });
  assert.equal(r.status, 409);
  assert.equal(eventosCreados().length, 0);
});

test('POST reservar rechaza horas fuera de horario, pasadas o inventadas', async () => {
  for (const inicio of ['2026-11-23T03:00:00.000Z', '2026-11-22T09:00:00.000Z', '2026-11-23T09:07:00.000Z', '2026-11-16T09:00:00.000Z', 'no-es-fecha']) {
    const r = await onRequestPost({ request: peticion({ ...reservaOk, inicio }), env: ENV, now: AHORA });
    assert.ok([400, 409].includes(r.status), `${inicio} → ${r.status}`);
  }
  assert.equal(eventosCreados().length, 0);
});

test('POST reservar valida datos y consentimiento', async () => {
  const malos = [{ nombre: 'A' }, { email: 'sin-arroba' }, { email: 'a@b' }, { consentimiento: false }, { consentimiento: 'true' }];
  for (const m of malos) {
    const r = await onRequestPost({ request: peticion({ ...reservaOk, ...m }), env: ENV, now: AHORA });
    assert.equal(r.status, 400, JSON.stringify(m));
  }
  assert.equal(eventosCreados().length, 0);
});

test('POST reservar bloquea otros orígenes y formatos', async () => {
  const otro = await onRequestPost({ request: peticion(reservaOk, { origin: 'https://malo.example' }), env: ENV, now: AHORA });
  assert.equal(otro.status, 403);
  const form = new Request('https://tuagencia.tech/api/reservar', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'a=b' });
  assert.equal((await onRequestPost({ request: form, env: ENV, now: AHORA })).status, 415);
  assert.equal(eventosCreados().length, 0);
});

test('la trampa anti-bots finge éxito pero no crea nada', async () => {
  const r = await onRequestPost({ request: peticion({ ...reservaOk, web: 'http://spam' }), env: ENV, now: AHORA });
  assert.equal(r.status, 200);
  assert.equal(llamadas.length, 0);
});

test('los saltos de línea del nombre no pueden colar cabeceras ni líneas', async () => {
  await onRequestPost({ request: peticion({ ...reservaOk, nombre: 'Ana\r\nBcc: x@y.es' }), env: ENV, now: AHORA });
  const ev = eventosCreados()[0];
  assert.ok(!/[\r\n]/.test(ev.body.summary));
  assert.ok(!/[\r\n]/.test(ev.body.attendees[0].displayName));
});

test('con Turnstile activo exige un captcha válido', async () => {
  const env = { ...ENV, TURNSTILE_SECRET: 's' };
  const sin = await onRequestPost({ request: peticion(reservaOk), env, now: AHORA });
  assert.equal(sin.status, 400);
  const malo = await onRequestPost({ request: peticion({ ...reservaOk, captcha: 'malo' }), env, now: AHORA });
  assert.equal(malo.status, 400);
  const bueno = await onRequestPost({ request: peticion({ ...reservaOk, captcha: 'bueno' }), env, now: AHORA });
  assert.equal(bueno.status, 200);
  assert.equal(eventosCreados().length, 1);
});

test('si Google falla, el cliente recibe un error genérico (sin detalles internos)', async () => {
  globalThis.fetch = (async () => new Response('secreto interno', { status: 500 })) as typeof fetch;
  const r = await onRequestPost({ request: peticion(reservaOk), env: ENV, now: AHORA });
  assert.equal(r.status, 502);
  const t = await r.text();
  assert.ok(!t.includes('secreto'));
  globalThis.fetch = fetchReal;
});
