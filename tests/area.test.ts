// Pruebas de las utilidades puras de los paneles del área de cliente. Ejecutar con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, hace, telWhatsapp, ultimosMeses, mesDe, urlSegura, clase } from '../src/scripts/area/util.ts';

test('esc evita inyectar HTML', () => {
  assert.equal(esc('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(esc(null), '');
});

test('telWhatsapp normaliza teléfonos españoles e internacionales', () => {
  assert.equal(telWhatsapp('644 10 26 66'), '34644102666');
  assert.equal(telWhatsapp('+34 644-102-666'), '34644102666');
  assert.equal(telWhatsapp('0034644102666'), '34644102666');
  assert.equal(telWhatsapp(''), '');
  assert.equal(telWhatsapp(null), '');
});

test('hace() describe el tiempo transcurrido', () => {
  const ahora = Date.parse('2026-11-17T12:00:00Z');
  assert.equal(hace('2026-11-17T11:59:40Z', ahora), 'ahora mismo');
  assert.equal(hace('2026-11-17T11:30:00Z', ahora), 'hace 30 min');
  assert.equal(hace('2026-11-17T09:00:00Z', ahora), 'hace 3 h');
  assert.equal(hace('2026-11-16T12:00:00Z', ahora), 'hace 1 día');
  assert.equal(hace('2026-11-12T12:00:00Z', ahora), 'hace 5 días');
});

test('ultimosMeses devuelve n meses terminando en el actual, también al cruzar de año', () => {
  assert.deepEqual(ultimosMeses(3, new Date('2026-01-15T12:00:00Z')), ['2025-11', '2025-12', '2026-01']);
  assert.equal(ultimosMeses(6, new Date('2026-11-17T12:00:00Z')).at(-1), '2026-11');
  assert.equal(mesDe('2026-11-03'), '2026-11');
});

test('urlSegura solo deja pasar http(s) y clase() normaliza estados', () => {
  assert.equal(urlSegura('https://x.es/a.pdf'), 'https://x.es/a.pdf');
  assert.equal(urlSegura('javascript:alert(1)'), '#');
  assert.equal(clase('en curso'), 'en-curso');
});
