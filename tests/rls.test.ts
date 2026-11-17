// Pruebas de seguridad de la base de datos (supabase/schema.sql).
// Arranca un PostgreSQL real en memoria (PGlite), simula Supabase (roles anon/authenticated y auth.uid())
// y comprueba que cada persona solo puede hacer lo que debe. Ejecutar con: npm test
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const SCHEMA = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
let db: PGlite;

type U = { id: string; email: string } | null; // null = visitante anónimo
const ids = {
  alice: '00000000-0000-0000-0000-00000000000a',
  bob: '00000000-0000-0000-0000-00000000000b',
  pablo: '00000000-0000-0000-0000-0000000000c1',
  admin: '00000000-0000-0000-0000-0000000000c2',
  falso: '00000000-0000-0000-0000-0000000000f1',
};
const alice = { id: ids.alice, email: 'alice@x.com' };
const bob = { id: ids.bob, email: 'bob@x.com' };
const pablo = { id: ids.pablo, email: 'pablo@tuagencia.tech' };
const admin = { id: ids.admin, email: 'admin@tuagencia.tech' };

/** Ejecuta `fn` como si fuera esa persona (RLS incluido). */
async function como<T>(u: U, fn: () => Promise<T>): Promise<T> {
  const claims = u ? JSON.stringify({ sub: u.id, email: u.email, role: 'authenticated' }) : '';
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [claims]);
  await db.exec(u ? 'set role authenticated' : 'set role anon');
  try { return await fn(); } finally { await db.exec('reset role'); }
}
const q = async (sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows as any[];
const denegado = /permission denied|row-level security|violates/i;

before(async () => {
  db = new PGlite();
  // Simulación mínima de Supabase
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
    grant usage on schema public, auth to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on sequences to anon, authenticated;
  `);
  await db.exec(SCHEMA);
  await db.exec(SCHEMA); // se puede ejecutar dos veces sin romper nada
  await db.exec(`
    insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
      ('${ids.alice}', 'Alice@X.com', now(), '{"nombre":"Alice","negocio":"Peluquería A","telefono":"600111222","rol":"admin"}'),
      ('${ids.bob}',   'bob@x.com',   now(), '{"nombre":"Bob","negocio":"Clínica B"}'),
      ('${ids.pablo}', 'pablo@tuagencia.tech', now(), '{"nombre":"Pablo"}'),
      ('${ids.falso}', 'admin@tuagencia.tech', null, '{"nombre":"Impostor"}');
  `);
  // Datos que normalmente metería el equipo
  await db.exec(`
    insert into public.automatizaciones (cliente_id, nombre) select id, 'Chatbot de ' || negocio from public.clientes;
    insert into public.informes (cliente_id, titulo, url) select id, 'Informe de ' || negocio, 'https://x' from public.clientes;
    insert into public.tickets (user_id, mensaje) values ('${ids.alice}', 'ticket de alice'), ('${ids.bob}', 'ticket de bob');
    insert into public.leads (nombre, email, mensaje) values ('Lead suelto', 'lead@x.com', 'hola');
  `);
});

test('el esquema se ejecuta dos veces seguidas sin errores y crea los datos de partida', async () => {
  assert.equal((await q('select count(*)::int n from public.staff'))[0].n, 4);
});

test('al registrarse se crea el perfil y la ficha de cliente; el equipo no tiene ficha de cliente', async () => {
  const p = (await q(`select * from public.perfiles where user_id = $1`, [ids.alice]))[0];
  assert.equal(p.nombre, 'Alice'); assert.equal(p.negocio, 'Peluquería A'); assert.equal(p.email, 'alice@x.com');
  assert.equal((await q(`select negocio from public.clientes where user_id = $1`, [ids.alice]))[0].negocio, 'Peluquería A');
  assert.equal((await q(`select count(*)::int n from public.clientes where user_id = $1`, [ids.pablo]))[0].n, 0);
  assert.equal((await q(`select count(*)::int n from public.perfiles where user_id = $1`, [ids.pablo]))[0].n, 1);
});

test('poner "rol: admin" al registrarse NO da permisos', async () => {
  await como(alice, async () => {
    assert.equal((await q('select public.es_staff() v'))[0].v, false);
    assert.equal((await q('select public.es_admin() v'))[0].v, false);
  });
});

test('un impostor con email de admin SIN verificar no obtiene permisos', async () => {
  await como({ id: ids.falso, email: 'admin@tuagencia.tech' }, async () => {
    assert.equal((await q('select public.es_admin() v'))[0].v, false);
    assert.equal((await q('select count(*)::int n from public.perfiles'))[0].n, 1); // solo el suyo
    assert.equal((await q('select count(*)::int n from public.tickets'))[0].n, 0);
  });
  // cuando verifica el email (el verdadero dueño del buzón), ya es admin
  await db.query(`update auth.users set email_confirmed_at = now() where id = $1`, [ids.falso]);
  await como({ id: ids.falso, email: 'admin@tuagencia.tech' }, async () => {
    assert.equal((await q('select public.es_admin() v'))[0].v, true);
  });
  await db.query(`update auth.users set email_confirmed_at = null where id = $1`, [ids.falso]);
});

test('visitante anónimo: puede enviar el formulario, pero no leer nada', async () => {
  await como(null, async () => {
    await q(`insert into public.leads (nombre, email, mensaje) values ('Visita', 'v@x.com', 'quiero info')`);
    await assert.rejects(q('select * from public.leads'), denegado);
    await assert.rejects(q('select * from public.clientes'), denegado);
    await assert.rejects(q('select * from public.perfiles'), denegado);
    await assert.rejects(q('select * from public.tickets'), denegado);
    await assert.rejects(q('select * from public.staff'), denegado);
    await assert.rejects(q('select public.es_staff()'), denegado);
    assert.equal((await q('select count(*)::int n from public.keepalive'))[0].n, 1);
  });
});

test('visitante anónimo: no puede colar estado, notas ni atribuirse a otra cuenta', async () => {
  await como(null, async () => {
    await assert.rejects(q(`insert into public.leads (nombre, email, estado) values ('X','x@x.com','cliente')`), denegado);
    await assert.rejects(q(`insert into public.leads (nombre, email, notas) values ('X','x@x.com','nota')`), denegado);
    await assert.rejects(q(`insert into public.leads (nombre, email, user_id) values ('X','x@x.com', $1)`, [ids.bob]), denegado);
    await assert.rejects(q(`insert into public.leads (nombre, email) values ('X','no-es-email')`), denegado);
  });
});

test('cliente: solo ve y toca SUS datos', async () => {
  await como(alice, async () => {
    assert.equal((await q('select count(*)::int n from public.perfiles'))[0].n, 1);
    assert.equal((await q('select count(*)::int n from public.clientes'))[0].n, 1);
    assert.equal((await q('select count(*)::int n from public.automatizaciones'))[0].n, 1);
    assert.equal((await q('select count(*)::int n from public.informes'))[0].n, 1);
    assert.deepEqual((await q('select mensaje from public.tickets')).map((r) => r.mensaje), ['ticket de alice']);
    assert.equal((await q('select count(*)::int n from public.leads'))[0].n, 0); // el lead suelto no es suyo
    await assert.rejects(q('select * from public.staff'), denegado);
    // no puede crear ni cambiar fichas, automatizaciones, métricas ni informes
    await assert.rejects(q(`insert into public.clientes (negocio) values ('Falsa')`), denegado);
    await assert.rejects(q(`insert into public.automatizaciones (cliente_id, nombre) values ((select id from public.clientes limit 1), 'x')`), denegado);
    await assert.rejects(q(`insert into public.metricas (cliente_id, valor) values ((select id from public.clientes limit 1), 99)`), denegado);
    await assert.rejects(q(`insert into public.informes (cliente_id, titulo, url) values ((select id from public.clientes limit 1), 'x', 'y')`), denegado);
    assert.equal((await db.query(`update public.clientes set plan = 'IA a medida', coste_hora = 0`)).affectedRows, 0);
  });
});

test('cliente: puede editar su perfil, pero no su email ni el de otros', async () => {
  await como(alice, async () => {
    await q(`update public.perfiles set nombre = 'Alicia', telefono = '699' where user_id = $1`, [ids.alice]);
    await assert.rejects(q(`update public.perfiles set email = 'otro@x.com' where user_id = $1`, [ids.alice]), denegado);
    assert.equal((await db.query(`update public.perfiles set nombre = 'Hackeado' where user_id = $1`, [ids.bob])).affectedRows, 0);
  });
  // el cambio de perfil se refleja en su ficha de cliente
  assert.equal((await q(`select contacto from public.clientes where user_id = $1`, [ids.alice]))[0].contacto, 'Alicia');
  assert.equal((await q(`select nombre from public.perfiles where user_id = $1`, [ids.bob]))[0].nombre, 'Bob');
});

test('cliente: crea solicitudes (siempre abiertas, sin respuesta, a su nombre) y no puede tocar las de otros', async () => {
  await como(alice, async () => {
    await q(`insert into public.tickets (user_id, mensaje, tipo, titulo) values ($1, 'Quiero un chatbot', 'nueva automatización', 'Chatbot')`, [ids.alice]);
    await assert.rejects(q(`insert into public.tickets (user_id, mensaje) values ($1, 'suplantando')`, [ids.bob]), denegado);
    await assert.rejects(q(`insert into public.tickets (user_id, mensaje, estado) values ($1, 'x', 'cerrado')`, [ids.alice]), denegado);
    await assert.rejects(q(`insert into public.tickets (user_id, mensaje, respuesta) values ($1, 'x', 'ya respondido')`, [ids.alice]), denegado);
    await assert.rejects(q(`insert into public.tickets (user_id, mensaje, tipo) values ($1, 'x', 'inventado')`, [ids.alice]), denegado);
    // no puede cerrar ni responder (ni siquiera las suyas)
    assert.equal((await db.query(`update public.tickets set estado = 'cerrado', respuesta = 'hecho'`)).affectedRows, 0);
    assert.equal((await q('select count(*)::int n from public.tickets'))[0].n, 2);
  });
});

test('cliente con sesión: su formulario de contacto queda ligado a su cuenta y no a la de otro', async () => {
  await como(alice, async () => {
    await q(`insert into public.leads (nombre, email, mensaje) values ('Alicia', 'alice@x.com', 'hola')`);
    await assert.rejects(q(`insert into public.leads (nombre, email, user_id) values ('X','x@x.com', $1)`, [ids.bob]), denegado);
    const mis = await q('select user_id from public.leads');
    assert.equal(mis.length, 1); assert.equal(mis[0].user_id, ids.alice);
  });
  await como(bob, async () => assert.equal((await q('select count(*)::int n from public.leads'))[0].n, 0));
});

test('equipo: ve todo y gestiona solicitudes, contactos y datos de clientes, pero no altas ni planes', async () => {
  await como(pablo, async () => {
    assert.equal((await q('select public.es_staff() v'))[0].v, true);
    assert.equal((await q('select public.es_admin() v'))[0].v, false);
    assert.ok((await q('select count(*)::int n from public.perfiles'))[0].n >= 3);
    assert.ok((await q('select count(*)::int n from public.tickets'))[0].n >= 3);
    assert.ok((await q('select count(*)::int n from public.leads'))[0].n >= 2);
    await q(`update public.tickets set estado = 'en curso', respuesta = 'Lo vemos hoy' where mensaje = 'ticket de bob'`);
    await q(`update public.leads set estado = 'contactado', notas = 'llamar el lunes' where nombre = 'Lead suelto'`);
    await q(`insert into public.automatizaciones (cliente_id, nombre) select id, 'Nueva' from public.clientes where negocio = 'Clínica B'`);
    await q(`insert into public.metricas (cliente_id, etiqueta, valor, horas_ahorradas) select id, 'Citas', 5, 1.5 from public.clientes where negocio = 'Clínica B'`);
    await q(`insert into public.informes (cliente_id, titulo, url) select id, 'Informe nuevo', 'https://i' from public.clientes where negocio = 'Clínica B'`);
    await assert.rejects(q(`insert into public.clientes (negocio) values ('Alta por el equipo')`), denegado);
    assert.equal((await db.query(`update public.clientes set plan = 'Esencial'`)).affectedRows, 0);
    await assert.rejects(q('select * from public.staff'), denegado);
  });
  // el cliente ve la respuesta y lo que el equipo ha preparado para él
  await como(bob, async () => {
    const t = (await q(`select estado, respuesta from public.tickets`))[0];
    assert.equal(t.estado, 'en curso'); assert.equal(t.respuesta, 'Lo vemos hoy');
    assert.equal((await q('select count(*)::int n from public.metricas'))[0].n, 1);
    assert.equal((await q('select count(*)::int n from public.automatizaciones'))[0].n, 2);
  });
});

test('admin: además da de alta y edita clientes y planes', async () => {
  await db.query(`insert into auth.users (id, email, email_confirmed_at) values ($1, 'admin2@x.com', now())`, [ids.admin]);
  await db.query(`insert into public.staff (email, nombre, rol) values ('admin2@x.com', 'Admin de prueba', 'admin')`);
  await como({ id: ids.admin, email: 'admin2@x.com' }, async () => {
    assert.equal((await q('select public.es_admin() v'))[0].v, true);
    assert.equal((await db.query(`update public.clientes set plan = 'Crecimiento' where negocio = 'Clínica B'`)).affectedRows, 1);
    await q(`insert into public.clientes (negocio, contacto) values ('Alta manual', 'Cliente sin cuenta aún')`);
  });
  await como(bob, async () => assert.equal((await q('select plan from public.clientes'))[0].plan, 'Crecimiento'));
  await db.query(`delete from public.staff where email = 'admin2@x.com'`);
});

test('borrar una cuenta elimina su perfil y sus solicitudes (derecho de supresión)', async () => {
  await db.query(`delete from auth.users where id = $1`, [ids.bob]);
  assert.equal((await q(`select count(*)::int n from public.perfiles where user_id = $1`, [ids.bob]))[0].n, 0);
  assert.equal((await q(`select count(*)::int n from public.tickets where user_id = $1`, [ids.bob]))[0].n, 0);
});
